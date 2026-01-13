import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import { Suspense, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import Starfield from './Starfield';
import RibbonTrail from './RibbonTrail';
import TypingParticles from './TypingParticles';
import ConstellationNodes from './ConstellationNodes';

interface LandingSceneProps {
  typedText: string;
  typingSpeed: number;
  scrollSection: 'motion' | 'emotion' | 'constellations' | 'hero';
  cameraPush: boolean;
  onCameraPushComplete?: () => void;
  parallax?: { x: number; y: number };
}

// Camera controller with drift and push-in
function CameraController({ 
  push, 
  onComplete 
}: { 
  push: boolean; 
  onComplete?: () => void;
}) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const controlsRef = useRef<any>(null);
  const pushProgressRef = useRef(0);
  const initialPositionRef = useRef<THREE.Vector3 | null>(null);
  const targetPositionRef = useRef<THREE.Vector3 | null>(null);

  useFrame((state, delta) => {
    if (!cameraRef.current) return;

    // Initialize positions
    if (initialPositionRef.current === null) {
      initialPositionRef.current = cameraRef.current.position.clone();
      targetPositionRef.current = new THREE.Vector3(0, 0, 3);
    }

    // Gentle drift when not pushing
    if (!push) {
      const time = state.clock.elapsedTime;
      cameraRef.current.position.x += Math.sin(time * 0.1) * 0.01;
      cameraRef.current.position.y += Math.cos(time * 0.15) * 0.01;
      
      // Reset push progress
      pushProgressRef.current = 0;
    } else {
      // Camera push-in animation
      pushProgressRef.current = Math.min(1, pushProgressRef.current + delta * 0.8);
      
      if (initialPositionRef.current && targetPositionRef.current) {
        const eased = 1 - Math.pow(1 - pushProgressRef.current, 3); // Ease out cubic
        cameraRef.current.position.lerpVectors(
          initialPositionRef.current,
          targetPositionRef.current,
          eased
        );
      }

      if (pushProgressRef.current >= 1 && onComplete) {
        onComplete();
      }
    }
  });

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={[0, 0, 8]}
        fov={50}
      />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={false}
        enableRotate={false}
        autoRotate={false}
      />
    </>
  );
}

export default function LandingScene({
  typedText,
  typingSpeed,
  scrollSection,
  cameraPush,
  onCameraPushComplete,
  parallax = { x: 0, y: 0 },
}: LandingSceneProps) {
  // Calculate approximate sentiment from text length and keywords
  const sentiment = useMemo(() => {
    if (!typedText) return 0;
    const text = typedText.toLowerCase();
    const positiveWords = ['good', 'great', 'happy', 'love', 'amazing', 'wonderful', 'beautiful'];
    const negativeWords = ['bad', 'sad', 'hate', 'terrible', 'awful', 'horrible', 'angry'];
    
    let score = 0;
    positiveWords.forEach(word => {
      if (text.includes(word)) score += 0.2;
    });
    negativeWords.forEach(word => {
      if (text.includes(word)) score -= 0.2;
    });
    
    // Normalize by length
    return Math.max(-1, Math.min(1, score + (typedText.length / 100) * 0.1));
  }, [typedText]);

  return (
    <Canvas
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
    >
      <CameraController push={cameraPush} onComplete={onCameraPushComplete} />
      
      {/* Premium Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      <pointLight position={[-10, -10, -10]} intensity={0.3} />
      <directionalLight position={[0, 10, 5]} intensity={0.2} />
      
      {/* Atmospheric Fog */}
      <fog attach="fog" args={['#070A12', 8, 40]} />
      
      <Suspense fallback={null}>
        {/* Starfield with parallax */}
        <Starfield parallax={parallax} />
        
        {/* Ribbon Trail - grows as user types */}
        <RibbonTrail 
          text={typedText}
          typingSpeed={typingSpeed}
          sentiment={sentiment}
          visible={scrollSection === 'motion' || scrollSection === 'hero' || scrollSection === 'emotion'}
        />
        
        {/* Typing Particles - emit on input */}
        <TypingParticles 
          text={typedText}
          typingSpeed={typingSpeed}
          visible={scrollSection === 'hero' || scrollSection === 'motion'}
        />
        
        {/* Constellation Nodes - appear in section C */}
        <ConstellationNodes 
          visible={scrollSection === 'constellations' || scrollSection === 'emotion'}
          intensity={scrollSection === 'constellations' ? 1 : scrollSection === 'emotion' ? 0.3 : 0}
        />
      </Suspense>
      
      {/* Premium Post-processing */}
      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.4}
          luminanceSmoothing={0.9}
          height={300}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.3} />
      </EffectComposer>
    </Canvas>
  );
}

