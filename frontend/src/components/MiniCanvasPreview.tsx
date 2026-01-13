import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

// Simple animated trail for preview
function PreviewTrail() {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 50; i++) {
      const t = i / 50;
      const x = Math.sin(t * Math.PI * 4) * 2;
      const y = Math.cos(t * Math.PI * 3) * 1.5;
      const z = t * 4 - 2;
      pts.push(new THREE.Vector3(x, y, z));
    }
    return pts;
  }, []);

  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
  }, [points]);

  const lineGeometry = useMemo(() => {
    if (!curve) return null;
    const pts = curve.getPoints(200);
    const positions = new Float32Array(pts.length * 3);
    pts.forEach((pt, i) => {
      positions[i * 3] = pt.x;
      positions[i * 3 + 1] = pt.y;
      positions[i * 3 + 2] = pt.z;
    });
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geom;
  }, [curve]);

  return (
    <>
      {lineGeometry && (
        <line geometry={lineGeometry}>
          <lineBasicMaterial color="#47D7FF" linewidth={2} />
        </line>
      )}
      {points.map((pt, i) => (
        <mesh key={i} position={[pt.x, pt.y, pt.z]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial
            color="#47D7FF"
            emissive="#47D7FF"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </>
  );
}

export default function MiniCanvasPreview() {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden glass-panel">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <pointLight position={[5, 5, 5]} intensity={0.8} />
          <fog attach="fog" args={['#070A12', 5, 15]} />
          <PreviewTrail />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.5}
          />
          <EffectComposer>
            <Bloom intensity={0.4} luminanceThreshold={0.5} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}

