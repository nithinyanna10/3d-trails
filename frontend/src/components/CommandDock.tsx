import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Mic, Upload, Type, Image as ImageIcon, Play, Pause } from 'lucide-react';

interface CommandDockProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onProcess: () => void;
  isLoading: boolean;
  children: React.ReactNode;
}

export default function CommandDock({ activeTab, onTabChange, onProcess, isLoading, children }: CommandDockProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <motion.div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 mb-6"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div
        className="relative rounded-[24px] max-w-[980px] w-[92vw]"
        style={{
          background: 'rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Ambient gradient drift behind dock */}
        <motion.div
          className="absolute inset-0 rounded-[24px] pointer-events-none overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(71, 215, 255, 0.12) 0%, transparent 70%)',
            opacity: 0.12,
          }}
          animate={{
            x: [0, 10, -5, 0],
            y: [0, -8, 12, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Progress glow bar (when processing) */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '100%', opacity: 1 }}
              exit={{ width: '100%', opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute top-0 left-0 h-[2px] rounded-t-[24px]"
              style={{
                background: 'linear-gradient(90deg, #47D7FF 0%, #8B5CFF 100%)',
                boxShadow: '0 0 8px rgba(71, 215, 255, 0.6)',
              }}
            />
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex items-center border-b border-[rgba(255,255,255,0.08)] px-4">
          {(['compose', 'look', 'motion'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className="relative px-4 py-3 text-sm font-medium transition-colors"
              style={{
                color: activeTab === tab ? '#EAF0FF' : 'rgba(234, 240, 255, 0.72)',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{
                    background: 'linear-gradient(90deg, #47D7FF 0%, #8B5CFF 100%)',
                    boxShadow: '0 0 8px rgba(139, 92, 255, 0.4)',
                  }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Primary Process Button */}
        <div className="px-6 pb-6">
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 0 24px rgba(71, 215, 255, 0.4)' }}
            whileTap={{ scale: 0.98 }}
            onClick={onProcess}
            disabled={isLoading}
            className="w-full py-3 px-6 rounded-xl text-sm font-medium text-white relative overflow-hidden transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #47D7FF 0%, #8B5CFF 100%)',
              boxShadow: '0 0 20px rgba(71, 215, 255, 0.3)',
            }}
          >
            {isLoading ? 'Processing...' : 'Process'}
            <span className="ml-2 text-xs opacity-70">⌘ Enter</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

