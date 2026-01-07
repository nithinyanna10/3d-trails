import * as THREE from "three";

/**
 * Map sentiment and cluster to color
 * Sentiment: controls brightness/saturation (neg = dim/colder, pos = bright/warmer)
 * Cluster: controls base hue
 */
export function getColor(sentiment: number, cluster: number, nClusters: number): THREE.Color {
  // Normalize sentiment to [0, 1]
  const sentNorm = (sentiment + 1) / 2; // [-1, 1] -> [0, 1]
  
  // Base hue from cluster (distribute across color wheel)
  const hue = (cluster / Math.max(1, nClusters)) * 0.8; // 0.8 to avoid full circle wrap
  
  // Saturation: higher for positive sentiment
  const saturation = 0.4 + sentNorm * 0.5; // [0.4, 0.9]
  
  // Brightness: higher for positive sentiment
  const lightness = 0.3 + sentNorm * 0.4; // [0.3, 0.7]
  
  const color = new THREE.Color();
  color.setHSL(hue, saturation, lightness);
  
  return color;
}

/**
 * Get color as hex string for CSS
 */
export function getColorHex(sentiment: number, cluster: number, nClusters: number): string {
  const color = getColor(sentiment, cluster, nClusters);
  return `#${color.getHexString()}`;
}

