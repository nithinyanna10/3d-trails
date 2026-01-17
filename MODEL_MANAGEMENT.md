# Model Management Feature

This document describes the custom embedding model management feature that allows users to add, remove, and switch between different embedding models.

## Overview

Users can now:
- Add custom embedding models (HuggingFace model IDs)
- View all available models (default + custom)
- Set which model is active for embeddings
- Remove custom models
- See the active model in the UI

## Backend API Endpoints

### `GET /models`
List all available embedding models.

**Response:**
```json
[
  {
    "name": "all-MiniLM-L6-v2",
    "type": "sentence-transformers",
    "description": "Default fast and efficient model",
    "is_default": true,
    "is_custom": false
  }
]
```

### `GET /models/active`
Get the currently active model.

**Response:**
```json
{
  "name": "all-MiniLM-L6-v2",
  "type": "sentence-transformers",
  "description": "Default fast and efficient model",
  "is_default": true,
  "is_custom": false
}
```

### `POST /models/add`
Add a new custom embedding model.

**Request:**
```json
{
  "name": "sentence-transformers/all-mpnet-base-v2",
  "description": "Optional description"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Model 'all-mpnet-base-v2' added successfully",
  "model": {
    "name": "all-mpnet-base-v2",
    "dimension": 768,
    "description": "Optional description"
  }
}
```

### `POST /models/set-active`
Set the active embedding model.

**Request:**
```json
{
  "model_name": "all-mpnet-base-v2"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Active model set to 'all-mpnet-base-v2'",
  "active_model": "all-mpnet-base-v2"
}
```

### `DELETE /models/{model_name}`
Remove a custom model (cannot remove default models).

**Response:**
```json
{
  "success": true,
  "message": "Model 'model-name' removed successfully"
}
```

## Frontend Usage

### Accessing Model Manager

1. Open the Studio page (`/studio`)
2. Look at the right-side Inspector Panel
3. Scroll to the "Advanced" section
4. Click the "Models" button

### Adding a Model

1. Click "Add Model" button
2. Enter a HuggingFace model ID (e.g., `sentence-transformers/all-mpnet-base-v2`)
3. Optionally add a description
4. Click "Add Model"
5. The model will be verified and added to your available models

### Setting Active Model

1. In the model list, find the model you want to use
2. Click "Set Active" button
3. The model will be loaded and used for all future embeddings

### Removing a Model

1. Find a custom model in the list
2. Click the "Remove" button
3. Confirm the removal
4. If it was the active model, it will switch to the default

## Model Storage

- Models are stored in `backend/models/` directory
- Model configuration is saved in `backend/models_config.json`
- Default models are pre-configured and cannot be removed
- Custom models are user-added and can be removed

## Supported Model Types

Currently supports:
- **sentence-transformers** models from HuggingFace
- Any model compatible with the `SentenceTransformer` API

## Example Models to Try

- `all-MiniLM-L6-v2` - Fast, efficient (default)
- `all-mpnet-base-v2` - Higher quality, slower
- `paraphrase-multilingual-MiniLM-L12-v2` - Multilingual support
- `all-distilroberta-v1` - DistilRoBERTa based
- `multi-qa-MiniLM-L6-cos-v1` - Optimized for Q&A

## Technical Details

### Model Loading
- Models are loaded lazily (on first use)
- Models are cached in memory for performance
- If a model fails to load, it falls back to the default model

### Embedding Endpoint
The `/embed` endpoint now accepts an optional `model` parameter:

```json
{
  "text": "your text here",
  "mode": "prefix",
  "model": "all-mpnet-base-v2"  // Optional
}
```

If not provided, uses the currently active model.
