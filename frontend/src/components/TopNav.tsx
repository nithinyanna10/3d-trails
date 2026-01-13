import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Share2, Download } from 'lucide-react';

interface TopNavProps {
  onShare?: () => void;
  onExport?: () => void;
}

export default function TopNav({ onShare, onExport }: TopNavProps) {
  const location = useLocation();
  const isStudio = location.pathname === '/studio';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 glass-panel border-b border-[var(--panel-border)]">
      <div className="h-full flex items-center justify-between px-6 max-w-[var(--max-content-width)] mx-auto">
        {/* Logo + Brand */}
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div
            whileHover={{ rotate: 90, scale: 1.1 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="2" fill="var(--accent-cyan)" />
              <circle cx="6" cy="6" r="1.5" fill="var(--accent-violet)" opacity="0.8" />
              <circle cx="18" cy="6" r="1.5" fill="var(--accent-violet)" opacity="0.8" />
              <circle cx="6" cy="18" r="1.5" fill="var(--accent-violet)" opacity="0.8" />
              <circle cx="18" cy="18" r="1.5" fill="var(--accent-violet)" opacity="0.8" />
            </svg>
          </motion.div>
          <span className="font-heading text-lg font-semibold text-[var(--text-primary)]">Trails</span>
        </Link>

        {/* Center Breadcrumb */}
        {isStudio && (
          <div className="label text-[var(--text-muted)]">Studio</div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {isStudio && (
            <>
              <Link to="/presets">
                <button className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  Presets
                </button>
              </Link>
              {onShare && (
                <button
                  onClick={onShare}
                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  aria-label="Share"
                >
                  <Share2 size={18} />
                </button>
              )}
              {onExport && (
                <button
                  onClick={onExport}
                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  aria-label="Export"
                >
                  <Download size={18} />
                </button>
              )}
            </>
          )}
          {!isStudio && (
            <Link to="/studio">
              <button className="btn-gradient px-4 py-2 rounded-lg text-sm font-medium text-white relative">
                Open Studio
              </button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

