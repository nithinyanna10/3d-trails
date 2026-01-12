import { useMemo } from "react";
import * as THREE from "three";
import { Point } from "../api";
import { getColor } from "../color";

interface ClusterZonesProps {
  points: Point[];
  visiblePoints: number;
  showClusterClouds: boolean;
}

export default function ClusterZones({ points, visiblePoints, showClusterClouds }: ClusterZonesProps) {
  // Group points by cluster
  const clusterGroups = useMemo(() => {
    const groups: { [key: number]: Point[] } = {};
    const visible = points.slice(0, visiblePoints);
    
    visible.forEach((point) => {
      if (!groups[point.cluster]) {
        groups[point.cluster] = [];
      }
      groups[point.cluster].push(point);
    });
    
    return groups;
  }, [points, visiblePoints]);
  
  // Create tight cluster clouds (nebula Points)
  const clusterClouds = useMemo(() => {
    if (!showClusterClouds) return null;
    
    const clouds: JSX.Element[] = [];
    const nClusters = Math.max(1, new Set(points.map((p) => p.cluster)).size);
    
    Object.entries(clusterGroups).forEach(([clusterId, clusterPoints]) => {
      if (clusterPoints.length < 2) return;
      
      const clusterNum = parseInt(clusterId);
      const positions = clusterPoints.map((p) => new THREE.Vector3(p.x, p.y, p.z));
      
      // Compute center as mean of cluster points
      const center = new THREE.Vector3();
      positions.forEach((pos) => center.add(pos));
      center.divideScalar(positions.length);
      
      // Compute distances from center to all cluster points
      const distances = positions.map((pos) => center.distanceTo(pos));
      distances.sort((a, b) => a - b);
      
      // Set radius r = 85th percentile distance, clamped to [0.6, 2.5]
      const percentile85 = Math.floor(distances.length * 0.85);
      let radius = distances[percentile85] || distances[distances.length - 1];
      radius = Math.max(0.6, Math.min(2.5, radius));
      
      // Create nebula Points cloud within radius
      const nParticles = Math.min(50, clusterPoints.length * 3);
      const particlePositions = new Float32Array(nParticles * 3);
      const particleColors = new Float32Array(nParticles * 3);
      
      const samplePoint = clusterPoints[0];
      const color = getColor(samplePoint.sentiment, clusterNum, nClusters);
      
      for (let i = 0; i < nParticles; i++) {
        // Random position within sphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.random() * radius;
        
        particlePositions[i * 3] = center.x + r * Math.sin(phi) * Math.cos(theta);
        particlePositions[i * 3 + 1] = center.y + r * Math.sin(phi) * Math.sin(theta);
        particlePositions[i * 3 + 2] = center.z + r * Math.cos(phi);
        
        // Color with slight variation
        particleColors[i * 3] = color.r * (0.8 + Math.random() * 0.2);
        particleColors[i * 3 + 1] = color.g * (0.8 + Math.random() * 0.2);
        particleColors[i * 3 + 2] = color.b * (0.8 + Math.random() * 0.2);
      }
      
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));
      
      clouds.push(
        <points key={`cluster-cloud-${clusterId}`} geometry={geometry}>
          <pointsMaterial
            size={0.08}
            vertexColors={true}
            transparent
            opacity={0.06}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      );
    });
    
    return clouds.length > 0 ? <group>{clouds}</group> : null;
  }, [clusterGroups, points, showClusterClouds]);
  
  if (!showClusterClouds) return null;
  
  return <>{clusterClouds}</>;
}
