import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Share2, Download, Sparkles } from 'lucide-react';
import Logo from './Logo';

interface StudioTopBarProps {
  onShare?: () => void;
  onExport?: () => void;
}

export default function StudioTopBar({ onShare, onExport }: StudioTopBarProps) {
  return (
    <motion.nav
      initial={{ y: -56, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 h-14"
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div className="h-full flex items-center justify-between px-6">
        {/* Left: Logo + Name */}
        <Link to="/" className="flex items-center gap-2 group">
          <Logo size={20} animated />
          <span className="font-heading text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors">
            Trails
          </span>
        </Link>

        {/* Center: Mode Label */}
        <div className="label text-xs text-[var(--text-muted)] uppercase tracking-wider">
          Studio
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Link to="/presets">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5"
            >
              <Sparkles size={14} />
              <span>Presets</span>
            </motion.button>
          </Link>
          {onShare && (
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              onClick={onShare}
              className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5"
              aria-label="Share"
            >
              <Share2 size={14} />
              <span>Share</span>
            </motion.button>
          )}
          {onExport && (
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              onClick={onExport}
              className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5"
              aria-label="Export"
            >
              <Download size={14} />
              <span>Export</span>
            </motion.button>
          )}
        </div>
      </div>
    </motion.nav>
  );
}

