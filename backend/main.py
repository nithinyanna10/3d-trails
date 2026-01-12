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
    """Reduce embeddings to 3D using UMAP or PCA with deterministic seed"""
    n_samples, n_features = embeddings.shape
    
    if n_samples < 2:
        # Too few points, return zeros
        return np.zeros((n_samples, 3))
    
    # Determine max components we can reduce to
    max_components = min(n_samples, n_features, 3)
    
    if HAS_UMAP and n_samples >= 4:
        try:
            # Deterministic layout: fixed random_state for stability
            reducer = umap.UMAP(
                n_components=3, 
                random_state=42, 
                n_neighbors=min(3, n_samples - 1),
                min_dist=0.1,  # Better separation
                spread=1.0     # Better global structure
            )
            coords_3d = reducer.fit_transform(embeddings)
        except Exception as e:
            # Fallback to PCA with deterministic seed
            reducer = PCA(n_components=max_components, random_state=42)
            coords_reduced = reducer.fit_transform(embeddings)
            # Pad to 3D if needed
            if coords_reduced.shape[1] < 3:
                padding = np.zeros((coords_reduced.shape[0], 3 - coords_reduced.shape[1]))
                coords_3d = np.hstack([coords_reduced, padding])
            else:
                coords_3d = coords_reduced
    else:
        # Use PCA with deterministic seed
        reducer = PCA(n_components=max_components, random_state=42)
        coords_reduced = reducer.fit_transform(embeddings)
        # Pad to 3D if needed
        if coords_reduced.shape[1] < 3:
            padding = np.zeros((coords_reduced.shape[0], 3 - coords_reduced.shape[1]))
            coords_3d = np.hstack([coords_reduced, padding])
        else:
            coords_3d = coords_reduced
    
    return coords_3d

def apply_temporal_smoothing(coords: np.ndarray, alpha: float = 0.7, beta: float = 0.2, gamma: float = 0.1) -> np.ndarray:
    """Apply temporal smoothing to 3D coordinates for smoother trails"""
    if coords.shape[0] < 3:
        return coords
    smoothed_coords = np.copy(coords)
    for i in range(2, coords.shape[0]):
        smoothed_coords[i] = alpha * coords[i] + beta * coords[i-1] + gamma * coords[i-2]
    return smoothed_coords

def compute_clusters(embeddings: np.ndarray, n_points: int) -> np.ndarray:
    """Compute cluster labels using KMeans on original embeddings (best practice)"""
    if n_points < 2:
        return np.zeros(n_points, dtype=int)
    
    k = max(2, min(6, n_points // 4))
    if k > n_points:
        k = n_points
    
    # Cluster on original embeddings (not 3D) for better semantic grouping
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = kmeans.fit_predict(embeddings)
    return labels

def compute_anchors(embeddings: np.ndarray, coords_3d: np.ndarray, labels: np.ndarray, fragments: List[str]) -> List[Anchor]:
    """Compute anchor points using medoids (real points) instead of centroids"""
    unique_labels = np.unique(labels)
    anchors = []
    
    for label in unique_labels:
        mask = labels == label
        cluster_embeddings = embeddings[mask]
        cluster_coords = coords_3d[mask]
        cluster_fragments = [fragments[i] for i in range(len(fragments)) if mask[i]]
        
        # Use medoid (real point) instead of centroid for better semantic grounding
        # Find point closest to cluster center in embedding space
        centroid_embedding = cluster_embeddings.mean(axis=0)
        distances = np.linalg.norm(cluster_embeddings - centroid_embedding, axis=1)
        medoid_idx = np.argmin(distances)
        
        # Get the 3D position of the medoid
        medoid_3d = cluster_coords[medoid_idx]
        rep_fragment = cluster_fragments[medoid_idx]
        
        # Extract keywords from cluster fragments for label
        keywords = extract_keywords(cluster_fragments)
        label_text = keywords if keywords else rep_fragment[:30]
        
        anchors.append(Anchor(
            x=float(medoid_3d[0]),
            y=float(medoid_3d[1]),
            z=float(medoid_3d[2]),
            label=label_text + ("..." if len(label_text) > 30 else ""),
            cluster=int(label)
        ))
    
    return anchors

def extract_keywords(fragments: List[str], top_n: int = 3) -> str:
    """Extract top keywords from fragments using simple frequency"""
    from collections import Counter
    import re
    
    # Simple word frequency (can be upgraded to TF-IDF)
    words = []
    for frag in fragments:
        # Get last few words from each fragment
        words.extend(frag.split()[-3:])
    
    # Count and get top words
    word_counts = Counter(word.lower() for word in words if len(word) > 3)
    top_words = [word for word, _ in word_counts.most_common(top_n)]
    
    return " / ".join(top_words) if top_words else ""

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
    
    # Level 1: Temporal smoothing for continuity
    coords_3d = apply_temporal_smoothing(coords_3d)
    
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

