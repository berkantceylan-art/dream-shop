"use client";
import type { FurnitureType } from "@/lib/home";

function M({ c, r = 0.7, e }: { c: string; r?: number; e?: number }) {
  return <meshStandardMaterial color={c} roughness={r} emissive={e ? c : undefined} emissiveIntensity={e} />;
}

// Kodla üretilen stilize eşyalar. Taban y=0, yaklaşık 1x1 alan kaplar.
export default function Furniture3D({ type, color, selected }: { type: FurnitureType; color: string; selected?: boolean }) {
  return (
    <group>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.75, 0.9, 32]} /><meshBasicMaterial color="#c24dff" />
        </mesh>
      )}
      {type === "sofa" && (
        <group>
          <mesh position={[0, 0.25, 0]} castShadow><boxGeometry args={[1.8, 0.3, 0.8]} /><M c={color} r={0.9} /></mesh>
          <mesh position={[0, 0.55, -0.32]} castShadow><boxGeometry args={[1.8, 0.5, 0.18]} /><M c={color} r={0.9} /></mesh>
          {[-1, 1].map((s) => <mesh key={s} position={[s * 0.85, 0.42, 0]} castShadow><boxGeometry args={[0.16, 0.34, 0.8]} /><M c={color} r={0.9} /></mesh>)}
          {[-0.45, 0.45].map((x) => <mesh key={x} position={[x, 0.45, 0.02]}><boxGeometry args={[0.8, 0.1, 0.6]} /><M c="#ffffff" r={1} /></mesh>)}
        </group>
      )}
      {type === "table" && (
        <group>
          <mesh position={[0, 0.72, 0]} castShadow><boxGeometry args={[1.4, 0.06, 0.8]} /><M c="#c9a27c" /></mesh>
          {[-1, 1].flatMap((x) => [-1, 1].map((z) => (
            <mesh key={`${x}${z}`} position={[x * 0.62, 0.36, z * 0.32]}><cylinderGeometry args={[0.035, 0.035, 0.72]} /><M c="#8d6e63" /></mesh>
          )))}
          {[-1, 1].map((z) => (
            <group key={z} position={[0, 0, z * 0.65]}>
              <mesh position={[0, 0.42, 0]} castShadow><boxGeometry args={[0.4, 0.05, 0.4]} /><M c={color} /></mesh>
              <mesh position={[0, 0.7, z * 0.18]}><boxGeometry args={[0.4, 0.5, 0.05]} /><M c={color} /></mesh>
            </group>
          ))}
        </group>
      )}
      {type === "bed" && (
        <group>
          <mesh position={[0, 0.2, 0]} castShadow><boxGeometry args={[1.5, 0.3, 2]} /><M c="#8d6e63" /></mesh>
          <mesh position={[0, 0.42, 0.1]}><boxGeometry args={[1.4, 0.14, 1.75]} /><M c="#ffffff" r={1} /></mesh>
          <mesh position={[0, 0.51, 0.35]}><boxGeometry args={[1.42, 0.05, 1.3]} /><M c={color} r={1} /></mesh>
          {[-0.35, 0.35].map((x) => <mesh key={x} position={[x, 0.55, -0.7]}><boxGeometry args={[0.55, 0.12, 0.3]} /><M c="#f1f3f5" r={1} /></mesh>)}
          <mesh position={[0, 0.6, -0.98]}><boxGeometry args={[1.5, 0.8, 0.08]} /><M c="#8d6e63" /></mesh>
        </group>
      )}
      {type === "tv" && (
        <group>
          <mesh position={[0, 0.25, 0]} castShadow><boxGeometry args={[1.6, 0.5, 0.45]} /><M c="#f8f9fa" /></mesh>
          <mesh position={[0, 0.95, -0.05]} castShadow><boxGeometry args={[1.5, 0.85, 0.06]} /><M c="#111" r={0.3} /></mesh>
          <mesh position={[0, 0.95, -0.015]}><planeGeometry args={[1.4, 0.76]} /><M c="#4dabf7" e={0.5} /></mesh>
        </group>
      )}
      {(type === "laptop" || type === "phone") && (
        <group>
          <mesh position={[0, 0.36, 0]} castShadow><boxGeometry args={[0.8, 0.72, 0.5]} /><M c="#c9a27c" /></mesh>
          {type === "laptop" ? (
            <>
              <mesh position={[0, 0.73, 0.05]}><boxGeometry args={[0.45, 0.02, 0.3]} /><M c="#adb5bd" r={0.3} /></mesh>
              <mesh position={[0, 0.88, -0.1]} rotation={[-0.3, 0, 0]}><boxGeometry args={[0.45, 0.3, 0.02]} /><M c="#343a40" r={0.3} /></mesh>
            </>
          ) : (
            <mesh position={[0, 0.74, 0]}><boxGeometry args={[0.15, 0.02, 0.28]} /><M c={color} r={0.3} /></mesh>
          )}
        </group>
      )}
      {type === "lamp" && (
        <group>
          <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.03, 0.03, 1.4]} /><M c="#343a40" /></mesh>
          <mesh position={[0, 1.45, 0]}><coneGeometry args={[0.3, 0.35, 20, 1, true]} /><M c={color} e={0.4} /></mesh>
          <pointLight position={[0, 1.3, 0]} intensity={0.6} distance={3} color="#ffe8a3" />
        </group>
      )}
      {(type === "plant" || type === "flower") && (
        <group>
          <mesh position={[0, 0.2, 0]} castShadow><cylinderGeometry args={[0.22, 0.17, 0.4, 16]} /><M c="#e07a5f" /></mesh>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[Math.cos(i * 1.3) * 0.12, 0.55 + (i % 2) * 0.12, Math.sin(i * 1.3) * 0.12]} castShadow>
              <sphereGeometry args={[type === "flower" ? 0.1 : 0.16, 10, 10]} />
              <M c={type === "flower" ? (i % 2 ? "#ff6b9d" : "#ff4d6d") : "#40c057"} />
            </mesh>
          ))}
        </group>
      )}
      {type === "books" && (
        <group>
          <mesh position={[0, 0.6, 0]} castShadow><boxGeometry args={[1, 1.2, 0.35]} /><M c="#c9a27c" /></mesh>
          {[0.35, 0.8].map((y) => [-0.35, -0.2, -0.05, 0.1, 0.25].map((x, i) => (
            <mesh key={`${y}${x}`} position={[x, y, 0.05]}><boxGeometry args={[0.12, 0.3, 0.25]} /><M c={PAL[(i + y * 10) % PAL.length | 0]} /></mesh>
          )))}
        </group>
      )}
      {type === "gym" && (
        <group>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.7, 1.6]} /><M c={color} /></mesh>
          {[-0.2, 0.2].map((x) => <mesh key={x} position={[x, 0.08, 0.5]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.07, 0.07, 0.3, 12]} /><M c="#343a40" /></mesh>)}
        </group>
      )}
      {type === "toy" && (
        <group>
          {[0, 1, 2].map((i) => <mesh key={i} position={[(i - 1) * 0.22, 0.1 + (i === 1 ? 0.2 : 0), 0]} castShadow><boxGeometry args={[0.2, 0.2, 0.2]} /><M c={PAL[i]} /></mesh>)}
        </group>
      )}
      {type === "petbed" && (
        <mesh position={[0, 0.1, 0]} castShadow><torusGeometry args={[0.35, 0.12, 12, 24]} /><M c={color} r={1} /></mesh>
      )}
      {type === "box" && (
        <group>
          <mesh position={[0, 0.25, 0]} castShadow><boxGeometry args={[0.6, 0.5, 0.6]} /><M c="#d9a066" /></mesh>
          <mesh position={[0, 0.505, 0]}><boxGeometry args={[0.62, 0.01, 0.1]} /><M c={color} /></mesh>
        </group>
      )}
    </group>
  );
}
const PAL = ["#ff6b6b", "#4dabf7", "#ffd43b", "#3ddc97", "#c24dff"];
