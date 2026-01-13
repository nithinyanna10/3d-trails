import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface SeamBridgeProps {
  typingPulse: number | null;
  typingSpeed: number;
}

export default function SeamBridge({ typingPulse, typingSpeed }: SeamBridgeProps) {
  const noiseRef = useRef<HTMLCanvasElement>(null);
  
  // Animated noise texture
  useEffect(() => {
    const canvas = noiseRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = 180;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    const animate = () => {
      const time = Date.now() * 0.001;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          const noise = Math.sin(x * 0.1 + time) * Math.cos(y * 0.1 + time * 0.5) * 0.5 + 0.5;
          const value = Math.floor(noise * 255);
          
          data[index] = value;
          data[index + 1] = value;
          data[index + 2] = value;
          data[index + 3] = Math.floor(noise * 15); // Very low opacity
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      requestAnimationFrame(animate);
    };
    
    animate();
  }, []);
  
  // Calculate pulse intensity based on typing
  const pulseIntensity = typingPulse 
    ? Math.max(0, 1 - (Date.now() - typingPulse) / 600) 
    : 0;
  const glowIntensity = 0.06 + (pulseIntensity * 0.12);
  const beamIntensity = pulseIntensity * typingSpeed;
  
  return (
    <>
      {/* Seam Bridge Overlay */}
      <motion.div
        className="fixed pointer-events-none"
        style={{
          right: '50%',
          top: 0,
          bottom: 0,
          width: '180px',
          marginRight: '-90px', // Center on split
          background: `linear-gradient(to right, 
            rgba(11, 18, 32, 0.4) 0%,
            rgba(71, 215, 255, ${glowIntensity}) 30%,
            rgba(139, 92, 255, ${glowIntensity * 0.7}) 50%,
            rgba(71, 215, 255, ${glowIntensity}) 70%,
            rgba(7, 10, 18, 0.4) 100%
          )`,
          filter: 'blur(20px)',
        }}
        animate={{
          opacity: [0.6, 0.8, 0.6],
        }}
        transition={{
          duration: 40,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Animated noise overlay */}
        <canvas
          ref={noiseRef}
          className="absolute inset-0 w-full h-full"
          style={{
            opacity: 0.03,
            mixBlendMode: 'overlay',
          }}
        />
      </motion.div>
      
      {/* Energy Beam - appears on typing */}
      {typingPulse && pulseIntensity > 0 && (
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ 
            opacity: Math.min(beamIntensity * 0.7, 0.6),
            scaleX: 1,
          }}
          exit={{ opacity: 0, scaleX: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed pointer-events-none z-30"
          style={{
            left: 'calc(15% + 230px)', // Center of input area
            top: 'calc(20vh + 320px)', // Approximate input position
            width: `${150 + typingSpeed * 10}px`,
            height: '1px',
            transformOrigin: 'left center',
            transform: 'rotate(-1.5deg)',
            background: `linear-gradient(to right, 
              rgba(71, 215, 255, ${Math.min(beamIntensity, 0.8)}) 0%,
              rgba(71, 215, 255, ${Math.min(beamIntensity * 0.5, 0.4)}) 60%,
              transparent 100%
            )`,
            filter: `blur(${0.5 + beamIntensity * 1.5}px)`,
            boxShadow: `0 0 ${8 + beamIntensity * 15}px rgba(71, 215, 255, ${beamIntensity * 0.3})`,
          }}
        />
      )}
    </>
  );
}

