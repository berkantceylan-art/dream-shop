"use client";
import type { CarShape } from "@/lib/home";

// Kodla üretilen stilize araba. Uzunluk x ekseninde ~2.2 birim, tekerlekler y=0.
const SPEC: Record<CarShape, { len: number; bodyH: number; cabH: number; cabLen: number; cabX: number; lift: number; wheel: number }> = {
  hatchback: { len: 2.0, bodyH: 0.42, cabH: 0.42, cabLen: 1.1, cabX: -0.2, lift: 0.18, wheel: 0.22 },
  sedan:     { len: 2.4, bodyH: 0.4,  cabH: 0.38, cabLen: 1.2, cabX: 0.0,  lift: 0.16, wheel: 0.22 },
  suv:       { len: 2.4, bodyH: 0.6,  cabH: 0.5,  cabLen: 1.5, cabX: -0.2, lift: 0.3,  wheel: 0.3 },
  coupe:     { len: 2.3, bodyH: 0.32, cabH: 0.3,  cabLen: 0.9, cabX: -0.15, lift: 0.12, wheel: 0.21 },
  pickup:    { len: 2.6, bodyH: 0.5,  cabH: 0.5,  cabLen: 0.9, cabX: 0.5,  lift: 0.3,  wheel: 0.3 },
};

export default function Car3D({ shape, color }: { shape: CarShape; color: string }) {
  const s = SPEC[shape];
  const w = 1.05;
  const bodyY = s.lift + s.bodyH / 2;
  return (
    <group>
      {/* gövde */}
      <mesh position={[0, bodyY, 0]} castShadow>
        <boxGeometry args={[s.len, s.bodyH, w]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.35} />
      </mesh>
      {/* kabin */}
      <mesh position={[s.cabX, s.lift + s.bodyH + s.cabH / 2 - 0.02, 0]} castShadow>
        <boxGeometry args={[s.cabLen, s.cabH, w * 0.9]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.35} />
      </mesh>
      {/* camlar */}
      <mesh position={[s.cabX, s.lift + s.bodyH + s.cabH / 2, 0]}>
        <boxGeometry args={[s.cabLen + 0.02, s.cabH * 0.7, w * 0.92]} />
        <meshStandardMaterial color="#1e2a4a" metalness={0.8} roughness={0.1} />
      </mesh>
      {/* farlar ve stoplar */}
      {[-1, 1].map((z) => (
        <group key={z}>
          <mesh position={[s.len / 2 + 0.005, bodyY + 0.05, z * w * 0.33]}>
            <boxGeometry args={[0.02, 0.08, 0.2]} /><meshStandardMaterial color="#fff6c2" emissive="#fff6c2" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[-s.len / 2 - 0.005, bodyY + 0.05, z * w * 0.33]}>
            <boxGeometry args={[0.02, 0.08, 0.2]} /><meshStandardMaterial color="#ff4d4d" emissive="#ff4d4d" emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}
      {/* tekerlekler */}
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => (
        <mesh key={`${x}${z}`} position={[x * s.len * 0.32, s.wheel, z * (w / 2)]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[s.wheel, s.wheel, 0.2, 18]} />
          <meshStandardMaterial color="#222" roughness={0.9} />
        </mesh>
      )))}
      {shape === "pickup" && (
        <mesh position={[-s.len * 0.25, s.lift + s.bodyH + 0.08, 0]}>
          <boxGeometry args={[s.len * 0.45, 0.16, w * 0.95]} /><meshStandardMaterial color={color} />
        </mesh>
      )}
    </group>
  );
}
