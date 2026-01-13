import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import FloatingNav from '../components/FloatingNav';
import LandingScene from '../landing/LandingScene';
import { useScrollChoreography } from '../landing/useScrollChoreography';
import ConstellationMark from '../components/ConstellationMark';
import SeamBridge from '../components/SeamBridge';
import AuroraMesh from '../landing/AuroraMesh';
import { Sparkles } from 'lucide-react';

export default function Landing() {
  const [typedText, setTypedText] = useState('');
  const [typingSpeed, setTypingSpeed] = useState(0);
  const [typingPulse, setTypingPulse] = useState<number | null>(null);
  const [cameraPush, setCameraPush] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dustParallax, setDustParallax] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastTypingTimeRef = useRef(Date.now());
  const parallaxLerpRef = useRef({ x: 0, y: 0 });
  
  const { section, progress, isSticky } = useScrollChoreography();
  
  // Mouse parallax with smooth lerp (only for dust layer)
  useEffect(() => {
    let targetX = 0;
    let targetY = 0;
    
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
      targetX = x * 8; // Max 8px
      targetY = y * 8;
    };
    
    // Smooth lerp for dust parallax
    const lerpParallax = () => {
      parallaxLerpRef.current.x += (targetX - parallaxLerpRef.current.x) * 0.08;
      parallaxLerpRef.current.y += (targetY - parallaxLerpRef.current.y) * 0.08;
      
      setDustParallax({
        x: parallaxLerpRef.current.x,
        y: parallaxLerpRef.current.y,
      });
      
      requestAnimationFrame(lerpParallax);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    lerpParallax();
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  // Handle typing
  const handleTextChange = (newText: string) => {
    setTypedText(newText);
    
    // Calculate typing speed
    const now = Date.now();
    const timeDelta = now - lastTypingTimeRef.current;
    const speed = timeDelta > 0 ? 1000 / timeDelta : 0;
    setTypingSpeed(Math.min(speed, 10)); // Cap at 10
    lastTypingTimeRef.current = now;
    
    // Trigger typing pulse
    setTypingPulse(now);
  };
  
  // Handle Enter - navigate to studio
  const handleEnter = () => {
    if (typedText.trim()) {
      navigate('/studio', { state: { initialText: typedText } });
    }
  };
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Base Gradient Background */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(160deg, #0B1220 0%, #070A12 55%, #0B1220 100%)',
        }}
      />
      
      {/* Radial Blooms - Cyan behind text block */}
      <div
        className="fixed pointer-events-none"
        style={{
          left: '15%',
          top: '35%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(71, 215, 255, 0.10) 0%, transparent 70%)',
          filter: 'blur(80px)',
          opacity: 0.10,
          animation: 'drift 45s ease-in-out infinite',
        }}
      />
      
      {/* Radial Blooms - Violet near seam */}
      <div
        className="fixed pointer-events-none"
        style={{
          right: '50%',
          top: '50%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(139, 92, 255, 0.08) 0%, transparent 70%)',
          filter: 'blur(100px)',
          opacity: 0.08,
          animation: 'drift 60s ease-in-out infinite',
          animationDelay: '10s',
        }}
      />
      
      {/* Noise Overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          opacity: 0.08,
          mixBlendMode: 'overlay',
        }}
      />
      
      {/* Art-Directed Dust Layer with Parallax */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          transform: `translate(${dustParallax.x}px, ${dustParallax.y}px)`,
          transition: 'none',
        }}
      >
        {/* Sparse dust particles - reduced density, very subtle */}
        {Array.from({ length: 12 }).map((_, i) => {
          // Intentional placement - avoid clustering
          const positions = [
            { left: '18%', top: '25%' },
            { left: '22%', top: '45%' },
            { left: '15%', top: '65%' },
            { left: '25%', top: '35%' },
            { left: '20%', top: '55%' },
            { left: '18%', top: '75%' },
            { left: '12%', top: '30%' },
            { left: '28%', top: '50%' },
            { left: '16%', top: '40%' },
            { left: '24%', top: '60%' },
            { left: '14%', top: '70%' },
            { left: '26%', top: '45%' },
          ];
          const pos = positions[i] || { left: `${15 + Math.random() * 15}%`, top: `${20 + Math.random() * 60}%` };
          
          return (
            <div
              key={`dust-${i}`}
              className="absolute rounded-full"
              style={{
                ...pos,
                width: '0.5px',
                height: '0.5px',
                background: 'rgba(234, 240, 255, 0.08)',
                opacity: 0.05 + Math.random() * 0.05,
              }}
            />
          );
        })}
        
        {/* Constellation Cluster 1 - Near headline */}
        <div
          className="absolute"
          style={{
            left: '14%',
            top: '22%',
          }}
        >
          <svg width="50" height="25" viewBox="0 0 50 25" opacity="0.3">
            <line x1="5" y1="12" x2="18" y2="8" stroke="rgba(71, 215, 255, 0.25)" strokeWidth="0.5" />
            <line x1="18" y1="8" x2="30" y2="14" stroke="rgba(71, 215, 255, 0.25)" strokeWidth="0.5" />
            <line x1="30" y1="14" x2="42" y2="10" stroke="rgba(71, 215, 255, 0.25)" strokeWidth="0.5" />
            <line x1="18" y1="8" x2="25" y2="18" stroke="rgba(71, 215, 255, 0.2)" strokeWidth="0.5" />
            <circle cx="5" cy="12" r="1.2" fill="rgba(71, 215, 255, 0.35)" />
            <circle cx="18" cy="8" r="1.2" fill="rgba(71, 215, 255, 0.35)" />
            <circle cx="30" cy="14" r="1.2" fill="rgba(71, 215, 255, 0.35)" />
            <circle cx="42" cy="10" r="1.2" fill="rgba(71, 215, 255, 0.35)" />
            <circle cx="25" cy="18" r="1" fill="rgba(71, 215, 255, 0.3)" />
          </svg>
        </div>
        
        {/* Constellation Cluster 2 - Near input area */}
        <div
          className="absolute"
          style={{
            left: '16%',
            top: '68%',
          }}
        >
          <svg width="45" height="22" viewBox="0 0 45 22" opacity="0.25">
            <line x1="4" y1="11" x2="16" y2="6" stroke="rgba(139, 92, 255, 0.25)" strokeWidth="0.5" />
            <line x1="16" y1="6" x2="28" y2="12" stroke="rgba(139, 92, 255, 0.25)" strokeWidth="0.5" />
            <line x1="28" y1="12" x2="38" y2="8" stroke="rgba(139, 92, 255, 0.25)" strokeWidth="0.5" />
            <line x1="16" y1="6" x2="22" y2="16" stroke="rgba(139, 92, 255, 0.2)" strokeWidth="0.5" />
            <circle cx="4" cy="11" r="1" fill="rgba(139, 92, 255, 0.3)" />
            <circle cx="16" cy="6" r="1" fill="rgba(139, 92, 255, 0.3)" />
            <circle cx="28" cy="12" r="1" fill="rgba(139, 92, 255, 0.3)" />
            <circle cx="38" cy="8" r="1" fill="rgba(139, 92, 255, 0.3)" />
            <circle cx="22" cy="16" r="0.8" fill="rgba(139, 92, 255, 0.25)" />
          </svg>
        </div>
      </div>
      
      {/* Living Seam Bridge */}
      <SeamBridge typingPulse={typingPulse} typingSpeed={typingSpeed} />
      
      
      {/* Left Side Vignette */}
      <div
        className="fixed pointer-events-none"
        style={{
          left: 0,
          top: 0,
          bottom: 0,
          width: '50%',
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(7, 10, 18, 0.3) 100%)',
          opacity: 0.3,
        }}
      />
      
      <FloatingNav />
      
      {/* Hero Section - Asymmetric Layout */}
      <section 
        ref={heroRef}
        data-hero-section
        className="relative min-h-screen flex items-start px-6 md:px-12 pt-20"
      >
        <div className="max-w-[var(--max-content-width)] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column - Minimal Premium Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative z-10 max-w-[460px] pt-[20vh]"
          >
            {/* Aurora Mesh Background */}
            <div className="absolute inset-0 -left-8 -right-8 overflow-hidden">
              <AuroraMesh typingPulse={typingPulse} mousePos={mousePos} />
              
              {/* Soft vignette on left for text readability */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at left center, rgba(7, 10, 18, 0.4) 0%, transparent 60%)',
                }}
              />
            </div>

            {/* Vertical guide line */}
            <div className="absolute left-0 top-[20vh] w-[1px] h-[25vh] bg-gradient-to-b from-[var(--accent-cyan)]/30 via-[var(--accent-cyan)]/10 to-transparent z-10" />

            {/* Constellation mark */}
            <div className="relative pl-8 z-10">
              <ConstellationMark />
            </div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="h1 mb-6 text-[var(--text-primary)] pl-8 relative z-10"
            >
              Cast language into space.
            </motion.h1>

            {/* Body text */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="body text-lg text-[var(--text-secondary)] space-y-4 mb-10 pl-8 relative z-10"
            >
              <p>We translate your words into motion — a living 3D trail.</p>
              <p>Shaped by meaning, mood, and topic as it unfolds.</p>
              <p>Start typing. Press Enter to step inside.</p>
            </motion.div>

            {/* Input field */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="relative pl-8 z-10"
            >
              <div className="relative group">
                {/* Icon */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none z-10">
                  <Sparkles size={16} />
                </div>
                
                {/* Input */}
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && typedText.trim()) {
                      handleEnter();
                    }
                  }}
                  placeholder="Type a feeling, a memory, or a scene…"
                  className="w-full pl-12 pr-4 py-[14px] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] rounded-[18px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-[var(--accent-cyan)] transition-all group-hover:border-[var(--accent-cyan)]/50 group-hover:shadow-[0_0_20px_rgba(71,215,255,0.15)]"
                  style={{
                    boxShadow: '0 0 0 0 rgba(139, 92, 255, 0)',
                  }}
                  onFocus={(e) => {
                    e.target.style.boxShadow = '0 0 0 2px rgba(71, 215, 255, 0.3), 0 0 40px rgba(139, 92, 255, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.boxShadow = '0 0 0 0 rgba(139, 92, 255, 0)';
                  }}
                />
              </div>

              {/* Hint text below input */}
              <div className="flex items-center gap-4 mt-3 pl-12">
                <span className="label text-xs text-[var(--text-muted)]">
                  Enter → Open Studio
                </span>
                <span className="label text-xs text-[var(--text-muted)] opacity-60">
                  ⌘ Enter
                </span>
              </div>
            </motion.div>
          </motion.div>
          
          {/* Right Side - Full-bleed 3D Canvas */}
          <div 
            ref={canvasRef}
            className="relative w-full h-[500px] md:h-[600px] lg:h-screen lg:absolute lg:right-0 lg:top-0 lg:w-1/2"
          >
            <LandingScene
              typedText={typedText}
              typingSpeed={typingSpeed}
              scrollSection={section}
              cameraPush={cameraPush}
              parallax={mousePos}
              onCameraPushComplete={() => {
                // Camera push complete
              }}
            />
          </div>
        </div>
        
      </section>
      
      {/* Footer */}
      <footer className="relative z-10 py-12 px-4 text-center">
        <div className="max-w-[var(--max-content-width)] mx-auto">
          <div className="flex justify-center gap-6 mb-4">
            <Link to="/studio" className="label text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Studio</Link>
            <Link to="/presets" className="label text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Presets</Link>
            <Link to="/export" className="label text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Export</Link>
          </div>
          <p className="body text-[var(--text-muted)]">© 2024 Trails</p>
        </div>
      </footer>
    </div>
  );
}
