"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { HomeSceneLazy } from "@/components/3d/Lazy";
import type { PlacedItem } from "@/components/3d/HomeScene";
import type { AvatarConfig } from "@/lib/avatar";
import type { CarShape, HomeSize } from "@/lib/home";
import { saveLayoutAction, setActiveAction } from "./actions";

type Named = PlacedItem & { name: string };

export default function HomeEditor({ size, wallColor, homeName, houses, activeHouse, initialItems, avatar, avatarScale, car }: {
  size: HomeSize; wallColor: string; homeName: string; houses: { id: string; name: string }[]; activeHouse: string | null;
  initialItems: Named[]; avatar: AvatarConfig | null; avatarScale: number; car: { shape: CarShape; color: string } | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [selected, setSelected] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const sel = items.find((i) => i.id === selected);

  const update = (id: string, patch: Partial<PlacedItem>) => {
    setItems((all) => all.map((i) => (i.id === id ? { ...i, ...patch } : i))); setDirty(true); setMsg("");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="game-panel relative h-[62vh] overflow-hidden lg:h-[76vh]">
        <HomeSceneLazy size={size} wallColor={wallColor} items={items} avatar={avatar} avatarScale={avatarScale} car={car}
          selected={selected} onSelect={setSelected} onMove={(id, x, z) => update(id, { x, z })} className="h-full w-full" />
        <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs font-bold text-ink/50">
          {selected ? "Taşımak için zemine tıkla" : "Eşyaya tıkla, sonra zeminde yeni yerine tıkla · Döndürmek için sürükle"}
        </div>
        {sel && (
          <div className="game-panel animate-pop absolute left-3 top-3 flex items-center gap-2 !bg-white p-2 pl-4">
            <b className="text-sm">{sel.name}</b>
            <button className="chip" onClick={() => update(sel.id, { rot: sel.rot + Math.PI / 2 })}>↻ Döndür</button>
            <button className="chip" onClick={() => setSelected(null)}>✓</button>
          </div>
        )}
      </div>

      <aside className="flex flex-col gap-4">
        <section className="game-panel p-5">
          <p className="text-sm font-bold text-ink/50">Şu an buradasın</p>
          <h2 className="font-display text-2xl font-bold">{homeName}</h2>
          {houses.length > 1 && (
            <select className="game-input mt-3" value={activeHouse ?? ""} disabled={pending}
              onChange={(e) => start(async () => { await setActiveAction(e.target.value, "house"); location.reload(); })}>
              {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          {!houses.length && (
            <Link href="/sehir?tur=emlak" className="game-btn mt-3 w-full !py-2">🏡 Ev satın al</Link>
          )}
        </section>

        <section className="game-panel p-5">
          <h3 className="font-display text-lg font-bold">Eşyalar ({items.length})</h3>
          {!items.length ? (
            <p className="mt-2 text-sm font-semibold text-ink/60">Evin boş. Mobilya, elektronik ve dekor al, burada görünsün.</p>
          ) : (
            <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
              {items.map((i) => (
                <button key={i.id} onClick={() => setSelected(i.id)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm font-bold ${selected === i.id ? "bg-crystal text-white" : "bg-white hover:bg-crystal/10"}`}>
                  {i.name}
                </button>
              ))}
            </div>
          )}
          <Link href="/sehir?tur=mobilya" className="mt-3 block text-sm font-bold text-crystal">🛋️ Mobilya mağazasına git →</Link>
        </section>

        {msg && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{msg}</p>}
        <button className="game-btn mint" disabled={!dirty || pending} onClick={() => start(async () => {
          const r = await saveLayoutAction(items.map((i) => ({ item_id: i.id, x: i.x, z: i.z, rot: i.rot })));
          if (r.error) setMsg(r.error); else { setDirty(false); setMsg("Yerleşim kaydedildi ✓"); }
        })}>{pending ? "Kaydediliyor…" : dirty ? "Yerleşimi kaydet" : "Kaydedildi ✓"}</button>
      </aside>
    </div>
  );
}
