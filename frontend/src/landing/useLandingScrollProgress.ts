import { useState, useEffect } from 'react';

interface ScrollProgress {
  progress: number; // 0 to 1
  stage: 'sparse' | 'lines' | 'dense';
  stageProgress: number; // 0 to 1 within current stage
}

export function useLandingScrollProgress(): ScrollProgress {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.querySelector('[data-hero-section]');
      if (!heroSection) {
        setProgress(0);
        return;
      }

      const rect = heroSection.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate progress: 0 when hero top is at viewport top, 1 when hero bottom is at viewport top
      const heroHeight = rect.height;
      const scrollStart = window.scrollY;
      const heroTop = heroSection.getBoundingClientRect().top + scrollStart;
      const scrollProgress = Math.max(0, Math.min(1, (scrollStart - heroTop + windowHeight) / heroHeight));
      
      setProgress(scrollProgress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Determine stage based on progress
  const stage: 'sparse' | 'lines' | 'dense' = 
    progress < 0.33 ? 'sparse' : 
    progress < 0.66 ? 'lines' : 
    'dense';

  // Calculate progress within current stage
  const stageProgress = 
    stage === 'sparse' ? progress / 0.33 :
    stage === 'lines' ? (progress - 0.33) / 0.33 :
    (progress - 0.66) / 0.34;

  return { progress, stage, stageProgress };
}

