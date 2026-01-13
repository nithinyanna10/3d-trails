import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface LensInputProps {
  value: string;
  onChange: (value: string) => void;
  onCommit?: () => void;
}

export default function LensInput({ value, onChange, onCommit }: LensInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [caretPosition, setCaretPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Calculate sentiment-based hue shift
  const glowHue = useMemo(() => {
    if (!value) return 180; // Default cyan
    
    const text = value.toLowerCase();
    const positiveWords = ['good', 'great', 'happy', 'love', 'amazing', 'wonderful', 'beautiful', 'joy', 'excited'];
    const negativeWords = ['bad', 'sad', 'hate', 'terrible', 'awful', 'horrible', 'angry', 'fear', 'worried'];
    
    let score = 0;
    positiveWords.forEach(word => {
      if (text.includes(word)) score += 0.3;
    });
    negativeWords.forEach(word => {
      if (text.includes(word)) score -= 0.3;
    });
    
    // Map to hue: positive = warmer (yellow/orange ~30-60), negative = cooler (blue ~220-240), neutral = cyan ~180
    const hue = 180 + (score * 60); // Shift from cyan based on sentiment
    return Math.max(150, Math.min(240, hue)); // Clamp to blue-cyan range
  }, [value]);

  // Update caret position
  useEffect(() => {
    if (inputRef.current) {
      const position = inputRef.current.selectionStart || value.length;
      setCaretPosition(position);
    }
  }, [value]);

  // Handle focus
  const handleLensClick = () => {
    inputRef.current?.focus();
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  // Handle Enter key - commit animation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      setIsCommitting(true);
      
      // Commit animation sequence
      setTimeout(() => {
        if (onCommit) {
          onCommit();
        }
        navigate('/studio', { state: { initialText: value } });
      }, 600);
    }
  };

  // Calculate curved baseline positions for text
  const getTextPath = (text: string) => {
    const chars = text.split('').filter(c => c.trim() || c === ' '); // Keep spaces
    const radius = 75; // Arc radius (smaller for better fit)
    const centerX = 0;
    const centerY = 8; // Slight offset down
    const startAngle = -Math.PI / 5; // Start angle
    const charSpacing = 0.11; // Radians per character (adjusted for spacing)
    
    return chars.map((char, i) => {
      const angle = startAngle + (i * charSpacing);
      const x = centerX + radius * Math.sin(angle);
      const y = centerY + radius * (1 - Math.cos(angle));
      return { char, x, y, angle, index: i };
    });
  };

  const textPath = getTextPath(value);
  const caretPath = getTextPath(value.slice(0, caretPosition));

  return (
    <div className="relative">
      {/* Beam line to 3D scene (points right) */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-y-1/2 w-[300px] h-[1px] origin-left pointer-events-none z-0"
        style={{ transform: 'translateY(-50%) rotate(-5deg)' }}
      >
        <motion.div
          className="h-full bg-gradient-to-r from-[var(--accent-cyan)]/50 via-[var(--accent-cyan)]/20 to-transparent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isFocused && value.length > 0 ? 1 : 0.2 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {/* Gravity Lens Portal */}
      <motion.div
        ref={lensRef}
        className="relative w-[320px] h-[320px] md:w-[360px] md:h-[360px] cursor-text"
        onClick={handleLensClick}
        animate={{
          scale: isFocused ? 1.02 : 1,
          opacity: isCommitting ? 0.85 : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Outer Glow */}
        <motion.div
          className="absolute inset-0 rounded-full blur-2xl"
          style={{
            background: `radial-gradient(circle, hsl(${glowHue}, 70%, 60%) 0%, transparent 70%)`,
            opacity: isFocused ? 0.4 : 0.2,
          }}
          animate={{
            opacity: isFocused ? 0.4 : 0.2,
          }}
        />

        {/* Lens Container */}
        <div className="relative w-full h-full rounded-full overflow-hidden">
          {/* Refraction Background */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              borderColor: `rgba(71, 215, 255, ${isFocused ? 0.5 : 0.25})`,
            }}
            transition={{ duration: 0.3 }}
            style={{
              background: `radial-gradient(circle at 30% 30%, 
                rgba(71, 215, 255, 0.12) 0%,
                rgba(139, 92, 255, 0.08) 40%,
                rgba(0, 0, 0, 0.4) 100%
              )`,
              backdropFilter: 'blur(24px)',
              border: `1px solid rgba(71, 215, 255, ${isFocused ? 0.5 : 0.25})`,
              boxShadow: `
                inset 0 0 80px rgba(71, 215, 255, 0.08),
                0 0 50px rgba(71, 215, 255, ${isFocused ? 0.4 : 0.2}),
                0 0 100px rgba(139, 92, 255, ${isFocused ? 0.25 : 0.12}),
                inset 0 0 100px rgba(0, 0, 0, 0.3)
              `,
            }}
          />

          {/* Animated Noise Texture */}
          <motion.div
            className="absolute inset-0 rounded-full opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 60,
              repeat: Infinity,
              ease: 'linear',
            }}
          />

          {/* Inner Highlight */}
          <div
            className="absolute top-[20%] left-[25%] w-[40%] h-[30%] rounded-full blur-xl"
            style={{
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)',
            }}
          />

          {/* Text Content Area */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg
              viewBox="-100 -60 200 120"
              className="w-full h-full"
              style={{ filter: 'drop-shadow(0 0 8px rgba(71, 215, 255, 0.5))' }}
            >
              {/* Curved Baseline Guide (subtle) */}
              {value.length > 0 && (
                <path
                  d={`M -80 10 Q 0 -20 80 10`}
                  fill="none"
                  stroke="rgba(71, 215, 255, 0.08)"
                  strokeWidth="0.5"
                  strokeDasharray="2 2"
                />
              )}

              {/* Text Characters */}
              <AnimatePresence mode="popLayout">
                {textPath.map(({ char, x, y, angle, index }) => (
                  <motion.g
                    key={`char-${index}-${char}`}
                    initial={{ opacity: 0, y: y - 15, scale: 0.3 }}
                    animate={{ 
                      opacity: 1, 
                      y: y,
                      scale: 1,
                    }}
                    exit={{ 
                      opacity: 0, 
                      scale: 0.3,
                      y: y + 10,
                      transition: { duration: 0.15 }
                    }}
                    transition={{ 
                      type: 'spring',
                      stiffness: 400,
                      damping: 25,
                    }}
                  >
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="var(--accent-cyan)"
                      fontSize="16"
                      fontFamily="var(--font-heading)"
                      fontWeight="500"
                      style={{
                        filter: 'drop-shadow(0 0 4px rgba(71, 215, 255, 0.6))',
                      }}
                    >
                      {char === ' ' ? '\u00A0' : char}
                    </text>
                  </motion.g>
                ))}
              </AnimatePresence>

              {/* Caret Dot */}
              {isFocused && (
                <motion.circle
                  cx={caretPath.length > 0 ? caretPath[caretPath.length - 1].x + 6 : 0}
                  cy={caretPath.length > 0 ? caretPath[caretPath.length - 1].y : 10}
                  r="2.5"
                  fill="var(--accent-cyan)"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [1, 0.4, 1],
                    scale: [1, 1.3, 1],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  style={{
                    filter: 'drop-shadow(0 0 8px var(--accent-cyan))',
                  }}
                />
              )}
            </svg>
          </div>

          {/* Commit Animation Overlay */}
          <AnimatePresence>
            {isCommitting && (
              <motion.div
                className="absolute inset-0 rounded-full flex items-center justify-center overflow-hidden"
                initial={{ opacity: 0, scale: 1 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1.1,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                style={{
                  background: `radial-gradient(circle, hsl(${glowHue}, 80%, 65%) 0%, hsl(${glowHue}, 70%, 50%) 50%, transparent 100%)`,
                }}
              >
                <motion.div
                  className="text-white font-heading text-sm font-semibold"
                  initial={{ scale: 1, opacity: 1 }}
                  animate={{ scale: 0.7, opacity: 0.9 }}
                  transition={{ duration: 0.5, ease: 'easeIn' }}
                >
                  {value.slice(0, 20)}{value.length > 20 ? '...' : ''}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Invisible Input for Accessibility */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="absolute inset-0 opacity-0 cursor-text z-10"
          aria-label="Type to shape the field"
        />
      </motion.div>
    </div>
  );
}

