import { useEffect, useRef, useCallback } from 'react';

interface AuroraMeshProps {
  typingPulse: number | null;
  mousePos: { x: number; y: number };
}

export default function AuroraMesh({ typingPulse, mousePos }: AuroraMeshProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const phaseRef = useRef(0);
  const parallaxLerpRef = useRef({ x: 0, y: 0 });
  const pulseOpacityRef = useRef(0);

  // Calculate pulse opacity
  useEffect(() => {
    if (typingPulse) {
      const elapsed = Date.now() - typingPulse;
      if (elapsed < 250) {
        pulseOpacityRef.current = 0.1 * (1 - elapsed / 250);
      } else {
        pulseOpacityRef.current = 0;
      }
    } else {
      pulseOpacityRef.current = 0;
    }
  }, [typingPulse]);

  // Parallax will be calculated in the animation loop

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Update phase (slow drift)
      phaseRef.current += 0.002; // Very slow animation
      
      // Base opacity with pulse
      const baseOpacity = 0.12;
      const opacity = Math.min(baseOpacity + pulseOpacityRef.current, 0.18);
      
      // Smooth parallax lerp
      const targetX = mousePos.x * 8; // Max 8px
      const targetY = mousePos.y * 8;
      parallaxLerpRef.current.x += (targetX - parallaxLerpRef.current.x) * 0.08;
      parallaxLerpRef.current.y += (targetY - parallaxLerpRef.current.y) * 0.08;
      
      // Parallax offset
      const parallaxX = parallaxLerpRef.current.x;
      const parallaxY = parallaxLerpRef.current.y;
      
      // Draw layered sine wave ribbons
      const numLayers = 4;
      const waveAmplitude = height * 0.15;
      const waveFrequency = 0.003;
      
      for (let layer = 0; layer < numLayers; layer++) {
        const layerPhase = phaseRef.current + layer * 0.5;
        const layerOffset = (layer / numLayers) * height * 0.3;
        const layerAmplitude = waveAmplitude * (0.7 + layer * 0.1);
        
        // Gradient from cyan to violet
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        const hue1 = 180 + (layer * 20); // Cyan to violet
        const hue2 = 180 + (layer * 20) + 30;
        gradient.addColorStop(0, `hsla(${hue1}, 70%, 60%, ${opacity * (0.6 + layer * 0.1)})`);
        gradient.addColorStop(0.5, `hsla(${hue1 + 15}, 70%, 60%, ${opacity * (0.7 + layer * 0.1)})`);
        gradient.addColorStop(1, `hsla(${hue2}, 70%, 60%, ${opacity * (0.6 + layer * 0.1)})`);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 20;
        ctx.shadowColor = `rgba(71, 215, 255, ${opacity * 0.3})`;
        
        // Draw wavy path
        ctx.beginPath();
        const points = 200;
        
        for (let i = 0; i <= points; i++) {
          const x = (i / points) * width;
          const y = height * 0.5 + layerOffset + 
                   Math.sin(x * waveFrequency + layerPhase) * layerAmplitude +
                   Math.cos(x * waveFrequency * 0.7 + layerPhase * 1.3) * (layerAmplitude * 0.5) +
                   parallaxY * 0.3;
          
          if (i === 0) {
            ctx.moveTo(x + parallaxX * 0.2, y);
          } else {
            ctx.lineTo(x + parallaxX * 0.2, y);
          }
        }
        
        ctx.stroke();
      }
      
      // Draw subtle mesh grid overlay (optional, very faint)
      ctx.strokeStyle = `rgba(71, 215, 255, ${opacity * 0.15})`;
      ctx.lineWidth = 0.5;
      ctx.shadowBlur = 0;
      
      const gridSize = 80;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x + parallaxX * 0.1, 0);
        ctx.lineTo(x + parallaxX * 0.1, height);
        ctx.stroke();
      }
      
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y + parallaxY * 0.1);
        ctx.lineTo(width, y + parallaxY * 0.1);
        ctx.stroke();
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mousePos, typingPulse]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        mixBlendMode: 'screen',
      }}
    />
  );
}

