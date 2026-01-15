export interface Point {
  x: number;
  y: number;
  z: number;
  text_fragment: string;
  sentiment: number;
  cluster: number;
}

export interface Anchor {
  x: number;
  y: number;
  z: number;
  label: string;
  cluster: number;
}

export interface EmbedResponse {
  points: Point[];
  anchors: Anchor[];
  meta: {
    n_points: number;
    n_clusters: number;
  };
}

export async function embedText(
  text: string,
  mode: "prefix" | "token" = "prefix",
  model?: string
): Promise<EmbedResponse> {
  const response = await fetch("http://localhost:8000/embed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, mode, model }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

export interface ProcessFileResponse {
  text?: string;
  success: boolean;
  error?: string;
}

export async function processAudioFile(file: File): Promise<ProcessFileResponse> {
  const formData = new FormData();
  formData.append("audio_file", file);

  const response = await fetch("http://localhost:8000/process-audio", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`API error: ${response.statusText} - ${errorData.detail || errorData.error}`);
  }

  return response.json();
}

export async function processImageFile(file: File): Promise<EmbedResponse> {
  const formData = new FormData();
  formData.append("image_file", file);

  const response = await fetch("http://localhost:8000/process-image", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`API error: ${response.statusText} - ${errorData.detail || errorData.error}`);
  }

  return response.json();
}

// Model Management API

export interface ModelInfo {
  name: string;
  type: string;
  description: string;
  is_default: boolean;
  is_custom: boolean;
}

export async function listModels(): Promise<ModelInfo[]> {
  const response = await fetch("http://localhost:8000/models", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getActiveModel(): Promise<ModelInfo> {
  const response = await fetch("http://localhost:8000/models/active", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

export async function addModel(name: string, description?: string): Promise<{ success: boolean; message: string; model?: any }> {
  const response = await fetch("http://localhost:8000/models/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, description }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `API error: ${response.statusText}`);
  }

  return response.json();
}

export async function removeModel(modelName: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`http://localhost:8000/models/${encodeURIComponent(modelName)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `API error: ${response.statusText}`);
  }

  return response.json();
}

export async function setActiveModel(modelName: string): Promise<{ success: boolean; message: string; active_model: string }> {
  const response = await fetch("http://localhost:8000/models/set-active", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model_name: modelName }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `API error: ${response.statusText}`);
  }

  return response.json();
}

