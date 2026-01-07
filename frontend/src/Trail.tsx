import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { Point } from "./api";
import { getColor } from "./color";

interface TrailProps {
  points: Point[];
  animationProgress: number;
  speed: number;
  showAnchorLabels: boolean;
}

// Smooth easing function (ease-in-out cubic)
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function Trail({ points, animationProgress, speed, showAnchorLabels }: TrailProps) {
  const lineRef = useRef<THREE.Line>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  // Smooth interpolation of visible points with colors
  const { curve, colors, visibleFraction, visiblePoints } = useMemo(() => {
    if (points.length === 0) {
      return { curve: null, colors: [], visibleFraction: 0, visiblePoints: 0 };
    }
    
    // Apply smooth easing to progress
    const easedProgress = easeInOutCubic(animationProgress);
    
    // Calculate fractional visible points for smooth reveal
    const totalPoints = points.length;
    const visibleFloat = totalPoints * easedProgress;
    const visiblePoints = Math.max(1, Math.ceil(visibleFloat));
    const fractionalPart = visibleFloat - Math.floor(visibleFloat);
    
    if (visiblePoints < 2) {
      return {
        curve: null,
        colors: [],
        visibleFraction: easedProgress,
        visiblePoints: visiblePoints,
      };
    }
    
    // Get visible points
    const visible = points.slice(0, visiblePoints);
    
    // If we have a fractional part, interpolate the last point
    let positions: THREE.Vector3[];
    if (fractionalPart > 0.01 && visiblePoints < totalPoints) {
      const nextPoint = points[visiblePoints];
      const lastPoint = visible[visible.length - 1];
      const interpolated = new THREE.Vector3(
        lastPoint.x + (nextPoint.x - lastPoint.x) * fractionalPart,
        lastPoint.y + (nextPoint.y - lastPoint.y) * fractionalPart,
        lastPoint.z + (nextPoint.z - lastPoint.z) * fractionalPart
      );
      positions = [
        ...visible.slice(0, -1).map((p) => new THREE.Vector3(p.x, p.y, p.z)),
        interpolated,
      ];
    } else {
      positions = visible.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    }
    
    // Add extra control points at the beginning for smoother start
    if (positions.length >= 2) {
      const first = positions[0];
      const second = positions[1];
      const startControl = first.clone().sub(second.clone().sub(first).normalize().multiplyScalar(0.5));
      positions.unshift(startControl);
    }
    
    // Create CatmullRom curve with centripetal parameterization for smooth curves
    const curve = new THREE.CatmullRomCurve3(positions, false, "centripetal", 0.5);
    
    // Compute colors for each point based on sentiment and cluster
    const nClusters = Math.max(1, new Set(points.map((p) => p.cluster)).size);
    const colors = visible.map((p) => getColor(p.sentiment, p.cluster, nClusters));
    
    return { curve, colors, visibleFraction: easedProgress, visiblePoints };
  }, [points, animationProgress]);
  
  // Create smooth line geometry (not thick tube - more graph-like)
  const lineGeometry = useMemo(() => {
    if (!curve || points.length < 2) return null;
    
    // High resolution for smooth curves
    const segments = Math.max(300, points.length * 40);
    const points_array: THREE.Vector3[] = [];
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      points_array.push(curve.getPoint(t));
    }
    
    const positions = new Float32Array(points_array.length * 3);
    points_array.forEach((point, i) => {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
    });
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    
    // Create smooth color gradient along the line
    const colorArray = new Float32Array(points_array.length * 3);
    for (let i = 0; i < points_array.length; i++) {
      const t = i / (points_array.length - 1);
      const colorIndex = Math.floor(t * (colors.length - 1));
      const nextColorIndex = Math.min(colorIndex + 1, colors.length - 1);
      const localT = (t * (colors.length - 1)) - colorIndex;
      
      const color1 = colors[colorIndex] || colors[0];
      const color2 = colors[nextColorIndex] || colors[colors.length - 1];
      
      // Interpolate between colors
      const r = color1.r + (color2.r - color1.r) * localT;
      const g = color1.g + (color2.g - color1.g) * localT;
      const b = color1.b + (color2.b - color1.b) * localT;
      
      colorArray[i * 3] = r;
      colorArray[i * 3 + 1] = g;
      colorArray[i * 3 + 2] = b;
    }
    
    geometry.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));
    
    return geometry;
  }, [curve, colors, points.length]);
  
  // Track which text fragments we've already shown to avoid duplicates
  const shownTextFragments = useMemo(() => {
    const seen = new Set<string>();
    const result: { point: Point; idx: number }[] = [];
    
    points.slice(0, visiblePoints).forEach((point, idx) => {
      // Get the last word or unique part of the fragment
      const words = point.text_fragment.split(/\s+/);
      const lastWord = words[words.length - 1] || point.text_fragment;
      const key = lastWord.toLowerCase();
      
      // Only add if we haven't seen this word before
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ point, idx });
      }
    });
    
    return result;
  }, [points, visiblePoints]);
  
  if (points.length === 0) {
    return null;
  }
  
  if (points.length === 1) {
    // Render single point as glowing sphere
    const point = points[0];
    const nClusters = Math.max(1, new Set(points.map((p) => p.cluster)).size);
    const color = getColor(point.sentiment, point.cluster, nClusters);
    
    return (
      <mesh position={[point.x, point.y, point.z]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
        />
      </mesh>
    );
  }
  
  // Render smooth colored line (graph-like, not thick pipe)
  if (lineGeometry) {
    return (
      <group ref={groupRef}>
        {/* Smooth colored line - thin and elegant */}
        <line ref={lineRef} geometry={lineGeometry}>
          <lineBasicMaterial
            vertexColors={true}
            linewidth={2}
            transparent
            opacity={0.95}
          />
        </line>
        
        {/* Connected dots with word labels - each sphere represents a word/token */}
        {points.slice(0, visiblePoints).map((point, idx) => {
          const nClusters = Math.max(1, new Set(points.map((p) => p.cluster)).size);
          const color = getColor(point.sentiment, point.cluster, nClusters);
          const size = 0.1; // Visible size
          
          // Get the word to display - last word of the fragment
          const words = point.text_fragment.split(/\s+/);
          const displayWord = words.length > 1 
            ? words[words.length - 1] 
            : point.text_fragment;
          
          return (
            <group key={idx}>
              {/* Sphere */}
              <mesh position={[point.x, point.y, point.z]}>
                <sphereGeometry args={[size, 10, 10]} />
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={0.7}
                  transparent
                  opacity={0.8}
                />
              </mesh>
              
              {/* Word label on top of sphere */}
              <Text
                position={[point.x, point.y + 0.25, point.z]}
                fontSize={0.18}
                color={color.getHexString()}
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#000000"
              >
                {displayWord.length > 10
                  ? displayWord.substring(0, 10) + "..."
                  : displayWord}
              </Text>
            </group>
          );
        })}
      </group>
    );
  }
  
  return null;
}
