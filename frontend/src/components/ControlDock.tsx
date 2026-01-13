import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface ControlDockProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
  status?: {
    points: number;
    clusters: number;
    sentiment: number;
    progress: number;
    latency?: number;
  };
}

export default function ControlDock({ activeTab, onTabChange, children, status }: ControlDockProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-collapse after 3 seconds of inactivity
    const timer = setTimeout(() => {
      if (!isHovered) {
        setIsExpanded(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isHovered]);

  return (
    <motion.div
      ref={dockRef}
      className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40"
      onMouseEnter={() => {
        setIsHovered(true);
        setIsExpanded(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      initial={false}
      animate={{
        y: isExpanded ? 0 : 20,
        opacity: isExpanded ? 1 : 0.7,
      }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="glass-panel rounded-t-3xl min-w-[min(960px,92vw)] max-w-[min(960px,92vw)]">
        {/* Collapse Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b border-[var(--panel-border)] bg-transparent px-6">
                  <TabsTrigger
                    value="compose"
                    className="data-[state=active]:bg-transparent data-[state=active]:text-[var(--accent-cyan)] text-[var(--text-muted)] border-b-2 data-[state=active]:border-[var(--accent-cyan)] border-transparent rounded-none"
                  >
                    Compose
                  </TabsTrigger>
                  <TabsTrigger
                    value="look"
                    className="data-[state=active]:bg-transparent data-[state=active]:text-[var(--accent-cyan)] text-[var(--text-muted)] border-b-2 data-[state=active]:border-[var(--accent-cyan)] border-transparent rounded-none"
                  >
                    Look
                  </TabsTrigger>
                  <TabsTrigger
                    value="motion"
                    className="data-[state=active]:bg-transparent data-[state=active]:text-[var(--accent-cyan)] text-[var(--text-muted)] border-b-2 data-[state=active]:border-[var(--accent-cyan)] border-transparent rounded-none"
                  >
                    Motion
                  </TabsTrigger>
                </TabsList>

                <div className="p-6">
                  {children}
                </div>

                {/* Status Strip */}
                {status && (
                  <div className="px-6 py-3 border-t border-[var(--panel-border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <div className="flex items-center gap-4">
                      <span>Points: <span className="text-[var(--text-primary)] font-medium">{status.points}</span></span>
                      <span>Clusters: <span className="text-[var(--text-primary)] font-medium">{status.clusters}</span></span>
                      <span>Sentiment: <span className="text-[var(--text-primary)] font-medium">{status.sentiment.toFixed(2)}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Progress: <span className="text-[var(--text-primary)] font-medium">{Math.max(0, Math.min(100, status.progress))}%</span></span>
                      {status.latency !== undefined && (
                        <span className="text-[var(--text-muted)]">• {status.latency}ms</span>
                      )}
                    </div>
                  </div>
                )}
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

