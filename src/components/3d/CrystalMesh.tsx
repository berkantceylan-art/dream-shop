"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

// Dream Kristali'nin 3D hali: üç eksende uzatılmış sekizyüzlülerle 6 uçlu yıldız.
export default function CrystalMesh({ position = [0, 0, 0], size = 0.2 }: {
  position?: [number, number, number]; size?: number;
}) {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    g.current.rotation.y = clock.elapsedTime * 1.2;
    g.current.position.y = position[1] + Math.sin(clock.elapsedTime * 2) * 0.05;
  });
  const mat = (
    <meshStandardMaterial color="#ff8ad8" emissive="#c24dff" emissiveIntensity={0.6}
      roughness={0.15} metalness={0.2} flatShading />
  );
  return (
    <group ref={g} position={position}>
      {/* üç eksende sivri uçlar → 6 uçlu yıldız */}
      {([[0.34, 1.15, 0.34], [1.05, 0.3, 0.3], [0.3, 0.3, 1.05]] as const).map((k, i) => (
        <mesh key={i} scale={[size * k[0], size * k[1], size * k[2]]}>
          <octahedronGeometry args={[1, 0]} />
          {mat}
        </mesh>
      ))}
      <mesh scale={size * 0.42}>
        <icosahedronGeometry args={[1, 0]} />
        {mat}
      </mesh>
      <pointLight color="#ff8ad8" intensity={0.6} distance={1.5} />
    </group>
  );
}
