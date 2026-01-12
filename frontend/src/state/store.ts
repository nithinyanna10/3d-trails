import { create } from 'zustand';
import { Point, Anchor } from '../api';

interface AppState {
  // Text & Mode
  text: string;
  mode: 'prefix' | 'token';
  setText: (text: string) => void;
  setMode: (mode: 'prefix' | 'token') => void;
  
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
  
  // Preset
  preset: string | null;
  setPreset: (preset: string | null) => void;
  
  // Loading
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
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
  preset: null,
  isLoading: false,
  
  // Setters
  setText: (text) => set({ text }),
  setMode: (mode) => set({ mode }),
  setPoints: (points) => set({ points, revealIndex: points.length }),
  setAnchors: (anchors) => set({ anchors }),
  setMeta: (meta) => set({ meta }),
  setAnimationProgress: (progress) => set({ animationProgress: progress }),
  setRevealIndex: (index) => set({ revealIndex: index }),
  setSpeed: (speed) => set({ speed }),
  setShowParticles: (showParticles) => set({ showParticles }),
  setShowClusterClouds: (showClusterClouds) => set({ showClusterClouds }),
  setShowAnchorLabels: (showAnchorLabels) => set({ showAnchorLabels }),
  setPreset: (preset) => set({ preset }),
  setIsLoading: (isLoading) => set({ isLoading }),
}));

