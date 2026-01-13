import { motion } from 'framer-motion';
import TopNav from '../components/TopNav';
import PresetCard from '../components/PresetCard';

const PRESETS = [
  {
    id: 'anxiety-spiral',
    title: 'Anxiety Spiral',
    description: 'A tense, coiling trail through uncertainty',
    gradient: 'linear-gradient(135deg, #FF4D6D 0%, #8B5CFF 100%)',
  },
  {
    id: 'calm-nebula',
    title: 'Calm Nebula',
    description: 'Gentle, flowing paths through tranquility',
    gradient: 'linear-gradient(135deg, #47D7FF 0%, #7CFF8A 100%)',
  },
  {
    id: 'chaos-control',
    title: 'Chaos → Control',
    description: 'From scattered thoughts to focused clarity',
    gradient: 'linear-gradient(135deg, #FFB020 0%, #36D399 100%)',
  },
  {
    id: 'techno-ribbon',
    title: 'Techno Ribbon',
    description: 'Sharp, precise movements through digital space',
    gradient: 'linear-gradient(135deg, #8B5CFF 0%, #47D7FF 100%)',
  },
  {
    id: 'poetic-flow',
    title: 'Poetic Flow',
    description: 'Elegant curves through lyrical meaning',
    gradient: 'linear-gradient(135deg, #7CFF8A 0%, #47D7FF 100%)',
  },
  {
    id: 'storm-serenity',
    title: 'Storm → Serenity',
    description: 'Turbulent beginnings to peaceful resolution',
    gradient: 'linear-gradient(135deg, #FF4D6D 0%, #7CFF8A 100%)',
  },
  {
    id: 'cosmic-drift',
    title: 'Cosmic Drift',
    description: 'Wide, expansive journeys through space',
    gradient: 'linear-gradient(135deg, #8B5CFF 0%, #FF4D6D 100%)',
  },
  {
    id: 'minimalist-path',
    title: 'Minimalist Path',
    description: 'Clean, simple lines through clarity',
    gradient: 'linear-gradient(135deg, #47D7FF 0%, #EAF0FF 100%)',
  },
  {
    id: 'emotional-journey',
    title: 'Emotional Journey',
    description: 'A full spectrum of feeling and color',
    gradient: 'linear-gradient(135deg, #FF4D6D 0%, #FFB020 50%, #36D399 100%)',
  },
  {
    id: 'neural-network',
    title: 'Neural Network',
    description: 'Interconnected nodes of thought',
    gradient: 'linear-gradient(135deg, #8B5CFF 0%, #47D7FF 50%, #7CFF8A 100%)',
  },
  {
    id: 'sunset-trail',
    title: 'Sunset Trail',
    description: 'Warm transitions through golden hours',
    gradient: 'linear-gradient(135deg, #FFB020 0%, #FF4D6D 100%)',
  },
  {
    id: 'aurora-borealis',
    title: 'Aurora Borealis',
    description: 'Dancing lights through semantic space',
    gradient: 'linear-gradient(135deg, #7CFF8A 0%, #47D7FF 50%, #8B5CFF 100%)',
  },
];

export default function Presets() {
  return (
    <div className="min-h-screen bg-breathing">
      <TopNav />
      
      {/* Star Field */}
      <div className="star-field">
        {Array.from({ length: 100 }).map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 pt-24 pb-24 px-4">
        <div className="max-w-[var(--max-content-width)] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="text-center mb-16"
          >
            <h1 className="h1 mb-4">Presets</h1>
            <p className="body text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              Choose a preset to explore different visual styles and moods
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PRESETS.map((preset, index) => (
              <motion.div
                key={preset.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut', delay: index * 0.05 }}
              >
                <PresetCard
                  title={preset.title}
                  description={preset.description}
                  gradient={preset.gradient}
                  presetId={preset.id}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

