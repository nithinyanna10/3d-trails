from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from typing import List, Literal, Optional, Dict
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.neighbors import NearestNeighbors
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import warnings
import io
from PIL import Image
import torch
import json
import os
from pathlib import Path

# Try to import vision model for image embeddings
try:
    from transformers import CLIPProcessor, CLIPModel
    HAS_VISION = True
except ImportError:
    HAS_VISION = False

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

# Model registry and management
MODELS_DIR = Path("models")
MODELS_DIR.mkdir(exist_ok=True)
MODELS_CONFIG_FILE = MODELS_DIR / "models_config.json"

# Default models
DEFAULT_MODELS = {
    "all-MiniLM-L6-v2": {
        "name": "all-MiniLM-L6-v2",
        "type": "sentence-transformers",
        "description": "Default fast and efficient model",
        "is_default": True,
        "is_custom": False
    },
    "all-mpnet-base-v2": {
        "name": "all-mpnet-base-v2",
        "type": "sentence-transformers",
        "description": "Higher quality, slower model",
        "is_default": True,
        "is_custom": False
    }
}

# Load models (lazy loading)
models_registry: Dict[str, SentenceTransformer] = {}
active_model_name = "all-MiniLM-L6-v2"
sentiment_analyzer = None
vision_model = None
vision_processor = None

def load_models_config():
    """Load models configuration from file"""
    if MODELS_CONFIG_FILE.exists():
        try:
            with open(MODELS_CONFIG_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading models config: {e}")
            return DEFAULT_MODELS.copy()
    return DEFAULT_MODELS.copy()

def save_models_config(config: Dict):
    """Save models configuration to file"""
    try:
        with open(MODELS_CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        print(f"Error saving models config: {e}")

# Initialize models config
models_config = load_models_config()

def get_model(model_name: Optional[str] = None):
    """Get embedding model, loading it if necessary"""
    global models_registry, active_model_name
    
    # Use provided model_name or fall back to active
    target_model_name = model_name or active_model_name
    
    # Check if model is already loaded
    if target_model_name in models_registry:
        return models_registry[target_model_name]
    
    # Load model
    try:
        print(f"Loading model: {target_model_name}")
        model = SentenceTransformer(target_model_name)
        models_registry[target_model_name] = model
        print(f"✓ Model {target_model_name} loaded successfully")
        return model
    except Exception as e:
        print(f"Error loading model {target_model_name}: {e}")
        # Fallback to default
        if target_model_name != "all-MiniLM-L6-v2":
            print("Falling back to default model: all-MiniLM-L6-v2")
            return get_model("all-MiniLM-L6-v2")
        raise

def get_sentiment_analyzer():
    global sentiment_analyzer
    if sentiment_analyzer is None:
        sentiment_analyzer = SentimentIntensityAnalyzer()
    return sentiment_analyzer

def get_vision_model():
    """Load CLIP model for image embeddings"""
    global vision_model, vision_processor
    if vision_model is None and HAS_VISION:
        try:
            print("Loading CLIP model (this may take a minute on first run)...")
            vision_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
            vision_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
            print("✓ CLIP model loaded successfully")
        except Exception as e:
            print(f"Failed to load vision model: {e}")
            import traceback
            traceback.print_exc()
            return None, None
    return vision_model, vision_processor

class EmbedRequest(BaseModel):
    text: str
    mode: Literal["prefix", "token"] = "prefix"
    model: Optional[str] = None  # Optional model name, uses active model if not provided

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
    
    # Compute embeddings using specified or active model
    model = get_model(request.model)
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

@app.post("/process-audio")
async def process_audio(audio_file: UploadFile = File(...)):
    """
    Process audio file: transcribe speech or classify sounds
    Returns text that can be used with /embed endpoint
    """
    try:
        # Read audio file
        audio_bytes = await audio_file.read()
        
        # For now, return a placeholder message
        # In production, implement actual transcription using:
        # - Google Cloud Speech-to-Text
        # - AssemblyAI
        # - OpenAI Whisper
        # - Or local speech recognition
        
        return JSONResponse({
            "text": "Audio file received. Please use speech recognition or type text directly for now. Full audio transcription coming soon.",
            "success": True
        })
        
    except Exception as e:
        return JSONResponse(
            {"error": str(e), "success": False},
            status_code=500
        )

@app.post("/process-image", response_model=EmbedResponse)
async def process_image(image_file: UploadFile = File(...)):
    """
    Process image file: create embeddings directly from image (like voice/speech)
    Returns EmbedResponse with points from image embeddings
    """
    try:
        # Read image file
        image_bytes = await image_file.read()
        
        # Validate file type
        if not image_file.content_type or not image_file.content_type.startswith('image/'):
            return JSONResponse(
                {"error": "File must be an image", "success": False},
                status_code=400
            )
        
        # Open image with PIL
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Get vision model for image embeddings
        print(f"Processing image: {image_file.filename}, size: {len(image_bytes)} bytes")
        vision_model, vision_processor = get_vision_model()
        
        if not vision_model or not vision_processor:
            print("ERROR: Vision model not available!")
            return EmbedResponse(
                points=[],
                anchors=[],
                meta={"n_points": 0, "n_clusters": 0}
            )
        
        print("Creating image embeddings using CLIP...")
        # Create image embeddings using CLIP
        # Process image into patches/regions to create multiple embeddings (like text fragments)
        # Split image into grid regions for multiple embeddings
        width, height = image.size
        grid_size = 3  # 3x3 grid = 9 regions
        patch_width = width // grid_size
        patch_height = height // grid_size
        
        fragments = []
        embeddings_list = []
        
        # Extract embeddings from each grid region
        for i in range(grid_size):
            for j in range(grid_size):
                left = j * patch_width
                top = i * patch_height
                right = left + patch_width if j < grid_size - 1 else width
                bottom = top + patch_height if i < grid_size - 1 else height
                
                # Crop region
                region = image.crop((left, top, right, bottom))
                
                # Get embedding for this region
                inputs = vision_processor(images=region, return_tensors="pt")
                with torch.no_grad():
                    image_features = vision_model.get_image_features(**inputs)
                    embedding = image_features[0].numpy()
                
                fragments.append(f"region_{i}_{j}")
                embeddings_list.append(embedding)
        
        # Also get full image embedding
        inputs = vision_processor(images=image, return_tensors="pt")
        with torch.no_grad():
            image_features = vision_model.get_image_features(**inputs)
            full_embedding = image_features[0].numpy()
        
        fragments.append("full_image")
        embeddings_list.append(full_embedding)
        
        # Convert to numpy array
        embeddings = np.array(embeddings_list)
        print(f"Created {len(embeddings)} image embeddings, shape: {embeddings.shape}")
        
        # Reduce to 3D (same as text embeddings)
        coords_3d = reduce_to_3d(embeddings)
        coords_3d = normalize_3d(coords_3d)
        coords_3d = apply_temporal_smoothing(coords_3d)
        
        # Compute sentiment (neutral for images, or could use image classification)
        sentiments = [0.0] * len(fragments)  # Neutral sentiment for images
        
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
        
    except Exception as e:
        import traceback
        print(f"Error processing image: {e}")
        print(traceback.format_exc())
        # Return empty response on error
        return EmbedResponse(
            points=[],
            anchors=[],
            meta={"n_points": 0, "n_clusters": 0}
        )

@app.options("/process-image")
async def options_process_image():
    """Handle CORS preflight for /process-image endpoint"""
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

@app.get("/check-vision")
async def check_vision():
    """Check if vision model is available"""
    vision_model, vision_processor = get_vision_model()
    return {
        "has_vision": HAS_VISION,
        "model_loaded": vision_model is not None,
        "processor_loaded": vision_processor is not None
    }

# Model Management Endpoints

class ModelInfo(BaseModel):
    name: str
    type: str
    description: str
    is_default: bool
    is_custom: bool

class AddModelRequest(BaseModel):
    name: str  # HuggingFace model name or identifier
    description: Optional[str] = None

class SetActiveModelRequest(BaseModel):
    model_name: str

@app.get("/models", response_model=List[ModelInfo])
async def list_models():
    """List all available embedding models"""
    global models_config
    models_config = load_models_config()
    
    models_list = []
    for model_name, config in models_config.items():
        models_list.append(ModelInfo(
            name=model_name,
            type=config.get("type", "sentence-transformers"),
            description=config.get("description", ""),
            is_default=config.get("is_default", False),
            is_custom=config.get("is_custom", False)
        ))
    
    return models_list

@app.get("/models/active")
async def get_active_model():
    """Get the currently active model"""
    global active_model_name, models_config
    models_config = load_models_config()
    
    if active_model_name in models_config:
        config = models_config[active_model_name]
        return {
            "name": active_model_name,
            "type": config.get("type", "sentence-transformers"),
            "description": config.get("description", ""),
            "is_default": config.get("is_default", False),
            "is_custom": config.get("is_custom", False)
        }
    return {"name": active_model_name, "error": "Model not found in config"}

@app.post("/models/add")
async def add_model(request: AddModelRequest):
    """Add a new custom embedding model"""
    global models_config
    
    model_name = request.name.strip()
    if not model_name:
        return JSONResponse(
            {"error": "Model name cannot be empty"},
            status_code=400
        )
    
    # Try to load the model to verify it exists
    try:
        print(f"Verifying model: {model_name}")
        test_model = SentenceTransformer(model_name)
        # Get model info
        model_dim = test_model.get_sentence_embedding_dimension()
        print(f"✓ Model verified: {model_name} (dimension: {model_dim})")
        
        # Add to config
        models_config[model_name] = {
            "name": model_name,
            "type": "sentence-transformers",
            "description": request.description or f"Custom model: {model_name}",
            "is_default": False,
            "is_custom": True
        }
        
        save_models_config(models_config)
        
        return {
            "success": True,
            "message": f"Model '{model_name}' added successfully",
            "model": {
                "name": model_name,
                "dimension": model_dim,
                "description": models_config[model_name]["description"]
            }
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            {"error": f"Failed to load model '{model_name}': {str(e)}"},
            status_code=400
        )

@app.delete("/models/{model_name}")
async def remove_model(model_name: str):
    """Remove a custom model (cannot remove default models)"""
    global models_config, active_model_name
    
    if model_name not in models_config:
        return JSONResponse(
            {"error": f"Model '{model_name}' not found"},
            status_code=404
        )
    
    config = models_config[model_name]
    if config.get("is_default", False):
        return JSONResponse(
            {"error": "Cannot remove default models"},
            status_code=400
        )
    
    # Unload from memory if loaded
    if model_name in models_registry:
        del models_registry[model_name]
    
    # Remove from config
    del models_config[model_name]
    save_models_config(models_config)
    
    # If it was the active model, switch to default
    if active_model_name == model_name:
        active_model_name = "all-MiniLM-L6-v2"
    
    return {
        "success": True,
        "message": f"Model '{model_name}' removed successfully"
    }

@app.post("/models/set-active")
async def set_active_model(request: SetActiveModelRequest):
    """Set the active embedding model"""
    global active_model_name, models_config
    
    model_name = request.model_name.strip()
    
    if model_name not in models_config:
        return JSONResponse(
            {"error": f"Model '{model_name}' not found. Add it first using /models/add"},
            status_code=404
        )
    
    # Verify model can be loaded
    try:
        get_model(model_name)
        active_model_name = model_name
        return {
            "success": True,
            "message": f"Active model set to '{model_name}'",
            "active_model": model_name
        }
    except Exception as e:
        return JSONResponse(
            {"error": f"Failed to load model '{model_name}': {str(e)}"},
            status_code=400
        )

