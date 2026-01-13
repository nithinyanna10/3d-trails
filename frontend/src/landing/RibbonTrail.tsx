import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface RibbonTrailProps {
  text: string;
  typingSpeed: number;
  sentiment: number;
  visible: boolean;
}

export default function RibbonTrail({ text, typingSpeed, sentiment, visible }: RibbonTrailProps) {
  const trailRef = useRef<THREE.Line>(null);
  const glowRef = useRef<THREE.Line>(null);
  
  // Generate trail points based on text length and typing speed
  const { curve, color } = useMemo(() => {
    if (!text || text.length === 0) {
      return { curve: null, color: new THREE.Color('#47D7FF') };
    }
    
    const numPoints = Math.min(text.length * 2, 100);
    const points: THREE.Vector3[] = [];
    
    for (let i = 0; i < numPoints; i++) {
      const t = i / numPoints;
      const angle = t * Math.PI * 4;
      const radius = 2 + t * 1.5;
      const x = Math.sin(angle) * radius;
      const y = Math.cos(angle * 0.7) * radius * 0.8;
      const z = t * 6 - 3;
      
      // Add variation based on typing speed
      const speedVariation = Math.sin(t * typingSpeed * 10) * 0.3;
      points.push(new THREE.Vector3(x + speedVariation, y, z));
    }
    
    if (points.length < 2) {
      return { curve: null, color: new THREE.Color('#47D7FF') };
    }
    
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
    
    // Color based on sentiment
    const hue = sentiment > 0 ? 0.5 : 0.7; // Cyan to blue
    const saturation = 0.8;
    const lightness = 0.6 + sentiment * 0.2;
    const color = new THREE.Color().setHSL(hue, saturation, lightness);
    
    return { curve, color };
  }, [text, typingSpeed, sentiment]);
  
  const linePoints = useMemo(() => {
    if (!curve) return null;
    return curve.getPoints(300);
  }, [curve]);
  
  const lineGeometry = useMemo(() => {
    if (!linePoints || linePoints.length < 2) return null;
    
    const positions = new Float32Array(linePoints.length * 3);
    linePoints.forEach((pt, i) => {
      positions[i * 3] = pt.x;
      positions[i * 3 + 1] = pt.y;
      positions[i * 3 + 2] = pt.z;
    });
    
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geom;
  }, [linePoints]);
  
  useFrame(() => {
    if (trailRef.current && visible) {
      trailRef.current.material.opacity = Math.min(1, text.length / 20);
    }
  });
  
  if (!lineGeometry || !visible) return null;
  
  return (
    <>
      {/* Glow pass */}
      <line ref={glowRef} geometry={lineGeometry}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={0.2}
        />
      </line>
      {/* Main trail */}
      <line ref={trailRef} geometry={lineGeometry}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={0.9}
        />
      </line>
    </>
  );
}

