import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Suspense } from "react";
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
}: SceneProps) {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)" }}
    >
      <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={50} />
      
      {/* Premium Lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-10, -10, -10]} intensity={0.4} />
      <directionalLight position={[0, 10, 5]} intensity={0.3} />
      
      {/* Atmospheric Fog */}
      <fog attach="fog" args={["#0a0a0a", 8, 40]} />
      
      {/* Grid helper (subtle) */}
      <gridHelper args={[20, 20, "#1a1a1a", "#0f0f0f"]} />
      
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
                nParticles={1500}
                showAnchorLabels={false}
              />
            )}
          </>
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
      
      {/* Premium Post-processing */}
      <EffectComposer>
        <Bloom
          intensity={0.6}
          luminanceThreshold={0.4}
          luminanceSmoothing={0.9}
          height={300}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </Canvas>
  );
}

