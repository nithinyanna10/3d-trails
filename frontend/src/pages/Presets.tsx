import { motion } from 'framer-motion';
import TopNav from '../components/TopNav';
import PresetCard from '../components/PresetCard';
import { PRESET_CONFIGS } from '../utils/presets';

const PRESETS = Object.values(PRESET_CONFIGS);

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

