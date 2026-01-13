import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TypingParticlesProps {
  text: string;
  typingSpeed: number;
  visible: boolean;
}

export default function TypingParticles({ text, typingSpeed, visible }: TypingParticlesProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const positionsRef = useRef<Float32Array | null>(null);
  const velocitiesRef = useRef<Float32Array | null>(null);
  const colorsRef = useRef<Float32Array | null>(null);
  const lifetimesRef = useRef<Float32Array | null>(null);
  const lastTextLengthRef = useRef(0);
  
  const nParticles = 200;
  
  // Initialize particles
  const { positions, velocities, colors, lifetimes, geometry } = useMemo(() => {
    const positions = new Float32Array(nParticles * 3);
    const velocities = new Float32Array(nParticles * 3);
    const colors = new Float32Array(nParticles * 3);
    const lifetimes = new Float32Array(nParticles);
    
    // Start all particles as inactive
    for (let i = 0; i < nParticles; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      velocities[i * 3] = 0;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = 0;
      colors[i * 3] = 0.3;
      colors[i * 3 + 1] = 0.8;
      colors[i * 3 + 2] = 1.0;
      lifetimes[i] = 0; // 0 = inactive
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    return { positions, velocities, colors, lifetimes, geometry };
  }, [nParticles]);
  
  positionsRef.current = positions;
  velocitiesRef.current = velocities;
  colorsRef.current = colors;
  lifetimesRef.current = lifetimes;
  
  // Emit particles when text changes
  useEffect(() => {
    if (!visible || text.length <= lastTextLengthRef.current) return;
    
    const newChars = text.length - lastTextLengthRef.current;
    const emitCount = Math.min(newChars * 3, nParticles);
    
    // Find inactive particles and activate them
    let emitted = 0;
    for (let i = 0; i < nParticles && emitted < emitCount; i++) {
      if (lifetimesRef.current![i] <= 0) {
        // Emit from random position near origin
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 2;
        positionsRef.current![i * 3] = Math.cos(angle) * radius;
        positionsRef.current![i * 3 + 1] = Math.sin(angle) * radius;
        positionsRef.current![i * 3 + 2] = (Math.random() - 0.5) * 2;
        
        // Random velocity
        velocitiesRef.current![i * 3] = (Math.random() - 0.5) * 0.1;
        velocitiesRef.current![i * 3 + 1] = (Math.random() - 0.5) * 0.1;
        velocitiesRef.current![i * 3 + 2] = (Math.random() - 0.5) * 0.1;
        
        // Set lifetime
        lifetimesRef.current![i] = 2.0; // 2 seconds
        
        emitted++;
      }
    }
    
    lastTextLengthRef.current = text.length;
  }, [text, visible, nParticles]);
  
  useFrame((state, delta) => {
    if (!particlesRef.current || !visible) return;
    
    // Update particles
    for (let i = 0; i < nParticles; i++) {
      if (lifetimesRef.current![i] > 0) {
        // Update position
        positionsRef.current![i * 3] += velocitiesRef.current![i * 3];
        positionsRef.current![i * 3 + 1] += velocitiesRef.current![i * 3 + 1];
        positionsRef.current![i * 3 + 2] += velocitiesRef.current![i * 3 + 2];
        
        // Apply damping
        velocitiesRef.current![i * 3] *= 0.98;
        velocitiesRef.current![i * 3 + 1] *= 0.98;
        velocitiesRef.current![i * 3 + 2] *= 0.98;
        
        // Update lifetime and fade
        lifetimesRef.current![i] -= delta;
        const alpha = Math.max(0, lifetimesRef.current![i] / 2.0);
        colorsRef.current![i * 3] = 0.3 * alpha;
        colorsRef.current![i * 3 + 1] = 0.8 * alpha;
        colorsRef.current![i * 3 + 2] = 1.0 * alpha;
        
        // Reset if dead
        if (lifetimesRef.current![i] <= 0) {
          positionsRef.current![i * 3] = 0;
          positionsRef.current![i * 3 + 1] = 0;
          positionsRef.current![i * 3 + 2] = 0;
        }
      }
    }
    
    // Update geometry
    const geometry = particlesRef.current.geometry;
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });
  
  if (!visible) return null;
  
  return (
    <points ref={particlesRef} geometry={geometry}>
      <pointsMaterial
        size={0.15}
        vertexColors={true}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

