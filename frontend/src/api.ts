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
  mode: "prefix" | "token" = "prefix"
): Promise<EmbedResponse> {
  const response = await fetch("http://localhost:8000/embed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, mode }),
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

