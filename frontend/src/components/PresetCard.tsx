import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface PresetCardProps {
  title: string;
  description: string;
  gradient: string;
  presetId: string;
}

export default function PresetCard({ title, description, gradient, presetId }: PresetCardProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/studio?preset=${presetId}`)}
      className="glass-panel rounded-2xl p-6 cursor-pointer group"
    >
      {/* Gradient Thumbnail */}
      <div
        className="w-full h-32 rounded-xl mb-4 relative overflow-hidden"
        style={{ background: gradient }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20" />
      </div>

      {/* Content */}
      <h3 className="h2 mb-2 text-[var(--text-primary)]">{title}</h3>
      <p className="body text-[var(--text-secondary)]">{description}</p>

      {/* Hover Indicator */}
      <div className="mt-4 h-0.5 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-violet)] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
    </motion.div>
  );
}

