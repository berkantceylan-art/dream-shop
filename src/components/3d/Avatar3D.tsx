"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import type { AvatarConfig, BodyType } from "@/lib/avatar";
import CrystalMesh from "./CrystalMesh";

// Stilize, kodla üretilen karakter (yer tutucu). Ayaklar y=0, boy ~2.1 birim.
// Sanatçı modelleri geldiğinde bu bileşen aynı AvatarConfig ile .glb parçalarını yükleyen sürümle değiştirilecek.

const BODY: Record<BodyType, { r: number; sx: number; arm: number; leg: number }> = {
  ince:    { r: 0.25, sx: 0.95, arm: 0.075, leg: 0.11 },
  normal:  { r: 0.29, sx: 1.0,  arm: 0.085, leg: 0.125 },
  dolgun:  { r: 0.35, sx: 1.08, arm: 0.1,   leg: 0.145 },
  atletik: { r: 0.3,  sx: 1.18, arm: 0.1,   leg: 0.13 },
};

function Mat({ color, rough = 0.7 }: { color: string; rough?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} />;
}

export default function Avatar3D({ config, scale = 1, showCrystal = true }: {
  config: AvatarConfig; scale?: number; showCrystal?: boolean;
}) {
  const root = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const eyes = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (root.current) root.current.position.y = Math.sin(t * 2) * 0.012;
    if (armL.current) armL.current.rotation.z = 0.12 + Math.sin(t * 1.6) * 0.04;
    if (armR.current) armR.current.rotation.z = -0.12 - Math.sin(t * 1.6) * 0.04;
    if (eyes.current) eyes.current.scale.y = (t % 4) > 3.88 ? 0.1 : 1; // göz kırpma
  });

  const b = BODY[config.body];
  const { skin, top, bottom } = config;
  const longSleeve = top.style !== "tisort";
  const shoulderX = b.r * b.sx + b.arm * 0.6;

  return (
    <group scale={scale}>
      <group ref={root}>
        {/* ---------- Bacaklar ---------- */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.14 * b.sx, 0, 0]}>
            {/* üst bacak */}
            <mesh position={[0, 0.52, 0]} castShadow>
              <capsuleGeometry args={[b.leg, 0.2, 6, 16]} />
              <Mat color={bottom.style === "etek" ? skin : bottom.color} />
            </mesh>
            {/* alt bacak */}
            <mesh position={[0, 0.26, 0]} castShadow>
              <capsuleGeometry args={[b.leg * 0.92, 0.2, 6, 16]} />
              <Mat color={bottom.style === "kot" ? bottom.color : skin} />
            </mesh>
            {/* ayakkabı */}
            <mesh position={[0, 0.06, 0.05]} castShadow>
              <boxGeometry args={[b.leg * 2 + 0.03, 0.12, 0.34]} />
              <Mat color={config.shoes} rough={0.5} />
            </mesh>
          </group>
        ))}

        {bottom.style === "etek" && (
          <mesh position={[0, 0.62, 0]} castShadow>
            <cylinderGeometry args={[b.r * 0.95, b.r * 1.45, 0.34, 24]} />
            <Mat color={bottom.color} />
          </mesh>
        )}
        {/* bel / kalça */}
        <mesh position={[0, 0.72, 0]} castShadow>
          <cylinderGeometry args={[b.r * 0.98, b.r * 1.02, 0.14, 24]} />
          <Mat color={bottom.color} />
        </mesh>

        {/* ---------- Gövde ---------- */}
        <mesh position={[0, 1.0, 0]} scale={[b.sx, 1, 0.85]} castShadow>
          <capsuleGeometry args={[b.r, 0.3, 8, 20]} />
          <Mat color={top.color} />
        </mesh>
        {top.style === "kapusonlu" && (
          <>
            <mesh position={[0, 1.28, -0.16]} rotation={[0.5, 0, 0]} castShadow>
              <torusGeometry args={[0.2, 0.07, 10, 20]} />
              <Mat color={top.color} />
            </mesh>
            <mesh position={[0, 0.9, b.r * 0.86]}>
              <boxGeometry args={[0.3, 0.13, 0.02]} />
              <meshStandardMaterial color="#000000" transparent opacity={0.15} />
            </mesh>
          </>
        )}
        {top.style === "gomlek" && (
          <>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.07, 1.3, 0.14]} rotation={[0.3, 0, s * 0.5]}>
                <boxGeometry args={[0.12, 0.06, 0.02]} />
                <Mat color="#ffffff" />
              </mesh>
            ))}
            {[1.18, 1.04, 0.9].map((y) => (
              <mesh key={y} position={[0, y, b.r * 0.87]}>
                <sphereGeometry args={[0.018, 8, 8]} />
                <Mat color="#ffffff" />
              </mesh>
            ))}
          </>
        )}

        {/* ---------- Kollar ---------- */}
        {[-1, 1].map((s) => (
          <group key={s} ref={s < 0 ? armL : armR} position={[s * shoulderX, 1.2, 0]}>
            <mesh position={[0, -0.12, 0]} castShadow>
              <capsuleGeometry args={[b.arm + 0.012, 0.12, 6, 12]} />
              <Mat color={top.color} />
            </mesh>
            <mesh position={[0, -0.3, 0]} castShadow>
              <capsuleGeometry args={[b.arm, 0.2, 6, 12]} />
              <Mat color={longSleeve ? top.color : skin} />
            </mesh>
            <mesh position={[0, -0.48, 0]} castShadow>
              <sphereGeometry args={[b.arm * 1.15, 12, 12]} />
              <Mat color={skin} />
            </mesh>
          </group>
        ))}

        {/* ---------- Boyun & Kafa ---------- */}
        <mesh position={[0, 1.33, 0]}>
          <cylinderGeometry args={[0.08, 0.09, 0.1, 12]} />
          <Mat color={skin} />
        </mesh>
        <group position={[0, 1.7, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.4, 32, 32]} />
            <Mat color={skin} rough={0.6} />
          </mesh>
          {/* kulaklar */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.39, -0.02, 0]}>
              <sphereGeometry args={[0.07, 12, 12]} />
              <Mat color={skin} />
            </mesh>
          ))}
          {/* gözler */}
          <group ref={eyes} position={[0, 0.02, 0.36]}>
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.13, 0, 0]}>
                <mesh scale={[1, 1.25, 0.6]}>
                  <sphereGeometry args={[0.055, 16, 16]} />
                  <meshStandardMaterial color={config.eyes} roughness={0.2} />
                </mesh>
                <mesh position={[0.018, 0.025, 0.03]}>
                  <sphereGeometry args={[0.016, 8, 8]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              </group>
            ))}
          </group>
          {/* yanaklar */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.22, -0.1, 0.32]} rotation={[0, s * 0.5, 0]}>
              <circleGeometry args={[0.05, 16]} />
              <meshBasicMaterial color="#ff8aa8" transparent opacity={0.45} />
            </mesh>
          ))}
          {/* ağız */}
          <mesh position={[0, -0.14, 0.375]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.05, 0.012, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#8a3b2e" />
          </mesh>
          <Hair style={config.hair} color={config.hairColor} />
        </group>

        {showCrystal && <CrystalMesh position={[0, 2.45, 0]} size={0.17} />}
      </group>
    </group>
  );
}

function Hair({ style, color }: { style: AvatarConfig["hair"]; color: string }) {
  if (style === "kel") return null;
  const m = <meshStandardMaterial color={color} roughness={0.8} />;
  // kafanın üstünü saran kep
  const cap = (
    <mesh rotation={[-0.35, 0, 0]} castShadow>
      <sphereGeometry args={[0.425, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
      {m}
    </mesh>
  );
  switch (style) {
    case "kisa":
      return cap;
    case "uzun":
      return (
        <group>
          {cap}
          <mesh position={[0, -0.25, -0.16]} castShadow>
            <capsuleGeometry args={[0.34, 0.35, 8, 16]} />
            {m}
          </mesh>
        </group>
      );
    case "topuz":
      return (
        <group>
          {cap}
          <mesh position={[0, 0.42, -0.12]} castShadow>
            <sphereGeometry args={[0.16, 16, 16]} />
            {m}
          </mesh>
        </group>
      );
    case "atkuyrugu":
      return (
        <group>
          {cap}
          <mesh position={[0, 0.05, -0.45]} rotation={[0.5, 0, 0]} castShadow>
            <capsuleGeometry args={[0.09, 0.35, 6, 12]} />
            {m}
          </mesh>
        </group>
      );
    case "kivircik": {
      const puffs: [number, number, number][] = [];
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        puffs.push([Math.cos(a) * 0.36, 0.24 + (i % 2) * 0.06, Math.sin(a) * 0.36 - 0.04]);
      }
      puffs.push([0, 0.38, 0], [0.15, 0.34, -0.1], [-0.15, 0.34, -0.1], [0, 0.3, 0.18]);
      return (
        <group>
          {puffs.filter(([, , z]) => z < 0.25).map((p, i) => (
            <mesh key={i} position={p} castShadow>
              <sphereGeometry args={[0.15, 12, 12]} />
              {m}
            </mesh>
          ))}
        </group>
      );
    }
  }
}
