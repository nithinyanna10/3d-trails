import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { Anchor } from "../api";

interface ParticlesProps {
  anchors: Anchor[];
  nParticles: number;
  showAnchorLabels: boolean;
}

export default function Particles({
  anchors,
  nParticles,
  showAnchorLabels,
}: ParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const positionsRef = useRef<Float32Array | null>(null);
  const velocitiesRef = useRef<Float32Array | null>(null);
  const colorsRef = useRef<Float32Array | null>(null);
  
  // Initialize particles
  const { positions, velocities, colors, geometry } = useMemo(() => {
    const positions = new Float32Array(nParticles * 3);
    const velocities = new Float32Array(nParticles * 3);
    const colors = new Float32Array(nParticles * 3);
    
    // Random initial positions in [-5, 5] cube
    for (let i = 0; i < nParticles; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      
      // Random initial velocities
      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
      
      // Lower brightness colors (more subtle)
      colors[i * 3] = 0.2 + Math.random() * 0.2;
      colors[i * 3 + 1] = 0.2 + Math.random() * 0.2;
      colors[i * 3 + 2] = 0.3 + Math.random() * 0.3;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    
    return { positions, velocities, colors, geometry };
  }, [nParticles]);
  
  positionsRef.current = positions;
  velocitiesRef.current = velocities;
  colorsRef.current = colors;
  
  // Anchor positions
  const anchorPositions = useMemo(() => {
    return anchors.map((a) => new THREE.Vector3(a.x, a.y, a.z));
  }, [anchors]);
  
  // Animation loop
  useFrame((state, delta) => {
    if (!pointsRef.current || !positionsRef.current || !velocitiesRef.current) return;
    
    const positions = positionsRef.current;
    const velocities = velocitiesRef.current;
    const time = state.clock.elapsedTime;
    
    // Update each particle
    for (let i = 0; i < nParticles; i++) {
      const idx = i * 3;
      const pos = new THREE.Vector3(
        positions[idx],
        positions[idx + 1],
        positions[idx + 2]
      );
      
      // Find nearest anchor
      let nearestAnchor = anchorPositions[0];
      let minDist = Infinity;
      
      if (anchorPositions.length > 0) {
        anchorPositions.forEach((anchor) => {
          const dist = pos.distanceTo(anchor);
          if (dist < minDist) {
            minDist = dist;
            nearestAnchor = anchor;
          }
        });
      }
      
      // Attraction force toward nearest anchor
      const attractionStrength = 0.1;
      const eps = 0.1;
      const dist = Math.max(eps, minDist);
      const force = attractionStrength / (dist * dist + eps);
      
      const direction = new THREE.Vector3()
        .subVectors(nearestAnchor, pos)
        .normalize();
      
      // Apply attraction
      velocities[idx] += direction.x * force * delta * 10;
      velocities[idx + 1] += direction.y * force * delta * 10;
      velocities[idx + 2] += direction.z * force * delta * 10;
      
      // Add curl noise / swirl
      const swirlStrength = 0.02;
      const swirlFreq = 0.5;
      velocities[idx] +=
        Math.sin(time * swirlFreq + pos.y * 0.5) * swirlStrength * delta * 10;
      velocities[idx + 1] +=
        Math.cos(time * swirlFreq + pos.z * 0.5) * swirlStrength * delta * 10;
      velocities[idx + 2] +=
        Math.sin(time * swirlFreq + pos.x * 0.5) * swirlStrength * delta * 10;
      
      // Damping
      const damping = 0.95;
      velocities[idx] *= damping;
      velocities[idx + 1] *= damping;
      velocities[idx + 2] *= damping;
      
      // Update position
      positions[idx] += velocities[idx];
      positions[idx + 1] += velocities[idx + 1];
      positions[idx + 2] += velocities[idx + 2];
      
      // Wrap around edges (soft boundary)
      const boundary = 6;
      if (Math.abs(positions[idx]) > boundary) {
        positions[idx] = -Math.sign(positions[idx]) * boundary;
        velocities[idx] *= -0.5;
      }
      if (Math.abs(positions[idx + 1]) > boundary) {
        positions[idx + 1] = -Math.sign(positions[idx + 1]) * boundary;
        velocities[idx + 1] *= -0.5;
      }
      if (Math.abs(positions[idx + 2]) > boundary) {
        positions[idx + 2] = -Math.sign(positions[idx + 2]) * boundary;
        velocities[idx + 2] *= -0.5;
      }
    }
    
    // Update geometry
    const geometry = pointsRef.current.geometry;
    const positionAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
    positionAttr.needsUpdate = true;
  });
  
  if (anchors.length === 0) {
    return null;
  }
  
  return (
    <>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          size={0.02}
          vertexColors={true}
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      
      {/* Render anchor labels */}
      {showAnchorLabels &&
        anchors.map((anchor, idx) => (
          <Text
            key={idx}
            position={[anchor.x, anchor.y + 0.5, anchor.z]}
            fontSize={0.3}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {anchor.label}
          </Text>
        ))}
    </>
  );
}

