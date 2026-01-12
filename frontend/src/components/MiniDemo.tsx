import { useEffect, useState, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface ClickedLine {
  id: number;
  startPosition: THREE.Vector3;
  color: string;
}

export default function MiniDemo() {
  const [clickedLines, setClickedLines] = useState<ClickedLine[]>([]);
  const lineIdCounter = useRef(1000); // Start high to avoid conflicts with regular lines
  
  return (
    <div className="w-full h-full relative bg-black" style={{ cursor: 'crosshair' }}>
      <Canvas 
        gl={{ antialias: true, alpha: false }} 
        dpr={[1, 2]} 
        className="w-full h-full"
        style={{ background: '#000000' }}
      >
        <ClickHandler 
          setClickedLines={setClickedLines} 
          lineIdCounter={lineIdCounter}
        />
        <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
        <ambientLight intensity={0.6} />
        <fog attach="fog" args={["#0a0a0a", 8, 30]} />
        
        {/* 12 independent flowing lines with physics */}
        <FlowingLine index={0} color="#00f5ff" />
        <FlowingLine index={1} color="#00d9ff" />
        <FlowingLine index={2} color="#00b8ff" />
        <FlowingLine index={3} color="#0099ff" />
        <FlowingLine index={4} color="#00aaff" />
        <FlowingLine index={5} color="#0088ff" />
        <FlowingLine index={6} color="#00ccff" />
        <FlowingLine index={7} color="#00eeff" />
        <FlowingLine index={8} color="#00bbff" />
        <FlowingLine index={9} color="#0099ee" />
        <FlowingLine index={10} color="#00aadd" />
        <FlowingLine index={11} color="#00ccdd" />
        
        {/* Lines spawned from clicks */}
        {clickedLines.map((line) => (
          <FlowingLine 
            key={line.id} 
            index={line.id} 
            color={line.color}
            startPosition={line.startPosition}
            isClickedLine={true}
          />
        ))}
        
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          autoRotate 
          autoRotateSpeed={0.3}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
      <div className="absolute bottom-4 left-4 text-white/50 text-sm pointer-events-none">
        Click anywhere to spawn 4 new lines
      </div>
    </div>
  );
}

// Component to handle clicks and convert to 3D positions
function ClickHandler({ 
  setClickedLines,
  lineIdCounter
}: { 
  setClickedLines: React.Dispatch<React.SetStateAction<ClickedLine[]>>;
  lineIdCounter: React.MutableRefObject<number>;
}) {
  const { camera, gl, raycaster } = useThree();
  
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Create raycaster to convert 2D to 3D
      const ray = new THREE.Raycaster();
      ray.setFromCamera(mouse, camera);
      
      // Intersect with a plane at z=0 (center of view) to get 3D position
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersection = new THREE.Vector3();
      ray.ray.intersectPlane(plane, intersection);
      
      // Create 4 lines starting from click position with slight offsets
      const colors = ["#ff00ff", "#ff00cc", "#ff0099", "#ff0066"];
      const newLines: ClickedLine[] = colors.map((color, i) => {
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        );
        return {
          id: lineIdCounter.current++,
          startPosition: intersection.clone().add(offset),
          color
        };
      });
      
      setClickedLines(prev => [...prev, ...newLines]);
    };
    
    gl.domElement.addEventListener('click', handleClick);
    return () => gl.domElement.removeEventListener('click', handleClick);
  }, [camera, gl, setClickedLines, lineIdCounter]);
  
  return null;
}

interface PhysicsState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
}

function FlowingLine({ 
  index, 
  color, 
  startPosition,
  isClickedLine = false 
}: { 
  index: number; 
  color: string;
  startPosition?: THREE.Vector3;
  isClickedLine?: boolean;
}) {
  const trailLength = 80;
  const [physicsState, setPhysicsState] = useState<PhysicsState>(() => {
    // Initialize physics state - use startPosition if provided (clicked line)
    let initialPosition: THREE.Vector3;
    
    if (startPosition && isClickedLine) {
      initialPosition = startPosition.clone();
    } else {
      // Default initialization for regular lines
      const angle = (index / 12) * Math.PI * 2;
      const radius = 3 + (index % 3) * 1.5;
      initialPosition = new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle * 2) * 2,
        Math.sin(angle) * radius
      );
    }
    
    return {
      position: initialPosition,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.08
      ),
      acceleration: new THREE.Vector3(0, 0, 0)
    };
  });
  
  // Update position if startPosition changes (for clicked lines)
  useEffect(() => {
    if (startPosition && isClickedLine) {
      setPhysicsState(prev => ({
        ...prev,
        position: startPosition.clone()
      }));
    }
  }, [startPosition, isClickedLine]);
  
  const [trailPoints, setTrailPoints] = useState<THREE.Vector3[]>(() => {
    // Initialize trail with physics-based positions
    const initialPoints: THREE.Vector3[] = [];
    const state = physicsState;
    
    for (let i = 0; i < trailLength; i++) {
      const t = i / trailLength;
      const offset = state.position.clone().multiplyScalar(t);
      initialPoints.push(offset.clone());
    }
    
    return initialPoints;
  });
  
  useEffect(() => {
    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000; // Delta in seconds
      lastTime = currentTime;
      
      setPhysicsState(prev => {
        const time = currentTime * 0.001;
        const newState = { ...prev };
        
        // Calculate forces (physics-based)
        const center = new THREE.Vector3(0, 0, 0);
        const distanceFromCenter = newState.position.distanceTo(center);
        
        // Attraction/repulsion force from center (creates orbital motion)
        const centerForce = center.clone().sub(newState.position).multiplyScalar(0.0003);
        
        // Perlin-like noise for organic movement
        const noiseX = Math.sin(time * 0.5 + index) * Math.cos(time * 0.7 + index) * 0.02;
        const noiseY = Math.cos(time * 0.6 + index) * Math.sin(time * 0.8 + index) * 0.02;
        const noiseZ = Math.sin(time * 0.4 + index) * Math.cos(time * 0.9 + index) * 0.015;
        
        // Random walk force (small random acceleration)
        const randomForce = new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01
        );
        
        // Gravity-like force (slight downward pull)
        const gravity = new THREE.Vector3(0, -0.0001, 0);
        
        // Combine all forces
        newState.acceleration = centerForce
          .add(new THREE.Vector3(noiseX, noiseY, noiseZ))
          .add(randomForce)
          .add(gravity);
        
        // Update velocity with acceleration (momentum)
        newState.velocity.add(newState.acceleration.clone().multiplyScalar(delta * 60));
        
        // Apply damping (air resistance/friction)
        const damping = 0.98;
        newState.velocity.multiplyScalar(damping);
        
        // Limit maximum velocity (terminal velocity)
        const maxSpeed = 0.15;
        if (newState.velocity.length() > maxSpeed) {
          newState.velocity.normalize().multiplyScalar(maxSpeed);
        }
        
        // Update position with velocity
        const positionDelta = newState.velocity.clone().multiplyScalar(delta * 60);
        newState.position.add(positionDelta);
        
        // Boundary constraints (soft boundaries)
        const boundary = 8;
        if (Math.abs(newState.position.x) > boundary) {
          newState.velocity.x *= -0.5;
          newState.position.x = Math.sign(newState.position.x) * boundary;
        }
        if (Math.abs(newState.position.y) > boundary) {
          newState.velocity.y *= -0.5;
          newState.position.y = Math.sign(newState.position.y) * boundary;
        }
        if (Math.abs(newState.position.z) > boundary) {
          newState.velocity.z *= -0.5;
          newState.position.z = Math.sign(newState.position.z) * boundary;
        }
        
        // Update trail points
        setTrailPoints(prev => {
          const newPoints = [...prev];
          newPoints.shift(); // Remove oldest point
          newPoints.push(newState.position.clone()); // Add new position
          return newPoints;
        });
        
        return newState;
      });
      
      requestAnimationFrame(animate);
    };
    
    const rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [index]);
  
  // Create smooth curve
  const curve = useMemo(() => {
    if (trailPoints.length < 2) return null;
    return new THREE.CatmullRomCurve3(trailPoints, false, 'centripetal', 0.5);
  }, [trailPoints]);
  
  // Simple line geometry (not tube)
  const lineGeometry = useMemo(() => {
    if (!curve) return null;
    const points = curve.getPoints(200);
    const positions = new Float32Array(points.length * 3);
    points.forEach((point, i) => {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [curve]);
  
  if (!lineGeometry || trailPoints.length < 2) return null;
  
  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial color={color} linewidth={2} />
    </line>
  );
}
