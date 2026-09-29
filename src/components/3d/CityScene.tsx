"use client";
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group } from "three";
import CrystalMesh from "./CrystalMesh";

// Kodla üretilen izometrik mini şehir. Türkiye saatine göre gündüz / gün batımı / gece.
type Phase = "gunduz" | "aksam" | "gece";
function phaseNow(): Phase {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/Istanbul" }).format(new Date()));
  if (h >= 7 && h < 17) return "gunduz";
  if (h >= 17 && h < 20) return "aksam";
  return "gece";
}
const PALETTE: Record<Phase, { bg: string; hemi: [string, string, number]; sun: number; window: string; glow: number }> = {
  gunduz: { bg: "#bfe3ff", hemi: ["#ffffff", "#b6e3c6", 1.2], sun: 1.6, window: "#dff1ff", glow: 0 },
  aksam:  { bg: "#ffc9a8", hemi: ["#ffd9c2", "#8f7bd6", 1.0], sun: 1.1, window: "#ffd27a", glow: 0.6 },
  gece:   { bg: "#1b2350", hemi: ["#8f9cff", "#3a4580", 1.3], sun: 0.6, window: "#ffd27a", glow: 1.4 },
};
const COLORS = ["#ffd6e8", "#c9e4ff", "#fff1b8", "#e5d4ff", "#c8f5e1", "#ffe0cc"];

function rand(seed: number) { const x = Math.sin(seed * 999) * 10000; return x - Math.floor(x); }

function Buildings({ win, glow }: { win: string; glow: number }) {
  const blocks = useMemo(() => {
    const out: { x: number; z: number; w: number; d: number; h: number; c: string; mall: boolean }[] = [];
    for (let gx = -3; gx <= 3; gx++)
      for (let gz = -3; gz <= 3; gz++) {
        if (gx === 0 || gz === 0) continue; // ana yollar
        const s = gx * 7 + gz * 13;
        const mall = gx === 1 && gz === 1;
        out.push({
          x: gx * 1.6 - Math.sign(gx) * 0.4, z: gz * 1.6 - Math.sign(gz) * 0.4,
          w: mall ? 1.3 : 0.7 + rand(s) * 0.4, d: mall ? 1.3 : 0.7 + rand(s + 1) * 0.4,
          h: mall ? 0.9 : 0.4 + rand(s + 2) * (3 - Math.max(Math.abs(gx), Math.abs(gz)) * 0.6 + 0.8),
          c: mall ? "#ff9fd0" : COLORS[Math.floor(rand(s + 3) * COLORS.length)], mall,
        });
      }
    return out;
  }, []);
  return (
    <>
      {blocks.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]}>
          <mesh position={[0, b.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color={b.c} roughness={0.8} />
          </mesh>
          {/* pencere bantları */}
          {Array.from({ length: Math.max(1, Math.floor(b.h / 0.35)) }).map((_, k) => (
            <mesh key={k} position={[0, 0.22 + k * 0.35, 0]}>
              <boxGeometry args={[b.w + 0.01, 0.08, b.d + 0.01]} />
              <meshStandardMaterial color={win} emissive={win} emissiveIntensity={glow} />
            </mesh>
          ))}
          {b.mall && <CrystalMesh position={[0, b.h + 0.5, 0]} size={0.22} />}
        </group>
      ))}
    </>
  );
}

function Cars() {
  const g = useRef<Group>(null);
  const cars = useMemo(() => [
    { axis: "x", lane: 0.18, speed: 1.1, off: 0, c: "#ff6b6b" },
    { axis: "x", lane: -0.18, speed: -0.8, off: 3, c: "#4dabf7" },
    { axis: "z", lane: 0.18, speed: 0.9, off: 1, c: "#ffd43b" },
    { axis: "z", lane: -0.18, speed: -1.2, off: 5, c: "#3ddc97" },
  ], []);
  useFrame(({ clock }) => {
    g.current?.children.forEach((m, i) => {
      const c = cars[i];
      const p = ((clock.elapsedTime * c.speed + c.off) % 12 + 12) % 12 - 6;
      if (c.axis === "x") m.position.set(p, 0.1, c.lane); else m.position.set(c.lane, 0.1, p);
      m.rotation.y = c.axis === "x" ? 0 : Math.PI / 2;
    });
  });
  return (
    <group ref={g}>
      {cars.map((c, i) => (
        <mesh key={i} castShadow>
          <boxGeometry args={[0.36, 0.16, 0.2]} />
          <meshStandardMaterial color={c.c} />
        </mesh>
      ))}
    </group>
  );
}

function Rotator({ children }: { children: React.ReactNode }) {
  const g = useRef<Group>(null);
  useFrame((_, dt) => { if (g.current) g.current.rotation.y += dt * 0.05; });
  return <group ref={g}>{children}</group>;
}

export default function CityScene({ className = "" }: { className?: string }) {
  const phase = useMemo(phaseNow, []);
  const p = PALETTE[phase];
  return (
    <div className={className} style={{ background: p.bg }}>
      <Canvas shadows dpr={[1, 1.5]} orthographic camera={{ position: [10, 9, 10], zoom: 55, near: 0.1, far: 100 }}>
        <hemisphereLight args={p.hemi} />
        <directionalLight position={[6, 10, 4]} intensity={p.sun} castShadow />
        <group position={[0, -2.2, 0]}>
          <Rotator>
            {/* zemin */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[13, 13]} />
              <meshStandardMaterial color={phase === "gece" ? "#4f8f6c" : "#9be3b5"} />
            </mesh>
            {/* yollar */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <planeGeometry args={[13, 0.7]} />
              <meshStandardMaterial color="#6b7394" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.01, 0]}>
              <planeGeometry args={[13, 0.7]} />
              <meshStandardMaterial color="#6b7394" />
            </mesh>
            <Buildings win={p.window} glow={p.glow} />
            <Cars />
          </Rotator>
        </group>
      </Canvas>
    </div>
  );
}
