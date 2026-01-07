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

