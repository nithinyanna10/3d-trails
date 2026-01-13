import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';

interface InspectorPanelProps {
  stats: {
    points: number;
    clusters: number;
    sentiment: number;
    progress: number;
    latency?: number;
  };
}

export default function InspectorPanel({ stats }: InspectorPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: isCollapsed ? 280 : 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed right-0 top-14 bottom-24 z-30 w-[320px]"
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full p-2 rounded-l-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors"
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <motion.div
          animate={{ rotate: isCollapsed ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight size={16} className="text-[var(--text-muted)]" />
        </motion.div>
      </button>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full p-6 overflow-y-auto"
          >
            <h3 className="label text-xs mb-6 text-[var(--text-muted)] uppercase tracking-wider">
              Stats
            </h3>

            <div className="space-y-4">
              {/* Points */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="body text-sm text-[var(--text-secondary)]">Points</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium text-[var(--accent-cyan)] bg-[rgba(71,215,255,0.1)]">
                    {stats.points}
                  </span>
                </div>
              </div>

              {/* Clusters */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="body text-sm text-[var(--text-secondary)]">Clusters</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium text-[var(--accent-violet)] bg-[rgba(139,92,255,0.1)]">
                    {stats.clusters}
                  </span>
                </div>
              </div>

              {/* Sentiment */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="body text-sm text-[var(--text-secondary)]">Sentiment</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium text-[var(--text-primary)] bg-[rgba(255,255,255,0.08)]">
                    {stats.sentiment.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="body text-sm text-[var(--text-secondary)]">Progress</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium text-[var(--text-primary)] bg-[rgba(255,255,255,0.08)]">
                    {Math.max(0, Math.min(100, stats.progress))}%
                  </span>
                </div>
              </div>

              {/* Latency */}
              {stats.latency !== undefined && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="body text-sm text-[var(--text-secondary)]">Latency</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium text-[var(--text-muted)] bg-[rgba(255,255,255,0.06)]">
                      {stats.latency}ms
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.08)]">
              <h3 className="label text-xs mb-4 text-[var(--text-muted)] uppercase tracking-wider">
                Advanced
              </h3>
              <p className="body text-xs text-[var(--text-muted)]">
                Additional controls coming soon
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

