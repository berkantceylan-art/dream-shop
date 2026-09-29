"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AvatarStageLazy } from "@/components/3d/Lazy";
import {
  type AvatarConfig, type BodyType, type HairStyle, type TopStyle, type BottomStyle,
  SKIN_TONES, HAIR_COLORS, EYE_COLORS, CLOTH_COLORS, BODY_LABELS, HAIR_LABELS, TOP_LABELS, BOTTOM_LABELS,
} from "@/lib/avatar";
import { saveAvatar } from "./actions";

const TABS = [
  { id: "ten", label: "Ten", icon: "🎨" },
  { id: "vucut", label: "Vücut", icon: "🧍" },
  { id: "sac", label: "Saç", icon: "💇" },
  { id: "yuz", label: "Yüz", icon: "👀" },
  { id: "kiyafet", label: "Kıyafet", icon: "👕" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function AvatarEditor({ initial, scale, isNew }: { initial: AvatarConfig; scale: number; isNew: boolean }) {
  const router = useRouter();
  const [c, setC] = useState(initial);
  const [tab, setTab] = useState<Tab>("ten");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  const randomize = () => {
    const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
    setC({
      skin: pick(SKIN_TONES), hairColor: pick(HAIR_COLORS), eyes: pick(EYE_COLORS), shoes: pick(CLOTH_COLORS),
      body: pick(Object.keys(BODY_LABELS) as BodyType[]),
      hair: pick(Object.keys(HAIR_LABELS) as HairStyle[]),
      top: { style: pick(Object.keys(TOP_LABELS) as TopStyle[]), color: pick(CLOTH_COLORS) },
      bottom: { style: pick(Object.keys(BOTTOM_LABELS) as BottomStyle[]), color: pick(CLOTH_COLORS) },
    });
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-4 p-4 lg:grid-cols-[1fr_380px]">
      {/* 3D önizleme */}
      <div className="game-panel relative h-[46vh] overflow-hidden lg:h-[78vh]">
        <AvatarStageLazy config={c} scale={scale} className="h-full w-full" />
        <button onClick={randomize} className="game-btn ghost absolute left-4 top-4 !px-3 !py-2 !text-base">🎲 Rastgele</button>
        <p className="pointer-events-none absolute bottom-3 w-full text-center text-xs font-bold text-ink/40">
          Döndürmek için sürükle
        </p>
      </div>

      {/* Düzenleme paneli */}
      <div className="game-panel flex flex-col p-5">
        <h1 className="font-display text-2xl font-bold">{isNew ? "Karakterini oluştur" : "Karakterini düzenle"}</h1>
        <div className="mt-4 grid grid-cols-5 gap-1.5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex flex-col items-center rounded-2xl py-2 text-xs font-bold transition
                ${tab === t.id ? "bg-crystal text-white shadow-[0_4px_0_#7a1fb8]" : "bg-white text-ink/70"}`}>
              <span className="text-xl">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        <div className="mt-5 flex-1 space-y-5 overflow-y-auto">
          {tab === "ten" && <Swatches title="Ten rengi" colors={SKIN_TONES} value={c.skin} onPick={(v) => setC({ ...c, skin: v })} />}
          {tab === "vucut" && (
            <Options title="Vücut tipi" labels={BODY_LABELS} value={c.body} onPick={(v) => setC({ ...c, body: v })} />
          )}
          {tab === "sac" && (
            <>
              <Options title="Saç modeli" labels={HAIR_LABELS} value={c.hair} onPick={(v) => setC({ ...c, hair: v })} />
              <Swatches title="Saç rengi" colors={HAIR_COLORS} value={c.hairColor} onPick={(v) => setC({ ...c, hairColor: v })} />
            </>
          )}
          {tab === "yuz" && <Swatches title="Göz rengi" colors={EYE_COLORS} value={c.eyes} onPick={(v) => setC({ ...c, eyes: v })} />}
          {tab === "kiyafet" && (
            <>
              <p className="rounded-xl bg-gold/20 p-3 text-xs font-bold text-ink/70">
                Başlangıç kıyafetleri ücretsiz. Markalı ürünleri mağazalardan kredinle alıp giydirebileceksin.
              </p>
              <Options title="Üst" labels={TOP_LABELS} value={c.top.style} onPick={(v) => setC({ ...c, top: { ...c.top, style: v } })} />
              <Swatches colors={CLOTH_COLORS} value={c.top.color} onPick={(v) => setC({ ...c, top: { ...c.top, color: v } })} />
              <Options title="Alt" labels={BOTTOM_LABELS} value={c.bottom.style} onPick={(v) => setC({ ...c, bottom: { ...c.bottom, style: v } })} />
              <Swatches colors={CLOTH_COLORS} value={c.bottom.color} onPick={(v) => setC({ ...c, bottom: { ...c.bottom, color: v } })} />
              <Swatches title="Ayakkabı" colors={CLOTH_COLORS} value={c.shoes} onPick={(v) => setC({ ...c, shoes: v })} />
            </>
          )}
        </div>

        {err && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{err}</p>}
        <button className="game-btn mint mt-4" disabled={pending} onClick={() => start(async () => {
          setErr("");
          const r = await saveAvatar(c);
          if (r.error) setErr(r.error); else { router.push("/hesap"); router.refresh(); }
        })}>
          {pending ? "Karakterin kaydediliyor…" : "Kaydet ve şehre çık →"}
        </button>
      </div>
    </div>
  );
}

function Swatches({ title, colors, value, onPick }: { title?: string; colors: string[]; value: string; onPick: (v: string) => void }) {
  return (
    <div>
      {title && <p className="mb-2 font-display font-semibold">{title}</p>}
      <div className="flex flex-wrap gap-2">
        {colors.map((col) => (
          <button key={col} aria-label={col} onClick={() => onPick(col)}
            className={`h-10 w-10 rounded-full border-4 transition hover:scale-110 ${value === col ? "border-crystal scale-110" : "border-white"}`}
            style={{ background: col, boxShadow: "0 3px 0 #00000022" }} />
        ))}
      </div>
    </div>
  );
}

function Options<T extends string>({ title, labels, value, onPick }: {
  title: string; labels: Record<T, string>; value: T; onPick: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-display font-semibold">{title}</p>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(labels) as T[]).map((k) => (
          <button key={k} className="chip" data-on={value === k} onClick={() => onPick(k)}>{labels[k]}</button>
        ))}
      </div>
    </div>
  );
}
