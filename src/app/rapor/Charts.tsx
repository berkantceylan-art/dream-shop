"use client";
import { useState } from "react";

// Tek tonlu (mor) grafik bileşenleri. Kimlik renkle değil etiketle taşınır.
export const HUE = "#9b3fd9";
const fmt = (n: number | null | undefined) => (n == null ? "—" : Number(n).toLocaleString("tr-TR"));

export function BarList({ rows, suffix = "kişi", max: forcedMax, highlight }: {
  rows: { label: string; value: number | null; sub?: string }[]; suffix?: string; max?: number; highlight?: string;
}) {
  const max = forcedMax ?? Math.max(1, ...rows.map((r) => r.value ?? 0));
  const total = rows.reduce((a, r) => a + (r.value ?? 0), 0);
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="group grid grid-cols-[minmax(80px,170px)_1fr_auto] items-center gap-3" title={`${r.label}: ${fmt(r.value)} ${suffix}`}>
          <span className={`truncate text-sm ${r.label === highlight ? "font-extrabold" : "font-bold"}`}>{r.label}</span>
          <div className="h-5 rounded-r-[4px] bg-[#f1ecf8]">
            {r.value != null
              ? <div className="h-full rounded-r-[4px] transition-all group-hover:brightness-110" style={{ width: `${Math.max(1, (r.value / max) * 100)}%`, background: HUE, opacity: r.label === highlight || !highlight ? 1 : 0.55 }} />
              : <div className="h-full w-full rounded-r-[4px] [background:repeating-linear-gradient(135deg,#e6e0ef_0_4px,transparent_4px_8px)]" />}
          </div>
          <span className="w-32 text-right text-sm font-bold">
            {r.value == null ? <span className="text-ink/40">&lt;10 gizli</span> : <>{fmt(r.value)} <span className="font-semibold text-ink/40">{total ? `%${Math.round((r.value / total) * 100)}` : ""}</span></>}
            {r.sub && <span className="block text-[11px] font-semibold text-ink/50">{r.sub}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Tek serili çizgi grafik + gezinen imleç ve ipucu */
export function LineChart({ points, yLabel = "kişi" }: { points: { x: string; y: number | null }[]; yLabel?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 220, P = { l: 44, r: 12, t: 12, b: 28 };
  const vals = points.map((p) => p.y ?? 0);
  const max = Math.max(10, ...vals);
  const x = (i: number) => P.l + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (W - P.l - P.r));
  const y = (v: number) => P.t + (1 - v / max) * (H - P.t - P.b);
  const path = points.map((p, i) => (p.y == null ? null : `${x(i)},${y(p.y)}`)).filter(Boolean).join(" L ");
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t));
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const rel = ((e.clientX - r.left) / r.width) * W;
          setHover(Math.max(0, Math.min(points.length - 1, Math.round(((rel - P.l) / (W - P.l - P.r)) * (points.length - 1)))));
        }}>
        {ticks.map((t) => (
          <g key={t}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="#e9e4f2" /><text x={P.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#8a8fa3">{t.toLocaleString("tr-TR")}</text></g>
        ))}
        {path && <path d={`M ${path}`} fill="none" stroke={HUE} strokeWidth={2} strokeLinejoin="round" />}
        {points.map((p, i) => p.y != null && <circle key={i} cx={x(i)} cy={y(p.y)} r={hover === i ? 5 : 3} fill={HUE} stroke="#fff" strokeWidth={2} />)}
        {points.length > 0 && [0, Math.floor(points.length / 2), points.length - 1].map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="11" fill="#8a8fa3">{points[i].x}</text>
        ))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="#1e2a4a" strokeOpacity={0.25} />}
      </svg>
      {hover != null && points[hover] && (
        <div className="pointer-events-none absolute top-2 rounded-xl bg-ink px-3 py-1.5 text-xs font-bold text-white shadow"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: "translateX(-50%)" }}>
          {points[hover].x}: {points[hover].y == null ? "<10 (gizli)" : `${fmt(points[hover].y)} ${yLabel}`}
        </div>
      )}
    </div>
  );
}

const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
/** Gün × saat ısı haritası (tek ton, açık → koyu) */
export function Heatmap({ cells }: { cells: { dow: number; hour: number; users: number | null }[] }) {
  const map = new Map(cells.map((c) => [`${c.dow}-${c.hour}`, c.users]));
  const max = Math.max(1, ...cells.map((c) => c.users ?? 0));
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[560px] gap-[2px]" style={{ gridTemplateColumns: `36px repeat(24, minmax(18px, 1fr))` }}>
        <span />
        {Array.from({ length: 24 }, (_, h) => <span key={h} className="text-center text-[10px] font-bold text-ink/40">{h % 3 === 0 ? h : ""}</span>)}
        {DAYS.map((d, di) => (
          <div key={d} className="contents">
            <span className="self-center text-xs font-bold text-ink/60">{d}</span>
            {Array.from({ length: 24 }, (_, h) => {
              const k = `${di + 1}-${h}`; const v = map.get(k);
              return (
                <span key={h} onMouseEnter={() => setHover(`${d} ${String(h).padStart(2, "0")}:00 — ${v == null ? (map.has(k) ? "<10 (gizli)" : "veri yok") : `${v} kişi`}`)}
                  onMouseLeave={() => setHover(null)} className="h-6 rounded-[3px]"
                  style={{ background: v == null ? (map.has(k) ? "repeating-linear-gradient(135deg,#e6e0ef 0 3px,#f7f4fb 3px 6px)" : "#f4f1f8") : HUE, opacity: v == null ? 1 : 0.15 + 0.85 * (v / max) }} />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs font-bold text-ink/50">
        <span>Az</span><span className="h-3 w-24 rounded" style={{ background: `linear-gradient(90deg, ${HUE}26, ${HUE})` }} /><span>Çok</span>
        <span className="ml-4 inline-block h-3 w-3 rounded [background:repeating-linear-gradient(135deg,#e6e0ef_0_3px,#f7f4fb_3px_6px)]" /> &lt;10 kişi (gizli)
        {hover && <span className="ml-auto rounded-lg bg-ink px-2 py-0.5 text-white">{hover}</span>}
      </div>
    </div>
  );
}

export function Kpi({ label, value, sub }: { label: string; value: string | number | null | undefined; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-ink/50">{label}</p>
      <p className="font-display text-3xl font-bold">{value == null ? <span className="text-ink/30">&lt;10</span> : typeof value === "number" ? fmt(value) : value}</p>
      {sub && <p className="text-xs font-semibold text-ink/50">{sub}</p>}
    </div>
  );
}
