export interface PresetConfig {
  id: string;
  title: string;
  description: string;
  gradient: string;
  settings: {
    speed?: number;
    showParticles?: boolean;
    showClusterClouds?: boolean;
    showAnchorLabels?: boolean;
    cameraMode?: 'drift' | 'orbit' | 'static';
    mode?: 'prefix' | 'token';
    sampleText?: string; // Optional sample text to load
  };
}

export const PRESET_CONFIGS: Record<string, PresetConfig> = {
  'anxiety-spiral': {
    id: 'anxiety-spiral',
    title: 'Anxiety Spiral',
    description: 'A tense, coiling trail through uncertainty',
    gradient: 'linear-gradient(135deg, #FF4D6D 0%, #8B5CFF 100%)',
    settings: {
      speed: 0.8,
      showParticles: true,
      showClusterClouds: true,
      showAnchorLabels: true,
      cameraMode: 'drift',
      mode: 'prefix',
      sampleText: 'I woke up feeling oddly optimistic, like today might finally click. On the train I listened to birds and street noise blending into a rhythm, and it made me smile for no reason. Then my phone buzzed: an email with "urgent" in the subject, and my stomach dropped.',
    },
  },
  'calm-nebula': {
    id: 'calm-nebula',
    title: 'Calm Nebula',
    description: 'Gentle, flowing paths through tranquility',
    gradient: 'linear-gradient(135deg, #47D7FF 0%, #7CFF8A 100%)',
    settings: {
      speed: 1.2,
      showParticles: true,
      showClusterClouds: true,
      showAnchorLabels: false,
      cameraMode: 'orbit',
      mode: 'prefix',
      sampleText: 'The morning light filtered through the window, soft and golden. I took a deep breath and felt the tension leave my shoulders. Everything felt peaceful, calm, and right.',
    },
  },
  'chaos-control': {
    id: 'chaos-control',
    title: 'Chaos → Control',
    description: 'From scattered thoughts to focused clarity',
    gradient: 'linear-gradient(135deg, #FFB020 0%, #36D399 100%)',
    settings: {
      speed: 1.0,
      showParticles: true,
      showClusterClouds: false,
      showAnchorLabels: true,
      cameraMode: 'static',
      mode: 'token',
      sampleText: 'Thoughts racing, ideas colliding, nothing makes sense. Then slowly, patterns emerge. Clarity forms. Control returns.',
    },
  },
  'techno-ribbon': {
    id: 'techno-ribbon',
    title: 'Techno Ribbon',
    description: 'Sharp, precise movements through digital space',
    gradient: 'linear-gradient(135deg, #8B5CFF 0%, #47D7FF 100%)',
    settings: {
      speed: 1.5,
      showParticles: false,
      showClusterClouds: false,
      showAnchorLabels: true,
      cameraMode: 'orbit',
      mode: 'token',
      sampleText: 'Code flows. Logic connects. Systems align. Precision meets creativity.',
    },
  },
  'poetic-flow': {
    id: 'poetic-flow',
    title: 'Poetic Flow',
    description: 'Elegant curves through lyrical meaning',
    gradient: 'linear-gradient(135deg, #7CFF8A 0%, #47D7FF 100%)',
    settings: {
      speed: 0.9,
      showParticles: true,
      showClusterClouds: true,
      showAnchorLabels: false,
      cameraMode: 'drift',
      mode: 'prefix',
      sampleText: 'Words dance like leaves in autumn wind, each phrase a melody, each sentence a story waiting to unfold.',
    },
  },
  'storm-serenity': {
    id: 'storm-serenity',
    title: 'Storm → Serenity',
    description: 'Turbulent beginnings to peaceful resolution',
    gradient: 'linear-gradient(135deg, #FF4D6D 0%, #7CFF8A 100%)',
    settings: {
      speed: 1.1,
      showParticles: true,
      showClusterClouds: true,
      showAnchorLabels: true,
      cameraMode: 'drift',
      mode: 'prefix',
      sampleText: 'Chaos swirls around me, thoughts collide, emotions surge. But then, like a calm after the storm, peace settles in. Everything finds its place.',
    },
  },
  'cosmic-drift': {
    id: 'cosmic-drift',
    title: 'Cosmic Drift',
    description: 'Wide, expansive journeys through space',
    gradient: 'linear-gradient(135deg, #8B5CFF 0%, #FF4D6D 100%)',
    settings: {
      speed: 0.7,
      showParticles: true,
      showClusterClouds: true,
      showAnchorLabels: false,
      cameraMode: 'orbit',
      mode: 'prefix',
      sampleText: 'In the vast expanse of thought, ideas float like stars. Each concept a galaxy, each connection a constellation.',
    },
  },
  'minimalist-path': {
    id: 'minimalist-path',
    title: 'Minimalist Path',
    description: 'Clean, simple lines through clarity',
    gradient: 'linear-gradient(135deg, #47D7FF 0%, #EAF0FF 100%)',
    settings: {
      speed: 1.0,
      showParticles: false,
      showClusterClouds: false,
      showAnchorLabels: false,
      cameraMode: 'static',
      mode: 'token',
      sampleText: 'Simple. Clear. Direct. Less is more.',
    },
  },
  'emotional-journey': {
    id: 'emotional-journey',
    title: 'Emotional Journey',
    description: 'A full spectrum of feeling and color',
    gradient: 'linear-gradient(135deg, #FF4D6D 0%, #FFB020 50%, #36D399 100%)',
    settings: {
      speed: 1.0,
      showParticles: true,
      showClusterClouds: true,
      showAnchorLabels: true,
      cameraMode: 'drift',
      mode: 'prefix',
      sampleText: 'Joy bubbles up, then sadness creeps in. Anger flares, then calm returns. Life is a spectrum of feeling.',
    },
  },
  'neural-network': {
    id: 'neural-network',
    title: 'Neural Network',
    description: 'Interconnected nodes of thought',
    gradient: 'linear-gradient(135deg, #8B5CFF 0%, #47D7FF 50%, #7CFF8A 100%)',
    settings: {
      speed: 1.2,
      showParticles: true,
      showClusterClouds: true,
      showAnchorLabels: true,
      cameraMode: 'orbit',
      mode: 'token',
      sampleText: 'Ideas connect. Thoughts link. Concepts form networks. Understanding emerges from connections.',
    },
  },
  'sunset-trail': {
    id: 'sunset-trail',
    title: 'Sunset Trail',
    description: 'Warm transitions through golden hours',
    gradient: 'linear-gradient(135deg, #FFB020 0%, #FF4D6D 100%)',
    settings: {
      speed: 0.9,
      showParticles: true,
      showClusterClouds: false,
      showAnchorLabels: false,
      cameraMode: 'drift',
      mode: 'prefix',
      sampleText: 'The day fades, colors shift from gold to orange to deep red. Evening brings reflection and peace.',
    },
  },
  'aurora-borealis': {
    id: 'aurora-borealis',
    title: 'Aurora Borealis',
    description: 'Dancing lights through semantic space',
    gradient: 'linear-gradient(135deg, #7CFF8A 0%, #47D7FF 50%, #8B5CFF 100%)',
    settings: {
      speed: 1.1,
      showParticles: true,
      showClusterClouds: true,
      showAnchorLabels: false,
      cameraMode: 'orbit',
      mode: 'prefix',
      sampleText: 'Colors dance across the sky of thought, shifting, flowing, creating patterns of light and meaning.',
    },
  },
};

export function getPresetConfig(presetId: string): PresetConfig | null {
  return PRESET_CONFIGS[presetId] || null;
}

