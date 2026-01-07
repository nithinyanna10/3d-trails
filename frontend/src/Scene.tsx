import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Suspense } from "react";
import * as THREE from "three";
import Trail from "./Trail";
import Particles from "./Particles";
import { Point, Anchor } from "./api";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

interface SceneProps {
  points: Point[];
  anchors: Anchor[];
  showParticles: boolean;
  showAnchorLabels: boolean;
  animationProgress: number;
  speed: number;
}

export default function Scene({
  points,
  anchors,
  showParticles,
  showAnchorLabels,
  animationProgress,
  speed,
}: SceneProps) {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      style={{ background: "#0a0a0a" }}
    >
      <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={50} />
      
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.6} />
      <pointLight position={[-10, -10, -10]} intensity={0.3} />
      
      {/* Fog for depth */}
      <fog attach="fog" args={["#0a0a0a", 10, 50]} />
      
      {/* Grid helper */}
      <gridHelper args={[20, 20, "#1a1a1a", "#0f0f0f"]} />
      
      {/* Axes helper (optional, can remove) */}
      {/* <axesHelper args={[5]} /> */}
      
      <Suspense fallback={null}>
        <Trail
          points={points}
          animationProgress={animationProgress}
          speed={speed}
          showAnchorLabels={showAnchorLabels}
        />
        
        {showParticles && (
          <Particles
            anchors={anchors}
            nParticles={1500}
            showAnchorLabels={false}
          />
        )}
      </Suspense>
      
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={50}
        autoRotate={false}
        autoRotateSpeed={0.5}
      />
      
      {/* Post-processing bloom */}
      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
          height={300}
        />
      </EffectComposer>
    </Canvas>
  );
}

