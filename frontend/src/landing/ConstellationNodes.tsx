import { useMemo } from 'react';
import * as THREE from 'three';

interface ConstellationNodesProps {
  visible: boolean;
  intensity: number;
}

export default function ConstellationNodes({ visible, intensity }: ConstellationNodesProps) {
  const nodes = useMemo(() => {
    const count = 12;
    const nodes: Array<{ position: THREE.Vector3; color: THREE.Color }> = [];
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 3 + Math.random() * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle * 0.7) * radius;
      const z = (Math.random() - 0.5) * 4;
      
      // Vary colors slightly
      const hue = 0.6 + Math.random() * 0.2; // Purple to cyan
      const color = new THREE.Color().setHSL(hue, 0.7, 0.6);
      
      nodes.push({
        position: new THREE.Vector3(x, y, z),
        color,
      });
    }
    
    return nodes;
  }, []);
  
  // Connection lines between nearby nodes
  const connections = useMemo(() => {
    const lines: Array<[THREE.Vector3, THREE.Vector3]> = [];
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = nodes[i].position.distanceTo(nodes[j].position);
        if (dist < 4) {
          lines.push([nodes[i].position, nodes[j].position]);
        }
      }
    }
    
    return lines;
  }, [nodes]);
  
  if (!visible) return null;
  
  return (
    <group>
      {/* Nodes */}
      {nodes.map((node, i) => (
        <mesh key={`node-${i}`} position={node.position}>
          <sphereGeometry args={[0.15 * intensity, 12, 12]} />
          <meshStandardMaterial
            color={node.color}
            emissive={node.color}
            emissiveIntensity={0.8 * intensity}
            transparent
            opacity={0.9 * intensity}
          />
        </mesh>
      ))}
      
      {/* Connection lines */}
      {connections.map(([start, end], i) => {
        const points = [start, end];
        const curve = new THREE.CatmullRomCurve3(points);
        const linePoints = curve.getPoints(20);
        const positions = new Float32Array(linePoints.length * 3);
        linePoints.forEach((pt, idx) => {
          positions[idx * 3] = pt.x;
          positions[idx * 3 + 1] = pt.y;
          positions[idx * 3 + 2] = pt.z;
        });
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        return (
          <line key={`conn-${i}`} geometry={geometry}>
            <lineBasicMaterial
              color="#8B5CFF"
              transparent
              opacity={0.2 * intensity}
            />
          </line>
        );
      })}
    </group>
  );
}

