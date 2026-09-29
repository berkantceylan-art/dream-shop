// Dekoratif arka plan: gökyüzü, bulutlar ve izometrik mini şehir silüeti.
// (Canlı 3D şehir, React Three Fiber ile avatar adımında gelecek.)
export default function SkyScene({ children }: { children: React.ReactNode }) {
  const clouds = [
    { top: "8%", size: 140, dur: 70, delay: -10 },
    { top: "18%", size: 90, dur: 55, delay: -40 },
    { top: "30%", size: 120, dur: 85, delay: -60 },
  ];
  const blocks = [
    { x: 4, h: 90, c: "#ffd6e8" }, { x: 13, h: 150, c: "#c9e4ff" }, { x: 22, h: 110, c: "#fff1b8" },
    { x: 31, h: 200, c: "#e5d4ff" }, { x: 42, h: 130, c: "#c8f5e1" }, { x: 52, h: 240, c: "#ffd6e8" },
    { x: 63, h: 120, c: "#c9e4ff" }, { x: 72, h: 170, c: "#fff1b8" }, { x: 82, h: 100, c: "#e5d4ff" },
    { x: 90, h: 145, c: "#c8f5e1" },
  ];
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-top via-sky-bottom to-cream">
      {clouds.map((c, i) => (
        <div key={i} className="pointer-events-none absolute left-0 rounded-full bg-white/80 blur-[2px]"
          style={{ top: c.top, width: c.size, height: c.size * 0.4, animation: `drift ${c.dur}s linear ${c.delay}s infinite` }} />
      ))}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[260px]">
        {blocks.map((b, i) => (
          <div key={i} className="absolute bottom-0 rounded-t-2xl border-2 border-white/70"
            style={{ left: `${b.x}%`, width: "8%", height: b.h, background: b.c,
              backgroundImage: "repeating-linear-gradient(0deg, transparent 0 18px, #ffffff66 18px 26px)" }} />
        ))}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-[#9be3b5]" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
