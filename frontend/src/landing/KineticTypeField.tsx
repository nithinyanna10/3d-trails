import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface KineticTypeFieldProps {
  typedText: string;
  onTextChange: (text: string) => void;
  onEnter: () => void;
  scrollProgress: number;
  stage: 'sparse' | 'lines' | 'dense';
  stageProgress: number;
}

interface Point {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  brightness: number;
  color: 'white' | 'cyan' | 'violet';
  connections: number[];
}

interface FloatingCaption {
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  life: number;
  targetLetterIndex: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  targetPointIndex: number;
}

export default function KineticTypeField({
  typedText,
  onTextChange,
  onEnter,
  scrollProgress,
  stage,
  stageProgress,
}: KineticTypeFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number>();
  const pointsRef = useRef<Point[]>([]);
  const floatingCaptionsRef = useRef<FloatingCaption[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lastTypingTimeRef = useRef(Date.now());
  const [isFocused, setIsFocused] = useState(false);

  // Generate letter points from text "MEANING" by sampling actual rendered text
  const generateLetterPoints = useCallback((text: string = 'MEANING'): Point[] => {
    const points: Point[] = [];
    const canvas = canvasRef.current;
    if (!canvas) return points;

    const rect = canvas.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;
    
    if (canvasWidth === 0 || canvasHeight === 0) return points;

    // Create temporary canvas for text rendering
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return points;

    const fontSize = Math.min(180, canvasWidth * 0.15);
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;

    tempCtx.font = `bold ${fontSize}px 'Sora', sans-serif`;
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.fillStyle = 'white';
    tempCtx.fillText(text, tempCanvas.width / 2, tempCanvas.height / 2);

    // Sample pixels from rendered text
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;

    const samplesPerStage = {
      sparse: 400,
      lines: 800,
      dense: 1600,
    };
    const targetSamples = samplesPerStage[stage] || 800;
    const sampleStep = Math.max(1, Math.floor((tempCanvas.width * tempCanvas.height) / targetSamples));

    for (let i = 0; i < data.length; i += sampleStep * 4) {
      const pixelIndex = i / 4;
      const x = pixelIndex % tempCanvas.width;
      const y = Math.floor(pixelIndex / tempCanvas.width);
      const alpha = data[i + 3];

      // Only sample pixels that are part of the text (alpha > 128)
      if (alpha > 128) {
        const color = Math.random() < 0.08 ? 'cyan' : Math.random() < 0.12 ? 'violet' : 'white';
        
        points.push({
          x: x + (Math.random() - 0.5) * 400, // Start scattered
          y: y + (Math.random() - 0.5) * 400,
          targetX: x,
          targetY: y,
          vx: 0,
          vy: 0,
          brightness: 0.4 + Math.random() * 0.5,
          color,
          connections: [],
        });
      }
    }

    // Build connection graph (for lines stage)
    if (stage !== 'sparse') {
      const connectionThreshold = stage === 'dense' ? 25 : 35;
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].targetX - points[j].targetX;
          const dy = points[i].targetY - points[j].targetY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < connectionThreshold) {
            points[i].connections.push(j);
            points[j].connections.push(i);
          }
        }
      }
    }

    return points;
  }, [stage]);

  // Initialize points when stage changes (points are regenerated in resize handler)

  // Handle typing - spawn particles
  useEffect(() => {
    if (!typedText) return;
    
    const now = Date.now();
    const timeDelta = now - lastTypingTimeRef.current;
    const typingSpeed = timeDelta > 0 ? 1000 / timeDelta : 0;
    lastTypingTimeRef.current = now;

    // Spawn particles for new characters
    const newChars = typedText.length;
    const particlesToSpawn = Math.min(Math.ceil(typingSpeed * 2), 15);
    
    for (let i = 0; i < particlesToSpawn; i++) {
      const canvas = canvasRef.current;
      if (!canvas) continue;

      const randomX = Math.random() * canvas.width;
      const randomY = Math.random() * canvas.height;
      
      // Find nearest point
      let nearestIndex = 0;
      let minDist = Infinity;
      pointsRef.current.forEach((p, idx) => {
        const dx = p.targetX - randomX;
        const dy = p.targetY - randomY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          nearestIndex = idx;
        }
      });

      particlesRef.current.push({
        x: randomX,
        y: randomY,
        vx: (pointsRef.current[nearestIndex].targetX - randomX) * 0.02,
        vy: (pointsRef.current[nearestIndex].targetY - randomY) * 0.02,
        life: 1.0,
        targetPointIndex: nearestIndex,
      });
    }

      // Spawn floating caption for each new character
      const canvas = canvasRef.current;
      if (canvas && typedText.length > 0) {
        const captionX = Math.random() * canvas.width;
        const captionY = Math.random() * canvas.height * 0.3; // Top area
        const targetLetterIndex = Math.floor(Math.random() * 6); // 6 letters in "MEANING"
        
        floatingCaptionsRef.current.push({
          text: typedText.slice(-1), // Last character
          x: captionX,
          y: captionY,
          vx: (Math.random() - 0.5) * 0.8,
          vy: 0.5,
          opacity: 1,
          life: 2.0, // Longer life
          targetLetterIndex,
        });
      }
  }, [typedText]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      // Clear canvas (context is already scaled in resize handler)
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Update and draw points
      const points = pointsRef.current;
      const fillAmount = stageProgress; // 0 to 1
      const pointDensity = stage === 'sparse' ? 0.3 : stage === 'lines' ? 0.7 : 1.0;
      const visiblePoints = Math.floor(points.length * pointDensity * fillAmount);

      // Update point positions (spring physics)
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        
        p.vx += dx * 0.05;
        p.vy += dy * 0.05;
        p.vx *= 0.9; // Damping
        p.vy *= 0.9;
        
        p.x += p.vx;
        p.y += p.vy;
      }

      // Draw connections (Stage B+)
      if (stage !== 'sparse') {
        ctx.strokeStyle = `rgba(71, 215, 255, ${0.08 * stageProgress})`;
        ctx.lineWidth = 0.5;
        
        for (let i = 0; i < visiblePoints; i++) {
          const p = points[i];
          for (const connIdx of p.connections) {
            if (connIdx < visiblePoints) {
              const conn = points[connIdx];
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(conn.x, conn.y);
              ctx.stroke();
            }
          }
        }
      }

      // Draw points
      for (let i = 0; i < visiblePoints; i++) {
        const p = points[i];
        const alpha = p.brightness * fillAmount;
        
        let color: string;
        if (p.color === 'cyan') {
          color = `rgba(71, 215, 255, ${alpha})`;
        } else if (p.color === 'violet') {
          color = `rgba(139, 92, 255, ${alpha})`;
        } else {
          color = `rgba(234, 240, 255, ${alpha})`;
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        const size = stage === 'dense' ? 2 : stage === 'lines' ? 1.5 : 1;
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.02;

        if (particle.life > 0) {
          const target = points[particle.targetPointIndex];
          const dx = target.x - particle.x;
          const dy = target.y - particle.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 5) {
            particle.vx += dx * 0.01;
            particle.vy += dy * 0.01;
          } else {
            particle.life = 0; // Absorbed
          }

          // Draw particle
          ctx.fillStyle = `rgba(71, 215, 255, ${particle.life * 0.6})`;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        return particle.life > 0;
      });

      // Update and draw floating captions
      floatingCaptionsRef.current = floatingCaptionsRef.current.filter(caption => {
        caption.x += caption.vx;
        caption.y += caption.vy;
        caption.life -= 0.01;
        caption.opacity = caption.life;

        // Drift toward target letter area
        if (points.length > 0) {
          const letterStartIndex = Math.floor((caption.targetLetterIndex / 6) * points.length);
          const target = points[Math.min(letterStartIndex, points.length - 1)];
          const dx = target.x - caption.x;
          const dy = target.y - caption.y;
          caption.vx += dx * 0.001;
          caption.vy += dy * 0.001;
        }

        if (caption.life > 0 && caption.opacity > 0) {
          // Draw caption
          ctx.font = '12px Inter, sans-serif';
          ctx.fillStyle = `rgba(71, 215, 255, ${caption.opacity * 0.8})`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(caption.text, caption.x, caption.y);
        }

        return caption.life > 0;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [stage, stageProgress, scrollProgress]);

  // Handle canvas resize and initialization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      
      // Regenerate points on resize (with delay to ensure canvas is ready)
      setTimeout(() => {
        pointsRef.current = generateLetterPoints('MEANING');
      }, 100);
    };

    // Initial resize
    const timeoutId = setTimeout(resize, 100);
    window.addEventListener('resize', resize);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', resize);
    };
  }, [generateLetterPoints]);

  // Handle keyboard input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && typedText.trim()) {
      onEnter();
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Canvas for kinetic typography */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: 'crisp-edges' }}
      />

      {/* Invisible input for typing */}
      <input
        ref={inputRef}
        type="text"
        value={typedText}
        onChange={(e) => onTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10"
        aria-label="Type to disturb the field"
        autoFocus
      />

      {/* Minimal copy overlay */}
      <div className="absolute bottom-8 left-8 z-20 pointer-events-none">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: isFocused ? 0.6 : 0.3 }}
          className="body text-sm text-[var(--text-muted)] mb-2"
        >
          Type to disturb the field.
        </motion.p>
        {typedText.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            className="label text-xs text-[var(--text-muted)]"
          >
            Press Enter to enter Studio
          </motion.p>
        )}
      </div>
    </div>
  );
}

