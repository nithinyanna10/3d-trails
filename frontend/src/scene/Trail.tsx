import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { Point } from "../api";
import { getColor } from "../color";

interface TrailProps {
  points: Point[];
  animationProgress: number;
  revealIndex: number;
  speed: number;
  showAnchorLabels: boolean;
}

// Smooth easing function
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Resample curve by arc-length for smooth motion
function resampleByArcLength(curve: THREE.CatmullRomCurve3, targetSegments: number): THREE.Vector3[] {
  const totalLength = curve.getLength();
  const segmentLength = totalLength / targetSegments;
  const points: THREE.Vector3[] = [];
  
  for (let i = 0; i <= targetSegments; i++) {
    const distance = i * segmentLength;
    const t = curve.getUtoTmapping(0, distance / totalLength);
    points.push(curve.getPoint(t));
  }
  
  return points;
}

export default function Trail({ points, animationProgress, revealIndex, speed, showAnchorLabels }: TrailProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  
  // Use revealIndex if provided and valid, otherwise use animationProgress
  // Ensure at least 1 point is visible
  const effectiveRevealIndex = points.length > 0 
    ? (revealIndex > 0 && revealIndex <= points.length 
        ? Math.max(1, revealIndex) 
        : Math.max(1, Math.ceil(points.length * animationProgress)))
    : 0;
  const effectiveProgress = points.length > 0 
    ? effectiveRevealIndex / points.length 
    : 0;
  
  // Smooth interpolation with arc-length resampling
  const { curve, colors, visiblePoints, smoothedPositions } = useMemo(() => {
    if (points.length === 0) {
      return { curve: null, colors: [], visibleFraction: 0, visiblePoints: 0, smoothedPositions: [] };
    }
    
    const easedProgress = easeInOutCubic(effectiveProgress);
    const totalPoints = points.length;
    const visibleFloat = totalPoints * easedProgress;
    const visiblePoints = Math.max(1, Math.ceil(visibleFloat));
    const fractionalPart = visibleFloat - Math.floor(visibleFloat);
    
    // Always create a curve if we have at least 2 points
    if (visiblePoints < 2 && totalPoints >= 2) {
      // Use first 2 points to create a minimal curve
      const minimalPositions = points.slice(0, 2).map((p) => new THREE.Vector3(p.x, p.y, p.z));
      const minimalCurve = new THREE.CatmullRomCurve3(minimalPositions, false, "centripetal", 0.5);
      const nClusters = Math.max(1, new Set(points.map((p) => p.cluster)).size);
      const minimalColors = points.slice(0, 2).map((p) => getColor(p.sentiment, p.cluster, nClusters));
      return {
        curve: minimalCurve,
        colors: minimalColors,
        visibleFraction: easedProgress,
        visiblePoints: 2,
        smoothedPositions: minimalPositions,
      };
    }
    
    if (visiblePoints < 2) {
      return {
        curve: null,
        colors: [],
        visibleFraction: easedProgress,
        visiblePoints: visiblePoints,
        smoothedPositions: [],
      };
    }
    
    const visible = points.slice(0, visiblePoints);
    
    // Interpolate last point if fractional
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
    
    // Add control point for smooth start
    if (positions.length >= 2) {
      const first = positions[0];
      const second = positions[1];
      const startControl = first.clone().sub(second.clone().sub(first).normalize().multiplyScalar(0.5));
      positions.unshift(startControl);
    }
    
    // Create smooth curve
    const curve = new THREE.CatmullRomCurve3(positions, false, "centripetal", 0.5);
    
    // Resample by arc-length for smooth, constant-speed motion
    const targetSegments = Math.max(300, positions.length * 40);
    const smoothedPositions = resampleByArcLength(curve, targetSegments);
    
    // Compute colors
    const nClusters = Math.max(1, new Set(points.map((p) => p.cluster)).size);
    const colors = visible.map((p) => getColor(p.sentiment, p.cluster, nClusters));
    
    return { curve, colors, visibleFraction: easedProgress, visiblePoints, smoothedPositions };
  }, [points, effectiveProgress]);
  
  // Premium glowing ribbon (thinner tube with glow pass)
  const tubeGeometry = useMemo(() => {
    if (!curve || points.length < 2) return null;
    
    const segments = Math.max(300, points.length * 40);
    const radius = 0.15; // Visible thickness
    const radialSegments = 16;
    
    return new THREE.TubeGeometry(curve, segments, radius, radialSegments, false);
  }, [curve, points.length]);
  
  // Simple line geometry connecting points directly (backup/visible trail)
  const lineGeometry = useMemo(() => {
    if (points.length < 2 || visiblePoints < 2) return null;
    
    const positions = new Float32Array(visiblePoints * 3);
    for (let i = 0; i < visiblePoints; i++) {
      const point = points[i];
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [points, visiblePoints]);
  
  // Thick line using tube for visibility (WebGL doesn't support linewidth)
  const thickLineCurve = useMemo(() => {
    if (points.length < 2 || visiblePoints < 2) return null;
    
    const positions = points.slice(0, visiblePoints).map((p) => new THREE.Vector3(p.x, p.y, p.z));
    if (positions.length < 2) return null;
    
    return new THREE.CatmullRomCurve3(positions, false, "centripetal", 0.5);
  }, [points, visiblePoints]);
  
  const thickLineGeometry = useMemo(() => {
    if (!thickLineCurve) return null;
    return new THREE.TubeGeometry(thickLineCurve, Math.max(50, visiblePoints * 10), 0.08, 8, false);
  }, [thickLineCurve, visiblePoints]);
  
  // Glow pass (larger, more transparent)
  const glowGeometry = useMemo(() => {
    if (!curve || points.length < 2) return null;
    
    const segments = Math.max(300, points.length * 40);
    const radius = 0.2; // Larger for glow
    const radialSegments = 16;
    
    return new THREE.TubeGeometry(curve, segments, radius, radialSegments, false);
  }, [curve, points.length]);
  
  // Color gradient
  const tubeColors = useMemo(() => {
    if (!tubeGeometry || colors.length === 0) return null;
    
    const positions = tubeGeometry.getAttribute("position");
    const vertexCount = positions.count;
    const colorArray = new Float32Array(vertexCount * 3);
    
    for (let i = 0; i < vertexCount; i++) {
      const t = i / (vertexCount - 1);
      const colorIndex = Math.floor(t * (colors.length - 1));
      const nextColorIndex = Math.min(colorIndex + 1, colors.length - 1);
      const localT = (t * (colors.length - 1)) - colorIndex;
      
      const color1 = colors[colorIndex] || colors[0];
      const color2 = colors[nextColorIndex] || colors[colors.length - 1];
      
      const r = color1.r + (color2.r - color1.r) * localT;
      const g = color1.g + (color2.g - color1.g) * localT;
      const b = color1.b + (color2.b - color1.b) * localT;
      
      colorArray[i * 3] = r;
      colorArray[i * 3 + 1] = g;
      colorArray[i * 3 + 2] = b;
    }
    
    return new THREE.BufferAttribute(colorArray, 3);
  }, [tubeGeometry, colors]);
  
  if (points.length === 0) {
    return null;
  }
  
  if (points.length === 1) {
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
  
  // Premium glowing ribbon trail
  const latestPoint = points.length > 0 ? points[Math.min(visiblePoints - 1, points.length - 1)] : null;
  const nClusters = Math.max(1, new Set(points.map((p) => p.cluster)).size);
  
  return (
    <group ref={groupRef}>
      {/* Simple line connecting points (always visible trail) */}
      {lineGeometry && visiblePoints >= 2 && (
        <line geometry={lineGeometry}>
          <lineBasicMaterial
            color="#00ffff"
            transparent
            opacity={1.0}
          />
        </line>
      )}
      
      {/* Thick line trail (tube-based for visibility) */}
      {thickLineGeometry && (
        <mesh geometry={thickLineGeometry}>
          <meshBasicMaterial
            color="#00ffff"
            transparent
            opacity={0.9}
          />
        </mesh>
      )}
      
      {/* Glow pass (behind) */}
      {glowGeometry && (
        <mesh ref={glowRef} geometry={glowGeometry}>
          <meshStandardMaterial
            vertexColors={tubeColors ? true : false}
            color={tubeColors ? "#ffffff" : "#00ffff"}
            emissive={tubeColors ? undefined : "#00ffff"}
            emissiveIntensity={0.5}
            side={THREE.DoubleSide}
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
      
      {/* Main ribbon */}
      {tubeGeometry && (
        <>
          {tubeColors && tubeGeometry.setAttribute("color", tubeColors)}
          <mesh ref={meshRef} geometry={tubeGeometry}>
            <meshStandardMaterial
              vertexColors={tubeColors ? true : false}
              color={tubeColors ? "#ffffff" : "#00ffff"}
              emissive={tubeColors ? undefined : "#00ffff"}
              emissiveIntensity={1.0}
              side={THREE.DoubleSide}
              roughness={0.1}
              metalness={0.3}
            />
          </mesh>
        </>
      )}
        
        {/* Glowing points */}
        {points.slice(0, visiblePoints).map((point, idx) => {
          const color = getColor(point.sentiment, point.cluster, nClusters);
          const size = 0.1;
          const isLatest = idx === visiblePoints - 1;
          const isHovered = hoveredPoint === idx;
          
          const words = point.text_fragment.split(/\s+/);
          const displayWord = words.length > 1 ? words[words.length - 1] : point.text_fragment;
          const truncated = displayWord.length > 18 ? displayWord.substring(0, 18) + "..." : displayWord;
          
          return (
            <group key={idx}>
              <mesh
                position={[point.x, point.y, point.z]}
                onPointerEnter={() => setHoveredPoint(idx)}
                onPointerLeave={() => setHoveredPoint(null)}
              >
                <sphereGeometry args={[size, 10, 10]} />
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={isLatest || isHovered ? 1.0 : 0.7}
                  transparent
                  opacity={0.85}
                />
              </mesh>
              
              {/* Word label on every point */}
              <Text
                position={[point.x, point.y + 0.25, point.z]}
                fontSize={0.15}
                color={color.getHexString()}
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.015}
                outlineColor="#000000"
                maxWidth={2.0}
              >
                {truncated}
              </Text>
            </group>
          );
        })}
        
        {/* Head comet (bright orb at latest point) */}
        {latestPoint && (
          <mesh position={[latestPoint.x, latestPoint.y, latestPoint.z]}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial
              color={getColor(latestPoint.sentiment, latestPoint.cluster, nClusters)}
              emissive={getColor(latestPoint.sentiment, latestPoint.cluster, nClusters)}
              emissiveIntensity={1.5}
              transparent
              opacity={0.8}
            />
          </mesh>
        )}
        
        {/* "Now" label at head (if enabled) */}
        {latestPoint && showAnchorLabels && (
          <Text
            position={[latestPoint.x, latestPoint.y + 0.5, latestPoint.z]}
            fontSize={0.2}
            color={getColor(latestPoint.sentiment, latestPoint.cluster, nClusters).getHexString()}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            Now
          </Text>
        )}
      </group>
    );
}
