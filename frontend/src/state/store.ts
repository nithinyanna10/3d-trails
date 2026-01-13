import { create } from 'zustand';
import { Point, Anchor } from '../api';

interface AppState {
  // Text & Mode
  text: string;
  mode: 'prefix' | 'token' | 'sentences';
  setText: (text: string) => void;
  setMode: (mode: 'prefix' | 'token' | 'sentences') => void;
  
  // Points & Data
  points: Point[];
  anchors: Anchor[];
  meta: { n_points: number; n_clusters: number };
  setPoints: (points: Point[]) => void;
  setAnchors: (anchors: Anchor[]) => void;
  setMeta: (meta: { n_points: number; n_clusters: number }) => void;
  
  // Animation
  animationProgress: number;
  revealIndex: number; // For timeline scrubber
  speed: number;
  setAnimationProgress: (progress: number) => void;
  setRevealIndex: (index: number) => void;
  setSpeed: (speed: number) => void;
  
  // Visual Settings
  showParticles: boolean;
  showClusterClouds: boolean;
  showAnchorLabels: boolean;
  setShowParticles: (show: boolean) => void;
  setShowClusterClouds: (show: boolean) => void;
  setShowAnchorLabels: (show: boolean) => void;
  
  // Camera
  cameraMode: 'drift' | 'orbit' | 'static';
  setCameraMode: (mode: 'drift' | 'orbit' | 'static') => void;
  
  // Preset
  preset: string | null;
  setPreset: (preset: string | null) => void;
  
  // Loading
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // Latency tracking
  latency: number;
  setLatency: (latency: number) => void;
}

export const useStore = create<AppState>((set) => ({
  // Initial state
  text: '',
  mode: 'prefix',
  points: [],
  anchors: [],
  meta: { n_points: 0, n_clusters: 0 },
  animationProgress: 0,
  revealIndex: 0,
  speed: 1.0,
  showParticles: true,
  showClusterClouds: false,
  showAnchorLabels: false,
  cameraMode: 'orbit',
  preset: null,
  isLoading: false,
  latency: 0,
  
  // Setters
  setText: (text) => set({ text }),
  setMode: (mode) => set({ mode }),
  setPoints: (points) => set({ points, revealIndex: Math.max(2, points.length) }),
  setAnchors: (anchors) => set({ anchors }),
  setMeta: (meta) => set({ meta }),
  setAnimationProgress: (progress) => set({ animationProgress: progress }),
  setRevealIndex: (index) => set({ revealIndex: index }),
  setSpeed: (speed) => set({ speed }),
  setShowParticles: (showParticles) => set({ showParticles }),
  setShowClusterClouds: (showClusterClouds) => set({ showClusterClouds }),
  setShowAnchorLabels: (showAnchorLabels) => set({ showAnchorLabels }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  setPreset: (preset) => set({ preset }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setLatency: (latency) => set({ latency }),
}));

// Helper function to calculate progress (never NaN)
export function calculateProgress(revealIndex: number, nPoints: number): number {
  if (nPoints <= 1) return 0;
  const progress = (revealIndex / Math.max(1, nPoints - 1)) * 100;
  return Math.max(0, Math.min(100, progress));
}

// Helper function to calculate average sentiment
export function calculateAverageSentiment(points: Point[]): number {
  if (points.length === 0) return 0;
  const sum = points.reduce((acc, p) => acc + p.sentiment, 0);
  return sum / points.length;
}

