"use client";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import type { AvatarConfig } from "@/lib/avatar";
import Avatar3D from "./Avatar3D";

// Karakteri döner bir podyum üzerinde gösteren sahne.
export default function AvatarStage({ config, scale = 1, interactive = true, className = "" }: {
  config: AvatarConfig; scale?: number; interactive?: boolean; className?: string;
}) {
  return (
    <div className={className}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 1.5, 5.2], fov: 35 }}>
        <hemisphereLight args={["#ffffff", "#ffd6e8", 1.1]} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow
          shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <group position={[0, -1.05, 0]}>
          <Avatar3D config={config} scale={scale} />
          <mesh position={[0, -0.05, 0]} receiveShadow>
            <cylinderGeometry args={[1.0, 1.1, 0.1, 48]} />
            <meshStandardMaterial color="#f3e8ff" roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.85, 0.95, 48]} />
            <meshBasicMaterial color="#ff8ad8" />
          </mesh>
          <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={3} blur={2.2} far={2} />
        </group>
        <OrbitControls enabled={interactive} enablePan={false} enableZoom={interactive}
          minDistance={3} maxDistance={7} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.9}
          target={[0, 0.1, 0]} autoRotate={!interactive} autoRotateSpeed={1.5} />
      </Canvas>
    </div>
  );
}
