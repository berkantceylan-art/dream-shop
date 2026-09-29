"use client";
import { useRef } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import type { Group } from "three";
import type { AvatarConfig } from "@/lib/avatar";
import { HOME_SIZES, type HomeSize, type FurnitureType, type CarShape } from "@/lib/home";
import Avatar3D from "./Avatar3D";
import Furniture3D from "./Furniture3D";
import Car3D from "./Car3D";

export type PlacedItem = { id: string; type: FurnitureType; color: string; x: number; z: number; rot: number };

type Props = {
  size: HomeSize; wallColor: string; items: PlacedItem[]; avatar?: AvatarConfig | null; avatarScale?: number;
  car?: { shape: CarShape; color: string } | null;
  selected?: string | null; onSelect?: (id: string | null) => void; onMove?: (id: string, x: number, z: number) => void;
  className?: string;
};

const snap = (v: number) => Math.round(v * 4) / 4;

export default function HomeScene(props: Props) {
  const { size } = props;
  const h = HOME_SIZES[size];
  const zoom = size === "villa" ? 38 : size === "house" ? 44 : size === "flat" ? 50 : 60;
  return (
    <div className={props.className}>
      <Canvas shadows dpr={[1, 2]} orthographic camera={{ position: [12, 11, 12], zoom, near: 0.1, far: 200 }}>
        <color attach="background" args={[h.garden ? "#bfe3ff" : "#f3ecff"]} />
        <hemisphereLight args={["#ffffff", "#e5d4ff", 1.2]} />
        <directionalLight position={[6, 12, 8]} intensity={1.5} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048}
          shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} />
        <Room {...props} w={h.w} d={h.d} garden={h.garden} pool={h.pool} />
        <OrbitControls enablePan={false} minAzimuthAngle={0} maxAzimuthAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 5} maxPolarAngle={Math.PI / 2.6} minZoom={zoom * 0.6} maxZoom={zoom * 2.2} target={[0, 0, 0]} />
      </Canvas>
    </div>
  );
}

function Room({ w, d, garden, pool, wallColor, items, avatar, avatarScale = 1, car, selected, onSelect, onMove }: Props & {
  w: number; d: number; garden: boolean; pool: boolean;
}) {
  const wallH = 2.6;
  const floorDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (selected && onMove) {
      const x = Math.max(-w / 2 + 0.6, Math.min(w / 2 - 0.6, snap(e.point.x)));
      const z = Math.max(-d / 2 + 0.6, Math.min(d / 2 - 0.6, snap(e.point.z)));
      onMove(selected, x, z);
    } else onSelect?.(null);
  };

  return (
    <group>
      {/* bahçe / dış zemin */}
      {garden && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.5, -0.02, 1.5]} receiveShadow>
            <planeGeometry args={[w + 9, d + 9]} /><meshStandardMaterial color="#8ce0a8" />
          </mesh>
          {/* çit */}
          {Array.from({ length: Math.ceil(w + 8) }).map((_, i) => (
            <mesh key={i} position={[-w / 2 - 1 + i, 0.3, d / 2 + 5.4]}><boxGeometry args={[0.1, 0.6, 0.1]} /><meshStandardMaterial color="#fff" /></mesh>
          ))}
          {[1.2, 2.3].map((x, i) => (
            <group key={i} position={[w / 2 + 1.5 + i * 1.5, 0, -d / 2 + 1 + i * 2]}>
              <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.1, 0.14, 1.2]} /><meshStandardMaterial color="#8d6e63" /></mesh>
              <mesh position={[0, 1.5, 0]} castShadow><sphereGeometry args={[0.7, 14, 14]} /><meshStandardMaterial color="#40c057" /></mesh>
            </group>
          ))}
          {pool && (
            <group position={[w / 2 + 2.2, 0, d / 2 + 1]}>
              <mesh position={[0, 0.05, 0]}><boxGeometry args={[3, 0.1, 4.5]} /><meshStandardMaterial color="#f1f3f5" /></mesh>
              <mesh position={[0, 0.11, 0]}><boxGeometry args={[2.6, 0.02, 4.1]} /><meshStandardMaterial color="#4dd4ff" roughness={0.1} metalness={0.2} /></mesh>
            </group>
          )}
          {car && (
            <group position={[w / 2 + 2.3, 0, -d / 2 + 4.8]} rotation={[0, Math.PI / 2, 0]}><Car3D {...car} /></group>
          )}
        </>
      )}
      {/* zemin (parke) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onPointerDown={floorDown}>
        <planeGeometry args={[w, d]} /><meshStandardMaterial color="#e8c9a0" />
      </mesh>
      {Array.from({ length: Math.floor(w / 0.5) }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-w / 2 + i * 0.5, 0.002, 0]}>
          <planeGeometry args={[0.015, d]} /><meshBasicMaterial color="#d4b088" />
        </mesh>
      ))}
      {/* halı */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.3, 0.004, 0.3]}>
        <circleGeometry args={[Math.min(w, d) * 0.22, 40]} /><meshStandardMaterial color="#ffd6e8" />
      </mesh>
      {/* duvarlar: arka ve sol */}
      <mesh position={[0, wallH / 2, -d / 2 - 0.1]} receiveShadow>
        <boxGeometry args={[w + 0.2, wallH, 0.2]} /><meshStandardMaterial color={wallColor} emissive={wallColor} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[-w / 2 - 0.1, wallH / 2, 0]} receiveShadow>
        <boxGeometry args={[0.2, wallH, d]} /><meshStandardMaterial color={wallColor} emissive={wallColor} emissiveIntensity={0.18} />
      </mesh>
      {/* süpürgelik */}
      <mesh position={[0, 0.06, -d / 2 + 0.01]}><boxGeometry args={[w, 0.12, 0.03]} /><meshStandardMaterial color="#ffffff" /></mesh>
      {/* pencereler */}
      {[-w / 4, w / 4].map((x) => (
        <group key={x} position={[x, 1.5, -d / 2 + 0.01]}>
          <mesh><boxGeometry args={[1.3, 1, 0.04]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <mesh position={[0, 0, 0.02]}><planeGeometry args={[1.15, 0.85]} /><meshStandardMaterial color="#a5d8ff" emissive="#a5d8ff" emissiveIntensity={0.35} /></mesh>
          <mesh position={[0, 0, 0.03]}><boxGeometry args={[0.04, 0.85, 0.01]} /><meshStandardMaterial color="#ffffff" /></mesh>
        </group>
      ))}
      {/* kapı */}
      <mesh position={[-w / 2 + 0.01, 1.05, d / 2 - 1.2]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1, 2.1, 0.05]} /><meshStandardMaterial color="#b07d57" />
      </mesh>

      {/* eşyalar */}
      {items.map((it) => (
        <group key={it.id} position={[it.x, 0, it.z]} rotation={[0, it.rot, 0]}
          onPointerDown={(e) => { e.stopPropagation(); onSelect?.(selected === it.id ? null : it.id); }}>
          <Furniture3D type={it.type} color={it.color} selected={selected === it.id} />
        </group>
      ))}

      {avatar && (
        <group position={[w / 2 - 1.2, 0, d / 2 - 1.2]} rotation={[0, -Math.PI / 4, 0]} scale={0.8}>
          <Avatar3D config={avatar} scale={avatarScale} />
        </group>
      )}
      <ContactShadows position={[0, 0.01, 0]} opacity={0.25} scale={Math.max(w, d) * 1.4} blur={2} far={3} />
    </group>
  );
}

// Garaj
export function GarageScene({ cars, active, onPick, className }: {
  cars: { id: string; shape: CarShape; color: string; name: string }[]; active: string | null;
  onPick?: (id: string) => void; className?: string;
}) {
  const n = Math.max(cars.length, 2);
  const w = n * 3 + 2;
  return (
    <div className={className}>
      <Canvas shadows dpr={[1, 2]} orthographic camera={{ position: [10, 9, 12], zoom: Math.max(30, 70 - n * 5), near: 0.1, far: 200 }}>
        <color attach="background" args={["#e9edf5"]} />
        <hemisphereLight args={["#ffffff", "#c9d3ea", 1.1]} />
        <directionalLight position={[5, 10, 6]} intensity={1.5} castShadow />
        <group position={[-(w / 2) + 1.5, 0, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2 - 1.5, 0, 0.5]} receiveShadow>
            <planeGeometry args={[w, 8]} /><meshStandardMaterial color="#b9bfcc" />
          </mesh>
          <mesh position={[w / 2 - 1.5, 1.5, -3.6]}><boxGeometry args={[w, 3, 0.2]} /><meshStandardMaterial color="#dfe4ee" /></mesh>
          <mesh position={[w / 2 - 1.5, 2.6, -3.48]}><boxGeometry args={[w, 0.25, 0.02]} /><meshStandardMaterial color="#c24dff" emissive="#c24dff" emissiveIntensity={0.4} /></mesh>
          {cars.map((c, i) => (
            <group key={c.id} position={[i * 3, 0, 0]}>
              {/* park çizgileri */}
              {[-1.5, 1.5].map((x) => (
                <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.005, 0]}><planeGeometry args={[0.08, 5]} /><meshBasicMaterial color="#ffffff" /></mesh>
              ))}
              <Turntable on={c.id === active}>
                <group rotation={[0, Math.PI / 2, 0]} onPointerDown={(e) => { e.stopPropagation(); onPick?.(c.id); }}>
                  <Car3D shape={c.shape} color={c.color} />
                </group>
              </Turntable>
            </group>
          ))}
        </group>
        <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={w + 4} blur={2} far={3} />
        <OrbitControls enablePan={false} minAzimuthAngle={-0.2} maxAzimuthAngle={Math.PI / 2} minPolarAngle={Math.PI / 5} maxPolarAngle={Math.PI / 2.5} />
      </Canvas>
    </div>
  );
}

function Turntable({ on, children }: { on: boolean; children: React.ReactNode }) {
  const g = useRef<Group>(null);
  useFrame((_, dt) => { if (g.current) g.current.rotation.y = on ? g.current.rotation.y + dt * 0.8 : 0; });
  return (
    <group>
      {on && <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[1.6, 1.6, 0.06, 40]} /><meshStandardMaterial color="#c24dff" /></mesh>}
      <group ref={g} position={[0, on ? 0.06 : 0, 0]}>{children}</group>
    </group>
  );
}
