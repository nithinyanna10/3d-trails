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
function resampleByArcLength(curve: THREE.CatmullRomCurve3 | null, targetSegments: number): THREE.Vector3[] {
  if (!curve) {
    return [];
  }
  
  try {
    const totalLength = curve.getLength();
    if (totalLength === 0 || !isFinite(totalLength)) {
      // Fallback: just get points from curve
      return curve.getPoints(targetSegments);
    }
    
    const segmentLength = totalLength / targetSegments;
    const points: THREE.Vector3[] = [];
    
    for (let i = 0; i <= targetSegments; i++) {
      const distance = i * segmentLength;
      const t = curve.getUtoTmapping(0, distance / totalLength);
      const point = curve.getPoint(t);
      
      // Safety check: ensure point is valid
      if (point && typeof point.x === 'number' && typeof point.y === 'number' && typeof point.z === 'number') {
        points.push(point);
      }
    }
    
    return points.length > 0 ? points : curve.getPoints(targetSegments);
  } catch (error) {
    console.error('Error in resampleByArcLength:', error);
    // Fallback: just get points from curve
    try {
      return curve.getPoints(targetSegments);
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return [];
    }
  }
}

export default function Trail({ points, animationProgress, revealIndex, speed, showAnchorLabels }: TrailProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  
  // Use revealIndex if provided and valid, otherwise use animationProgress
  // Ensure at least 2 points are visible for trail to render
  const effectiveRevealIndex = points.length > 0 
    ? (revealIndex > 0 && revealIndex <= points.length 
        ? Math.max(2, revealIndex) 
        : Math.max(2, Math.ceil(points.length * animationProgress)))
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
    
    // Create smooth curve - ensure we have valid positions
    if (positions.length < 2) {
      return {
        curve: null,
        colors: [],
        visibleFraction: easedProgress,
        visiblePoints: visiblePoints,
        smoothedPositions: [],
      };
    }
    
    let curve: THREE.CatmullRomCurve3 | null = null;
    try {
      curve = new THREE.CatmullRomCurve3(positions, false, "centripetal", 0.5);
    } catch (error) {
      console.error('Error creating curve:', error);
      return {
        curve: null,
        colors: [],
        visibleFraction: easedProgress,
        visiblePoints: visiblePoints,
        smoothedPositions: [],
      };
    }
    
    // Resample by arc-length for smooth, constant-speed motion
    const targetSegments = Math.max(300, positions.length * 40);
    const smoothedPositions = resampleByArcLength(curve, targetSegments);
    
    // Compute colors
    const nClusters = Math.max(1, new Set(points.map((p) => p.cluster)).size);
    const colors = visible.map((p) => getColor(p.sentiment, p.cluster, nClusters));
    
    return { curve, colors, visibleFraction: easedProgress, visiblePoints, smoothedPositions };
  }, [points, effectiveProgress]);
  
  // Use the SAME approach as MiniDemo - simple and reliable
  // Create curve from visible points - ALWAYS use ALL points for complete trail
  const trailCurve = useMemo(() => {
    if (!points || points.length < 2) {
      console.log('Trail: Not enough points for curve', points?.length);
      return null;
    }
    
    try {
      // Use ALL points, not just visible ones - this ensures the trail is always complete
      // Filter out invalid points first
      const validPoints = points.filter(p => 
        p && 
        typeof p.x === 'number' && 
        typeof p.y === 'number' && 
        typeof p.z === 'number' &&
        isFinite(p.x) && 
        isFinite(p.y) && 
        isFinite(p.z)
      );
      
      if (validPoints.length < 2) {
        console.log('Trail: Not enough valid points for curve', validPoints.length);
        return null;
      }
      
      const positions = validPoints.map((p) => new THREE.Vector3(p.x, p.y, p.z));
      
      console.log('Trail: Creating curve with', positions.length, 'valid points');
      return new THREE.CatmullRomCurve3(positions, false, 'centripetal', 0.5);
    } catch (err) {
      console.error('Error creating trailCurve:', err);
      return null;
    }
  }, [points]);
  
  // Create line geometry exactly like MiniDemo
  const lineGeometry = useMemo(() => {
    if (!trailCurve) {
      console.log('Trail: No trailCurve, cannot create lineGeometry');
      return null;
    }
    
    try {
      const points_array = trailCurve.getPoints(200);
      if (points_array.length < 2) {
        console.log('Trail: Not enough points in curve', points_array.length);
        return null;
      }
      
      const positions = new Float32Array(points_array.length * 3);
      points_array.forEach((point, i) => {
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      console.log('Trail: ✅ lineGeometry created successfully with', points_array.length, 'points');
      console.log('Trail: First point:', points_array[0], 'Last point:', points_array[points_array.length - 1]);
      return geometry;
    } catch (err) {
      console.error('Error creating lineGeometry:', err);
      return null;
    }
  }, [trailCurve]);
  
  // Don't use tube geometry - use thin lines like MiniDemo
  
  // Glow pass (larger, more transparent)
  const glowGeometry = useMemo(() => {
    if (!curve || !points || points.length < 2 || visiblePoints < 2) return null;
    
    try {
      const segments = Math.max(300, points.length * 40);
      const radius = 0.2; // Larger for glow
      const radialSegments = 16;
      
      return new THREE.TubeGeometry(curve, segments, radius, radialSegments, false);
    } catch (err) {
      console.error('Error creating glowGeometry:', err);
      return null;
    }
  }, [curve, points, visiblePoints]);
  
  // Not using tube colors anymore - using simple line like MiniDemo
  
  // Calculate positions along the trail for word labels - MUST BE BEFORE ANY EARLY RETURNS (Rules of Hooks)
  const labelPositions = useMemo(() => {
    if (!points || points.length < 2) {
      console.log('Trail: No points for labels');
      return [];
    }
    
    const labels: Array<{ position: THREE.Vector3; word: string; index: number }> = [];
    // Use ALL points, not just visiblePoints - we want to see all words along the trail
    const numLabels = points.length;
    
    console.log('Trail: Creating', numLabels, 'labels for', points.length, 'points (visiblePoints:', visiblePoints, ')');
    
    // Place labels directly at each point position with simple offset
    for (let i = 0; i < numLabels; i++) {
      const point = points[i];
      
      // Safety check: skip if point is undefined or missing coordinates
      if (!point || typeof point.x !== 'number' || typeof point.y !== 'number' || typeof point.z !== 'number') {
        console.warn(`Trail: Skipping invalid point at index ${i}`, point);
        continue;
      }
      
      // Extract word from the point
      const words = (point.text_fragment || '').trim().split(/\s+/);
      let displayWord = point.text_fragment || '';
      if (words.length > 1) {
        displayWord = words[words.length - 1]; // Last word
      }
      const truncated = displayWord.length > 12 ? displayWord.substring(0, 12) + "..." : displayWord;
      
      // Simple offset: place label above and slightly to the side of each point
      // Alternate sides to avoid overlap
      const offsetX = (i % 2 === 0 ? 0.6 : -0.6); // Alternate sides
      const offsetY = 0.7; // Higher up for better visibility
      const offsetPosition = new THREE.Vector3(
        point.x + offsetX,
        point.y + offsetY,
        point.z
      );
      
      labels.push({
        position: offsetPosition,
        word: truncated,
        index: i
      });
    }
    
    console.log('Trail: Created', labels.length, 'labels');
    return labels;
  }, [points]); // Remove visiblePoints dependency - show all labels
  
  // Premium glowing ribbon trail
  const latestPoint = points.length > 0 ? points[Math.min(visiblePoints - 1, points.length - 1)] : null;
  const nClusters = Math.max(1, new Set(points.map((p) => p.cluster)).size);
  
  // Early returns AFTER all hooks
  if (points.length === 0) {
    return null;
  }
  
  if (points.length === 1) {
    const point = points[0];
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
  
  // Early return if not enough points
  if (!points || points.length < 2) {
    console.log('Trail: Not enough points to render', points?.length);
    return null;
  }
  
  // Render trail - EXACT same approach as MiniDemo (simple line)
  if (!lineGeometry) {
    console.log('Trail: No lineGeometry, cannot render');
    return null;
  }
  
  console.log('Trail: ✅ Rendering line with', points.length, 'total points');
  
  return (
    <group ref={groupRef}>
      {/* Simple line - EXACT same as MiniDemo working version - thin lines */}
      {lineGeometry && (
        <line geometry={lineGeometry}>
          <lineBasicMaterial
            color="#00f5ff"
            linewidth={2}
          />
        </line>
      )}
      
      {/* Word labels along the trail segments - showing what each part represents */}
      {labelPositions.length > 0 && (
        <>
          {labelPositions.map((label, idx) => {
            const point = points[label.index];
            if (!point || !label.position) return null;
            
            // Safety check for position coordinates
            if (typeof label.position.x !== 'number' || typeof label.position.y !== 'number' || typeof label.position.z !== 'number') {
              return null;
            }
            
            return (
              <Text
                key={`trail-label-${idx}-${label.index}`}
                position={[label.position.x, label.position.y, label.position.z]}
                fontSize={0.28}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.1}
                outlineColor="#000000"
                maxWidth={4.0}
              >
                {label.word}
              </Text>
            );
          })}
        </>
      )}
        
        {/* Glowing points with word labels */}
        {points.slice(0, visiblePoints).map((point, idx) => {
          const color = getColor(point.sentiment, point.cluster, nClusters);
          const size = 0.12;
          const isLatest = idx === visiblePoints - 1;
          const isHovered = hoveredPoint === idx;
          
          // Extract the last word or the whole fragment if it's short
          const words = point.text_fragment.trim().split(/\s+/);
          let displayWord = point.text_fragment;
          if (words.length > 1) {
            // Get the last word
            displayWord = words[words.length - 1];
          }
          // Truncate if too long
          const truncated = displayWord.length > 15 ? displayWord.substring(0, 15) + "..." : displayWord;
          
          return (
            <group key={`point-${idx}`}>
              <mesh
                position={[point.x, point.y, point.z]}
                onPointerEnter={() => setHoveredPoint(idx)}
                onPointerLeave={() => setHoveredPoint(null)}
              >
                <sphereGeometry args={[size, 12, 12]} />
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={isLatest || isHovered ? 1.2 : 0.8}
                  transparent
                  opacity={0.9}
                />
              </mesh>
              
              {/* Word label on every point - MAKE IT POP! */}
              <Text
                position={[point.x, point.y + 0.45, point.z]}
                fontSize={0.28}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.08}
                outlineColor="#000000"
                maxWidth={4.0}
                strokeWidth={0.02}
                strokeColor="#000000"
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
