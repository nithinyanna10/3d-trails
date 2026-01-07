from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List, Literal, Optional
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.neighbors import NearestNeighbors
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import warnings

warnings.filterwarnings("ignore")

# Try to import UMAP, fallback to PCA
try:
    import umap
    HAS_UMAP = True
except ImportError:
    HAS_UMAP = False

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Load models (lazy loading)
model = None
sentiment_analyzer = None

def get_model():
    global model
    if model is None:
        model = SentenceTransformer('all-MiniLM-L6-v2')
    return model

def get_sentiment_analyzer():
    global sentiment_analyzer
    if sentiment_analyzer is None:
        sentiment_analyzer = SentimentIntensityAnalyzer()
    return sentiment_analyzer

class EmbedRequest(BaseModel):
    text: str
    mode: Literal["prefix", "token"] = "prefix"

class Point(BaseModel):
    x: float
    y: float
    z: float
    text_fragment: str
    sentiment: float
    cluster: int

class Anchor(BaseModel):
    x: float
    y: float
    z: float
    label: str
    cluster: int

class EmbedResponse(BaseModel):
    points: List[Point]
    anchors: List[Anchor]
    meta: dict

def tokenize_text(text: str) -> List[str]:
    """Simple whitespace tokenization"""
    tokens = text.split()
    return tokens

def get_prefixes(text: str) -> List[str]:
    """Generate cumulative prefixes"""
    tokens = tokenize_text(text)
    prefixes = []
    for i in range(1, len(tokens) + 1):
        prefixes.append(" ".join(tokens[:i]))
    return prefixes

def compute_sentiment(text: str) -> float:
    """Compute sentiment score in [-1, 1]"""
    analyzer = get_sentiment_analyzer()
    scores = analyzer.polarity_scores(text)
    # Compound score is already in [-1, 1]
    return scores['compound']

def normalize_3d(coords: np.ndarray, target_range: tuple = (-5, 5)) -> np.ndarray:
    """Normalize 3D coordinates to target range"""
    if coords.shape[0] == 0:
        return coords
    
    # Subtract mean
    coords = coords - coords.mean(axis=0)
    
    # Scale by std (avoid division by zero)
    std = coords.std(axis=0)
    std = np.where(std < 1e-6, 1.0, std)
    coords = coords / std
    
    # Scale to target range
    coords_min = coords.min(axis=0)
    coords_max = coords.max(axis=0)
    ranges = coords_max - coords_min
    ranges = np.where(ranges < 1e-6, 1.0, ranges)
    
    coords = (coords - coords_min) / ranges
    coords = coords * (target_range[1] - target_range[0]) + target_range[0]
    
    return coords

def reduce_to_3d(embeddings: np.ndarray) -> np.ndarray:
    """Reduce embeddings to 3D using UMAP or PCA"""
    if embeddings.shape[0] < 2:
        # Too few points, return zeros
        return np.zeros((embeddings.shape[0], 3))
    
    if HAS_UMAP and embeddings.shape[0] >= 4:
        try:
            reducer = umap.UMAP(n_components=3, random_state=42, n_neighbors=min(3, embeddings.shape[0] - 1))
            coords_3d = reducer.fit_transform(embeddings)
        except:
            # Fallback to PCA
            reducer = PCA(n_components=min(3, embeddings.shape[1]))
            coords_3d = reducer.fit_transform(embeddings)
    else:
        # Use PCA
        reducer = PCA(n_components=min(3, embeddings.shape[1]))
        coords_3d = reducer.fit_transform(embeddings)
    
    return coords_3d

def compute_clusters(embeddings: np.ndarray, n_points: int) -> np.ndarray:
    """Compute cluster labels using KMeans"""
    if n_points < 2:
        return np.zeros(n_points, dtype=int)
    
    k = max(2, min(6, n_points // 4))
    if k > n_points:
        k = n_points
    
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = kmeans.fit_predict(embeddings)
    return labels

def compute_anchors(embeddings: np.ndarray, coords_3d: np.ndarray, labels: np.ndarray, fragments: List[str]) -> List[Anchor]:
    """Compute anchor points (cluster centroids)"""
    unique_labels = np.unique(labels)
    anchors = []
    
    for label in unique_labels:
        mask = labels == label
        cluster_embeddings = embeddings[mask]
        cluster_coords = coords_3d[mask]
        
        # Use centroid in 3D space
        centroid_3d = cluster_coords.mean(axis=0)
        
        # Find representative fragment (closest to centroid in embedding space)
        centroid_embedding = cluster_embeddings.mean(axis=0)
        distances = np.linalg.norm(cluster_embeddings - centroid_embedding, axis=1)
        rep_idx = np.argmin(distances)
        rep_fragment = [fragments[i] for i in range(len(fragments)) if mask[i]][rep_idx]
        
        anchors.append(Anchor(
            x=float(centroid_3d[0]),
            y=float(centroid_3d[1]),
            z=float(centroid_3d[2]),
            label=rep_fragment[:30] + "..." if len(rep_fragment) > 30 else rep_fragment,
            cluster=int(label)
        ))
    
    return anchors

@app.post("/embed", response_model=EmbedResponse)
async def embed_text(request: EmbedRequest):
    """Main endpoint: compute embeddings, reduce to 3D, cluster, and return points"""
    
    text = request.text.strip()
    if not text:
        return EmbedResponse(
            points=[],
            anchors=[],
            meta={"n_points": 0, "n_clusters": 0}
        )
    
    # Get fragments based on mode
    if request.mode == "prefix":
        fragments = get_prefixes(text)
    else:
        fragments = tokenize_text(text)
    
    if not fragments:
        return EmbedResponse(
            points=[],
            anchors=[],
            meta={"n_points": 0, "n_clusters": 0}
        )
    
    # Compute embeddings
    model = get_model()
    embeddings = model.encode(fragments, show_progress_bar=False)
    embeddings = np.array(embeddings)
    
    # Reduce to 3D
    coords_3d = reduce_to_3d(embeddings)
    coords_3d = normalize_3d(coords_3d)
    
    # Compute sentiment for each fragment
    sentiments = [compute_sentiment(frag) for frag in fragments]
    
    # Compute clusters
    cluster_labels = compute_clusters(embeddings, len(fragments))
    
    # Create points
    points = []
    for i, (frag, sent, cluster) in enumerate(zip(fragments, sentiments, cluster_labels)):
        points.append(Point(
            x=float(coords_3d[i, 0]),
            y=float(coords_3d[i, 1]),
            z=float(coords_3d[i, 2]),
            text_fragment=frag,
            sentiment=sent,
            cluster=int(cluster)
        ))
    
    # Compute anchors
    anchors = compute_anchors(embeddings, coords_3d, cluster_labels, fragments)
    
    # Metadata
    n_clusters = len(np.unique(cluster_labels))
    
    return EmbedResponse(
        points=points,
        anchors=anchors,
        meta={
            "n_points": len(points),
            "n_clusters": n_clusters
        }
    )

@app.options("/embed")
async def options_embed():
    """Handle CORS preflight for /embed endpoint"""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.get("/health")
async def health():
    return {"status": "ok"}

