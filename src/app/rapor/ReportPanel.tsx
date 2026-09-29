"use client";
import { useState, useTransition } from "react";
import { runReport, type Filters, type Row } from "./actions";

type Opt = { id: number | string; name: string };
const INTEREST_GROUPS = [["kind", "Ürün türü"], ["category", "Kategori"], ["brand", "Marka"], ["product", "Ürün"], ["city", "Şehir"],
  ["age_band", "Yaş grubu"], ["gender", "Cinsiyet"], ["month", "Ay"], ["event", "Etkileşim türü"]] as const;
const PROFILE_FIELDS = [["shoe_size", "Ayakkabı numarası"], ["top_size", "Üst beden"], ["bottom_size", "Alt beden (bel)"], ["height_band", "Boy"],
  ["income_band", "Gelir aralığı"], ["housing", "Konut durumu"], ["owns_car", "Araba sahipliği"], ["occupation", "Meslek"], ["education", "Eğitim"],
  ["marital_status", "Medeni durum"], ["children_count", "Çocuk sayısı"], ["interests", "İlgi alanları"], ["city", "Şehir"], ["age_band", "Yaş grubu"], ["gender", "Cinsiyet"]] as const;
const EVENTS = [["", "Tüm etkileşimler"], ["view", "Görüntüleme"], ["wishlist", "İstek listesi"], ["purchase", "Satın alma"], ["resale", "2. el alım"]];
const KINDS = [["", "Tüm türler"], ["clothing", "Giyim"], ["accessory", "Aksesuar"], ["car", "Otomobil"], ["house", "Konut"], ["furniture", "Mobilya"], ["other", "Diğer"]];
const LABELS: Record<string, string> = { clothing: "Giyim", accessory: "Aksesuar", car: "Otomobil", house: "Konut", furniture: "Mobilya", other: "Diğer",
  view: "Görüntüleme", wishlist: "İstek listesi", purchase: "Satın alma", resale: "2. el alım", kadin: "Kadın", erkek: "Erkek", diger: "Diğer",
  owner: "Ev sahibi", tenant: "Kiracı", family: "Ailesiyle" };

export default function ReportPanel({ cities, categories }: { cities: Opt[]; categories: Opt[] }) {
  const [kind, setKind] = useState<"interest" | "profile">("interest");
  const [f, setF] = useState<Filters>({ group_by: "kind", field: "shoe_size" });
  const [rows, setRows] = useState<Row[] | null>(null);
  const [size, setSize] = useState<number | null | undefined>(undefined);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  const run = () => start(async () => {
    setErr("");
    const { group_by, field, ...rest } = f;
    const r = await runReport(kind, kind === "interest" ? { ...rest, group_by } : { ...rest, field });
    if (r.error) { setErr(r.error); setRows(null); } else { setRows(r.rows ?? []); setSize(r.size); }
  });

  const csv = () => {
    if (!rows) return;
    const head = kind === "interest" ? "etiket;kullanici;etkilesim" : "etiket;kullanici";
    const body = rows.map((r) => [LABELS[r.label] ?? r.label, r.users, ...(kind === "interest" ? [r.events] : [])].join(";")).join("\n");
    const blob = new Blob(["﻿" + head + "\n" + body], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `dream-shop-rapor-${kind}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  const max = Math.max(1, ...(rows ?? []).map((r) => r.users));
  const total = (rows ?? []).reduce((a, r) => a + r.users, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="game-panel flex h-fit flex-col gap-3 p-5">
        <div className="grid grid-cols-2 gap-2">
          <button className="chip" data-on={kind === "interest"} onClick={() => { setKind("interest"); setRows(null); }}>🛍️ İlgi raporu</button>
          <button className="chip" data-on={kind === "profile"} onClick={() => { setKind("profile"); setRows(null); }}>👤 Profil dağılımı</button>
        </div>
        <p className="text-xs font-bold uppercase tracking-wide text-ink/40">Segment</p>
        <select className="game-input !py-2" value={f.city_id ?? ""} onChange={(e) => set("city_id", e.target.value)}>
          <option value="">Tüm Türkiye</option>{cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input className="game-input !py-2" type="number" min={18} max={99} placeholder="Yaş min" value={f.age_min ?? ""} onChange={(e) => set("age_min", e.target.value)} />
          <input className="game-input !py-2" type="number" min={18} max={99} placeholder="Yaş max" value={f.age_max ?? ""} onChange={(e) => set("age_max", e.target.value)} />
        </div>
        <select className="game-input !py-2" value={f.gender ?? ""} onChange={(e) => set("gender", e.target.value)}>
          <option value="">Tüm cinsiyetler</option><option value="kadin">Kadın</option><option value="erkek">Erkek</option><option value="diger">Diğer</option>
        </select>

        {kind === "interest" ? (
          <>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-ink/40">Ürün & etkileşim</p>
            <select className="game-input !py-2" value={f.event ?? ""} onChange={(e) => set("event", e.target.value)}>{EVENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <select className="game-input !py-2" value={f.kind ?? ""} onChange={(e) => set("kind", e.target.value)}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <select className="game-input !py-2" value={f.category_id ?? ""} onChange={(e) => set("category_id", e.target.value)}>
              <option value="">Tüm kategoriler</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="game-input !py-2" placeholder="Marka içerir…" value={f.brand ?? ""} onChange={(e) => set("brand", e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input className="game-input !py-2" type="date" value={f.from ?? ""} onChange={(e) => set("from", e.target.value)} />
              <input className="game-input !py-2" type="date" value={f.to ?? ""} onChange={(e) => set("to", e.target.value)} />
            </div>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-ink/40">Kırılım</p>
            <select className="game-input !py-2" value={String(f.group_by)} onChange={(e) => set("group_by", e.target.value)}>
              {INTEREST_GROUPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </>
        ) : (
          <>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-ink/40">Dağılımı görülecek alan</p>
            <select className="game-input !py-2" value={String(f.field)} onChange={(e) => set("field", e.target.value)}>
              {PROFILE_FIELDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </>
        )}
        <button className="game-btn mt-2" disabled={pending} onClick={run}>{pending ? "Hesaplanıyor…" : "Raporu oluştur"}</button>
        <p className="text-xs font-semibold text-ink/50">🔒 Yalnızca analiz izni veren kullanıcılar dahildir. 10 kişiden küçük gruplar gösterilmez.</p>
      </aside>

      <section className="game-panel min-h-[60vh] p-6">
        {err && <p className="rounded-xl bg-red-50 p-3 font-semibold text-red-600">{err}</p>}
        {rows === null && !err && (
          <div className="grid h-full place-items-center text-center text-ink/50">
            <div><p className="text-6xl">📊</p><p className="mt-2 font-display text-xl font-bold">Filtreleri seç ve raporu oluştur</p></div>
          </div>
        )}
        {rows && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-bold text-ink/50">Segmentteki kullanıcı</p>
                <p className="font-display text-3xl font-bold">{size == null ? "< 10 (gizli)" : size.toLocaleString("tr-TR")}</p>
              </div>
              <button className="game-btn ghost !py-2" onClick={csv} disabled={!rows.length}>⬇️ CSV indir</button>
            </div>
            {!rows.length ? (
              <p className="rounded-xl bg-gold/20 p-4 font-semibold">Bu filtrelerde 10 veya daha fazla kişiden oluşan grup yok. Segmenti genişlet.</p>
            ) : (
              <div className="space-y-2">
                {rows.map((r) => (
                  <div key={r.label} className="grid grid-cols-[minmax(90px,200px)_1fr_auto] items-center gap-3">
                    <span className="truncate text-sm font-bold">{LABELS[r.label] ?? r.label}</span>
                    <div className="h-6 overflow-hidden rounded-full bg-[#eef1f6]">
                      <div className="h-full rounded-full bg-gradient-to-r from-crystal-light to-crystal" style={{ width: `${(r.users / max) * 100}%` }} />
                    </div>
                    <span className="w-40 text-right text-sm font-bold">
                      {r.users.toLocaleString("tr-TR")} kişi <span className="text-ink/40">%{Math.round((r.users / total) * 100)}</span>
                      {r.events != null && <span className="block text-xs text-ink/50">{r.events.toLocaleString("tr-TR")} etkileşim</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
