import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface StarfieldProps {
  parallax?: { x: number; y: number };
}

export default function Starfield({ parallax = { x: 0, y: 0 } }: StarfieldProps) {
  const starsRef = useRef<THREE.Points>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  const stars = useMemo(() => {
    return Array.from({ length: 800 }).map(() => ({
      position: [
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200,
      ] as [number, number, number],
      size: Math.random() * 0.5 + 0.3,
    }));
  }, []);

  useFrame((state, delta) => {
    if (starsRef.current) {
      // Slow drift
      starsRef.current.rotation.y += 0.00005;
      starsRef.current.rotation.x += 0.00003;
    }
    
    if (groupRef.current) {
      // Parallax effect from mouse
      groupRef.current.position.x = parallax.x * 0.5;
      groupRef.current.position.y = parallax.y * 0.5;
    }
  });

  const positions = new Float32Array(stars.flatMap(s => s.position));
  const sizes = new Float32Array(stars.map(s => s.size));

  return (
    <group ref={groupRef}>
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={stars.length}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={stars.length}
            array={sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.5}
          color="#EAF0FF"
          opacity={0.4}
          transparent
          sizeAttenuation={false}
        />
      </points>
    </group>
  );
}

