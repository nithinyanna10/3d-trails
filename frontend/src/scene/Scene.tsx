import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Stars } from "@react-three/drei";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import Trail from "./Trail";
import Particles from "./Particles";
import ClusterZones from "./ClusterZones";
import { Point, Anchor } from "../api";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

interface SceneProps {
  points: Point[];
  anchors: Anchor[];
  showParticles: boolean;
  showAnchorLabels: boolean;
  showClusterClouds: boolean;
  animationProgress: number;
  revealIndex: number;
  speed: number;
  cameraMode?: 'drift' | 'orbit' | 'static';
}

// Star Field Component
function StarField() {
  const starsRef = useRef<THREE.Points>(null);
  
  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.y += 0.0001;
    }
  });

  const stars = Array.from({ length: 500 }).map(() => ({
    position: [
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100,
    ] as [number, number, number],
  }));

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={stars.length}
          array={new Float32Array(stars.flatMap((s) => s.position))}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        color="#EAF0FF"
        opacity={0.3}
        transparent
        sizeAttenuation={false}
      />
    </points>
  );
}

// Camera Controller
function CameraController({ mode }: { mode: 'drift' | 'orbit' | 'static' }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const controlsRef = useRef<any>(null);

  useFrame((state, delta) => {
    if (mode === 'drift' && cameraRef.current) {
      // Gentle drift
      cameraRef.current.position.x += Math.sin(state.clock.elapsedTime * 0.1) * 0.01;
      cameraRef.current.position.y += Math.cos(state.clock.elapsedTime * 0.15) * 0.01;
    } else if (mode === 'orbit' && controlsRef.current) {
      // Auto-rotate
      controlsRef.current.setAzimuthalAngle(controlsRef.current.getAzimuthalAngle() + delta * 0.1);
    }
  });

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={[0, 0, 15]}
        fov={50}
      />
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={50}
        autoRotate={mode === 'orbit'}
        autoRotateSpeed={0.5}
      />
    </>
  );
}

export default function Scene({
  points,
  anchors,
  showParticles,
  showAnchorLabels,
  showClusterClouds,
  animationProgress,
  revealIndex,
  speed,
  cameraMode = 'orbit',
}: SceneProps) {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      style={{ background: 'var(--bg-base)' }}
    >
      <CameraController mode={cameraMode} />
      
      {/* Premium Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.6} />
      <pointLight position={[-10, -10, -10]} intensity={0.3} />
      <directionalLight position={[0, 10, 5]} intensity={0.2} />
      
      {/* Atmospheric Fog */}
      <fog attach="fog" args={['#070A12', 8, 40]} />
      
      {/* Star Field (replaces grid) */}
      <StarField />
      
      {/* Horizon Haze */}
      <mesh position={[0, -10, -5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshBasicMaterial
          color="#0B1220"
          opacity={0.3}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
      
      <Suspense fallback={null}>
        {points.length > 0 && (
          <>
            <Trail
              points={points}
              animationProgress={animationProgress}
              revealIndex={revealIndex > 0 ? Math.max(2, revealIndex) : Math.max(2, Math.ceil(points.length * animationProgress))}
              speed={speed}
              showAnchorLabels={showAnchorLabels}
            />
            
            {/* Tight cluster clouds (toggleable) */}
            <ClusterZones
              points={points}
              visiblePoints={revealIndex > 0 ? Math.max(2, revealIndex) : Math.max(2, Math.ceil(points.length * animationProgress))}
              showClusterClouds={showClusterClouds}
            />
            
            {showParticles && anchors.length > 0 && (
              <Particles
                anchors={anchors}
                nParticles={3000}
                showAnchorLabels={false}
              />
            )}
          </>
        )}
      </Suspense>
      
      {/* Premium Post-processing */}
      <EffectComposer>
        <Bloom
          intensity={0.4}
          luminanceThreshold={0.5}
          luminanceSmoothing={0.9}
          height={300}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.4} />
      </EffectComposer>
    </Canvas>
  );
}
