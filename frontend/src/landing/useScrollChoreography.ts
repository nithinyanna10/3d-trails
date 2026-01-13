import { useState, useEffect, useRef } from 'react';

type ScrollSection = 'hero' | 'motion' | 'emotion' | 'constellations';

interface ScrollChoreography {
  section: ScrollSection;
  progress: number; // 0-1 for current section
  isSticky: boolean;
}

export function useScrollChoreography(): ScrollChoreography {
  const [section, setSection] = useState<ScrollSection>('hero');
  const [progress, setProgress] = useState(0);
  const [isSticky, setIsSticky] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const motionRef = useRef<HTMLDivElement>(null);
  const emotionRef = useRef<HTMLDivElement>(null);
  const constellationsRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      
      // Hero section (0 to 1vh)
      if (scrollY < windowHeight * 0.8) {
        setSection('hero');
        setProgress(scrollY / (windowHeight * 0.8));
        setIsSticky(false);
        return;
      }
      
      // Motion section (0.8vh to 1.8vh) - sticky canvas
      if (scrollY < windowHeight * 1.8) {
        setSection('motion');
        setProgress((scrollY - windowHeight * 0.8) / windowHeight);
        setIsSticky(true);
        return;
      }
      
      // Emotion section (1.8vh to 2.8vh) - sticky canvas
      if (scrollY < windowHeight * 2.8) {
        setSection('emotion');
        setProgress((scrollY - windowHeight * 1.8) / windowHeight);
        setIsSticky(true);
        return;
      }
      
      // Constellations section (2.8vh to 3.8vh) - sticky canvas
      if (scrollY < windowHeight * 3.8) {
        setSection('constellations');
        setProgress((scrollY - windowHeight * 2.8) / windowHeight);
        setIsSticky(true);
        return;
      }
      
      // Past all sections
      setSection('constellations');
      setProgress(1);
      setIsSticky(false);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return { section, progress, isSticky };
}

