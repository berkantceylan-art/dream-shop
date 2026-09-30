"use client";
import { useEffect, useState, useTransition } from "react";
import { runReport, listSavedAction, saveReportAction, deleteSavedAction, type Filters, type ReportKind } from "./actions";
import { BarList, Heatmap, Kpi, LineChart, TurkeyMap, HUE } from "./Charts";
import SurveyManager from "./SurveyManager";

type Opt = { id: number | string; name: string };
type Account = { admin?: boolean; company?: string; plan?: string | null; plan_until?: string | null; quota?: number | null; used?: number; credits?: number; reports: string[] } | null;

const REPORTS: { id: ReportKind; icon: string; title: string; desc: string; product: "none" | "optional" | "product" }[] = [
  { id: "overview", icon: "📊", title: "Genel bakış", desc: "Segmentin talep özeti ve yükselen ürünler", product: "optional" },
  { id: "price", icon: "💰", title: "Fiyat & talep", desc: "“Bu fiyata alırım” dağılımı, talep eğrisi, önerilen indirim", product: "optional" },
  { id: "funnel", icon: "🔻", title: "Dönüşüm hunisi", desc: "Görüntüleme → istek → teklif → satın alma", product: "optional" },
  { id: "brand", icon: "🏷️", title: "Marka & pazar payı", desc: "Kategoride markaların ilgi ve satış payı", product: "optional" },
  { id: "persona", icon: "👤", title: "Persona", desc: "İlgilenen kitle kim? Yaş, şehir, gelir, meslek, ilgi", product: "optional" },
  { id: "variants", icon: "👕", title: "Beden & renk", desc: "Beden, ayakkabı, boy ve renk talebi (stok planı)", product: "optional" },
  { id: "time", icon: "⏰", title: "Zaman analizi", desc: "Günlük trend ve gün × saat yoğunluğu", product: "optional" },
  { id: "interest", icon: "🛍️", title: "İlgi kırılımı", desc: "Etkileşimleri istediğin boyuta göre kır", product: "optional" },
  { id: "profile", icon: "🧬", title: "Profil dağılımı", desc: "Segmentin demografik ve beden dağılımı", product: "none" },
  { id: "geo", icon: "🗺️", title: "Türkiye haritası", desc: "İl bazında ilgi ve pazar penetrasyonu", product: "optional" },
  { id: "basket", icon: "🧺", title: "Birlikte ilgi (sepet)", desc: "Bu ürünle ilgilenenler başka neye bakıyor? Çapraz satış fırsatları", product: "optional" },
  { id: "reasons", icon: "🤔", title: "Neden almadı?", desc: "İstek listesine ekleyip almayanların beyan ettiği nedenler", product: "optional" },
  { id: "survey", icon: "📋", title: "Sponsorlu anket", desc: "Hedef kitlene soru sor, ödüllü yanıt topla", product: "none" },
];
const SEGMENT_KEYS = ["city_id", "age_min", "age_max", "gender"] as const;
const NO_COMPARE: ReportKind[] = ["price", "basket", "survey", "brand"];
export const REASON_TR: Record<string, string> = { pahali: "Fiyatı yüksek", renk: "Rengi uymadı", beden: "Bedeni yok/uymadı", model: "Modeli beğenmedim",
  baska_marka: "Başka marka aldım", ihtiyac_yok: "İhtiyacım kalmadı", sonra: "Sonra alacağım", diger: "Diğer" };
const DIM_TR: Record<string, string> = { age: "Yaş", gender: "Cinsiyet", city: "Şehir", income: "Gelir", occupation: "Meslek", education: "Eğitim",
  marital: "Medeni durum", housing: "Konut", car: "Araba sahipliği", interest: "İlgi alanları", top: "Üst beden", bottom: "Alt beden (bel)", shoe: "Ayakkabı no", height: "Boy" };
const LBL: Record<string, string> = { clothing: "Giyim", accessory: "Aksesuar", car: "Otomobil", house: "Konut", furniture: "Mobilya", other: "Diğer",
  view: "Görüntüleme", wishlist: "İstek listesi", price_wish: "Fiyat teklifi", purchase: "Satın alma", resale: "2. el", kadin: "Kadın", erkek: "Erkek",
  diger: "Diğer", owner: "Ev sahibi", tenant: "Kiracı", family: "Ailesiyle", ogrenci: "Öğrenci", ozel: "Özel sektör", kamu: "Kamu", serbest: "Serbest",
  isveren: "İşveren", ev: "Ev hanımı/erkeği", emekli: "Emekli", issiz: "Çalışmıyor", lise: "Lise", lisans: "Lisans", onlisans: "Ön lisans", yuksek: "Yüksek lisans+",
  ilk: "İlköğretim", bekar: "Bekâr", evli: "Evli", iliski: "İlişkisi var", bosanmis: "Boşanmış",
  "0-25": "25 bin ₺ altı", "25-50": "25–50 bin ₺", "50-100": "50–100 bin ₺", "100+": "100 bin ₺ üstü" };
const L = (s: string) => LBL[s] ?? s;
const fmt = (n: number | null | undefined) => (n == null ? "—" : Number(n).toLocaleString("tr-TR"));
const GROUPS = [["kind", "Ürün türü"], ["category", "Kategori"], ["brand", "Marka"], ["product", "Ürün"], ["city", "Şehir"], ["age_band", "Yaş"], ["gender", "Cinsiyet"], ["month", "Ay"], ["event", "Etkileşim"]];
const PFIELDS = [["shoe_size", "Ayakkabı no"], ["top_size", "Üst beden"], ["bottom_size", "Alt beden"], ["height_band", "Boy"], ["income_band", "Gelir"], ["housing", "Konut"],
  ["owns_car", "Araba"], ["occupation", "Meslek"], ["education", "Eğitim"], ["marital_status", "Medeni durum"], ["children_count", "Çocuk"], ["interests", "İlgi"], ["city", "Şehir"], ["age_band", "Yaş"], ["gender", "Cinsiyet"]];

export default function ReportApp({ cities, categories, brands, products, initialAccount }: {
  cities: Opt[]; categories: Opt[]; brands: string[]; products: { id: string; name: string; brand: string | null }[]; initialAccount: Account;
}) {
  const [kind, setKind] = useState<ReportKind>("overview");
  const [f, setF] = useState<Filters>({ group_by: "kind", field: "shoe_size" });
  const [data, setData] = useState<unknown>(null);
  const [err, setErr] = useState("");
  const [account, setAccount] = useState<Account>(initialAccount);
  const [pending, start] = useTransition();
  const [cmp, setCmp] = useState(false);
  const [f2, setF2] = useState<Filters>({});
  const [data2, setData2] = useState<unknown>(null);
  const [saved, setSaved] = useState<Awaited<ReturnType<typeof listSavedAction>>>([]);
  useEffect(() => { listSavedAction().then(setSaved); }, []);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const set2 = (k: string, v: string) => setF2((s) => ({ ...s, [k]: v }));
  const canCmp = !NO_COMPARE.includes(kind);
  const comparing = cmp && canCmp;
  const meta = REPORTS.find((r) => r.id === kind)!;
  const allowed = (id: string) => account?.admin || account?.reports.includes(id) || (account?.credits ?? 0) > 0;

  const run = () => start(async () => {
    setErr("");
    const g = kind === "funnel" ? (f.group_by && ["product", "brand", "category", "kind", "total"].includes(String(f.group_by)) ? f.group_by : "product") : f.group_by;
    const r = await runReport(kind, { ...f, group_by: g });
    if (r.account) setAccount(r.account as Account);
    if (r.error) { setErr(r.error); setData(null); setData2(null); return; }
    setData(r.data);
    if (comparing) {
      const base = Object.fromEntries(Object.entries(f).filter(([k]) => !(SEGMENT_KEYS as readonly string[]).includes(k)));
      const r2 = await runReport(kind, { ...base, ...f2, group_by: g });
      if (r2.account) setAccount(r2.account as Account);
      if (r2.error) { setErr("B segmenti: " + r2.error); setData2(null); } else setData2(r2.data);
    } else setData2(null);
  });
  const save = () => start(async () => {
    const name = window.prompt("Rapor adı", `${meta.title} · ${new Date().toLocaleDateString("tr-TR")}`);
    if (!name) return;
    await saveReportAction(name, kind, comparing ? { ...f, __cmp: JSON.stringify(f2) } : f);
    setSaved(await listSavedAction());
  });
  const load = (r: (typeof saved)[number]) => {
    const { __cmp, ...rest } = r.filters;
    setKind(r.kind); setF({ group_by: "kind", field: "shoe_size", ...rest }); setData(null); setData2(null); setErr("");
    if (__cmp) { setCmp(true); setF2(JSON.parse(String(__cmp))); } else setCmp(false);
  };
  const remove = (id: number) => start(async () => { await deleteSavedAction(id); setSaved((s) => s.filter((x) => x.id !== id)); });
  const segLabel = (x: Filters) => [x.city_id ? cities.find((c) => String(c.id) === String(x.city_id))?.name : "Tüm Türkiye",
    x.age_min || x.age_max ? `${x.age_min || 18}–${x.age_max || "99"} yaş` : null, x.gender ? L(String(x.gender)) : null].filter(Boolean).join(" · ");

  const exportCsv = () => {
    const rows = toRows(kind, data);
    if (!rows.length) return;
    const head = Object.keys(rows[0]);
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [head.join(";"), ...rows.map((r) => head.map((h) => esc(r[h])).join(";"))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `dream-shop-${kind}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[250px_1fr]">
      {/* Sol: rapor listesi + hesap */}
      <aside className="flex h-fit flex-col gap-3 xl:sticky xl:top-20">
        <div className="rounded-3xl bg-ink p-4 text-white">
          <p className="text-xs font-bold uppercase tracking-wide text-white/60">{account?.admin ? "Admin erişimi" : account?.company}</p>
          <p className="font-display text-2xl font-bold">{account?.admin ? "Sınırsız" : account?.plan ?? "Paket yok"}</p>
          {!account?.admin && (
            <>
              {account?.plan && <p className="text-sm text-white/80">{account.quota == null ? "Sınırsız sorgu" : `${account.used}/${account.quota} sorgu (bu ay)`}</p>}
              {account?.plan && account.quota != null && (
                <div className="mt-2 h-2 rounded-full bg-white/20"><div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(100, ((account.used ?? 0) / account.quota) * 100)}%` }} /></div>
              )}
              <p className="mt-2 text-sm text-white/80">🎟️ {account?.credits ?? 0} rapor kredisi</p>
              {account?.plan_until && <p className="text-xs text-white/60">Bitiş: {new Date(account.plan_until).toLocaleDateString("tr-TR")}</p>}
            </>
          )}
        </div>
        <nav className="game-panel flex flex-col !rounded-3xl p-2">
          {REPORTS.map((r) => {
            const ok = allowed(r.id);
            return (
              <button key={r.id} onClick={() => { setKind(r.id); setData(null); setData2(null); setErr(""); }}
                className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-bold ${kind === r.id ? "bg-crystal text-white" : "hover:bg-white"} ${ok ? "" : "opacity-60"}`}>
                <span>{r.icon}</span><span className="flex-1">{r.title}</span>{!ok && <span title="Paketinde yok">🔒</span>}
              </button>
            );
          })}
        </nav>
        <div className="game-panel no-print !rounded-3xl p-3">
          <p className="mb-1 px-1 text-xs font-bold uppercase tracking-wide text-ink/50">⭐ Kayıtlı raporlar</p>
          {!saved.length && <p className="px-1 text-xs font-semibold text-ink/40">Filtreleri kurup “Kaydet”e bas; tek tıkla tekrar çalıştır.</p>}
          {saved.map((r) => (
            <div key={r.id} className="group flex items-center gap-1 rounded-xl px-1 hover:bg-white">
              <button onClick={() => load(r)} className="min-w-0 flex-1 truncate py-1.5 text-left text-sm font-bold" title={r.name}>
                {REPORTS.find((x) => x.id === r.kind)?.icon} {r.name}
              </button>
              <button onClick={() => remove(r.id)} className="text-xs text-ink/30 hover:text-red-500" aria-label="Sil">✕</button>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-col gap-4">
        {kind === "survey" ? <SurveyManager cities={cities} allowed={!!(account?.admin || account?.reports.includes("survey"))} /> : <>
        {/* Segment ve filtreler */}
        <div className="game-panel no-print !rounded-3xl p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div><h2 className="font-display text-2xl font-bold">{meta.icon} {meta.title}</h2><p className="text-sm font-semibold text-ink/60">{meta.desc}</p></div>
            {!allowed(kind) && <span className="rounded-full bg-gold/30 px-3 py-1 text-sm font-bold">🔒 Paketinde yok — Pro'ya geç veya rapor kredisi kullan</span>}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Sel label="Şehir" v={f.city_id} on={(v) => set("city_id", v)} opts={[["", "Tüm Türkiye"], ...cities.map((c) => [String(c.id), c.name])]} />
            <div className="grid grid-cols-2 gap-2">
              <Num label="Yaş min" v={f.age_min} on={(v) => set("age_min", v)} />
              <Num label="Yaş max" v={f.age_max} on={(v) => set("age_max", v)} />
            </div>
            <Sel label="Cinsiyet" v={f.gender} on={(v) => set("gender", v)} opts={[["", "Hepsi"], ["kadin", "Kadın"], ["erkek", "Erkek"], ["diger", "Diğer"]]} />
            {kind !== "profile" && kind !== "price" && (
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-bold text-ink/60">Başlangıç<input type="date" value={String(f.from ?? "")} onChange={(e) => set("from", e.target.value)} className="game-input mt-1 !py-1.5 text-sm" /></label>
                <label className="text-xs font-bold text-ink/60">Bitiş<input type="date" value={String(f.to ?? "")} onChange={(e) => set("to", e.target.value)} className="game-input mt-1 !py-1.5 text-sm" /></label>
              </div>
            )}
            {meta.product !== "none" && (
              <>
                <Sel label="Ürün türü" v={f.kind} on={(v) => set("kind", v)} opts={[["", "Hepsi"], ...["clothing", "accessory", "car", "house", "furniture", "other"].map((k) => [k, L(k)])]} />
                <Sel label="Kategori" v={f.category_id} on={(v) => set("category_id", v)} opts={[["", "Hepsi"], ...categories.map((c) => [String(c.id), c.name])]} />
                {kind !== "brand" && <Sel label="Marka" v={f.brand} on={(v) => set("brand", v)} opts={[["", "Hepsi"], ...brands.map((b) => [b, b])]} />}
                <Sel label="Ürün" v={f.product_id} on={(v) => set("product_id", v)} opts={[["", "Hepsi"], ...products.map((p) => [p.id, `${p.name}${p.brand ? ` · ${p.brand}` : ""}`])]} />
              </>
            )}
            {kind === "funnel" && <Sel label="Kırılım" v={f.group_by} on={(v) => set("group_by", v)} opts={[["product", "Ürün"], ["brand", "Marka"], ["category", "Kategori"], ["kind", "Tür"], ["total", "Toplam"]]} />}
            {kind === "interest" && <Sel label="Kırılım" v={f.group_by} on={(v) => set("group_by", v)} opts={GROUPS} />}
            {(kind === "interest" || kind === "persona" || kind === "time") && (
              <Sel label="Etkileşim" v={f.event} on={(v) => set("event", v)} opts={[["", "Hepsi"], ["view", "Görüntüleme"], ["wishlist", "İstek listesi"], ["price_wish", "Fiyat teklifi"], ["purchase", "Satın alma"], ["resale", "2. el"]]} />
            )}
            {kind === "profile" && <Sel label="Alan" v={f.field} on={(v) => set("field", v)} opts={PFIELDS} />}
            {kind === "reasons" && <Sel label="Kırılım" v={f.group_by} on={(v) => set("group_by", v)} opts={[["total", "Toplam"], ["product", "Ürün"], ["brand", "Marka"]]} />}
          </div>
          {canCmp && (
            <div className="mt-3 rounded-2xl border-2 border-dashed border-[#e0d4f2] p-3">
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={cmp} onChange={(e) => { setCmp(e.target.checked); setData2(null); }} className="h-4 w-4 accent-[#9b3fd9]" />
                🆚 A/B segment karşılaştırması
                <span className="font-semibold text-ink/50">— yukarıdaki A segmentini ikinci bir kitleyle yan yana gör</span>
              </label>
              {cmp && (
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <Sel label="B · Şehir" v={f2.city_id} on={(v) => set2("city_id", v)} opts={[["", "Tüm Türkiye"], ...cities.map((c) => [String(c.id), c.name])]} />
                  <div className="grid grid-cols-2 gap-2">
                    <Num label="B · Yaş min" v={f2.age_min} on={(v) => set2("age_min", v)} />
                    <Num label="B · Yaş max" v={f2.age_max} on={(v) => set2("age_max", v)} />
                  </div>
                  <Sel label="B · Cinsiyet" v={f2.gender} on={(v) => set2("gender", v)} opts={[["", "Hepsi"], ["kadin", "Kadın"], ["erkek", "Erkek"], ["diger", "Diğer"]]} />
                </div>
              )}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button className="game-btn" onClick={run} disabled={pending || !allowed(kind)}>{pending ? "Hesaplanıyor…" : "Raporu oluştur"}</button>
            <button className="game-btn ghost" onClick={exportCsv} disabled={!data}>⬇️ Excel'e aktar (CSV)</button>
            <button className="game-btn ghost" onClick={() => window.print()} disabled={!data}>🖨️ PDF</button>
            <button className="game-btn ghost" onClick={save} disabled={pending}>⭐ Kaydet</button>
            <span className="text-xs font-semibold text-ink/50">🔒 Yalnızca analiz izni veren kullanıcılar · 10 kişiden küçük gruplar gösterilmez</span>
          </div>
        </div>

        {err && <p className="rounded-2xl bg-red-50 p-4 font-semibold text-red-600">{err}</p>}
        {!data && !err && (
          <div className="game-panel grid min-h-72 place-items-center !rounded-3xl p-10 text-center text-ink/50">
            <div><p className="text-6xl">{meta.icon}</p><p className="mt-2 font-display text-xl font-bold">Filtreleri seç ve raporu oluştur</p></div>
          </div>
        )}
        {data != null && (
          <div className="print-only hidden">
            <p className="font-display text-2xl font-bold">Dream Shop · {meta.title}</p>
            <p className="text-sm">{account?.company ?? ""} · {new Date().toLocaleString("tr-TR")} · Segment: {segLabel(f)}{comparing ? ` vs ${segLabel(f2)}` : ""} · Anonim, toplu veri (k≥10)</p>
          </div>
        )}
        {data != null && !comparing && <Result kind={kind} data={data} />}
        {data != null && comparing && (
          <div className="grid gap-4 2xl:grid-cols-2">
            {[[data, f, "A"], [data2, f2, "B"]].map(([d, fx, tag]) => (
              <div key={tag as string} className="flex min-w-0 flex-col gap-4 rounded-3xl p-2" style={{ background: tag === "A" ? "#f6f0fd" : "#eef3fb" }}>
                <p className="px-2 pt-1 font-display text-lg font-bold"><span className="mr-2 rounded-full bg-ink px-2.5 py-0.5 text-sm text-white">{tag as string}</span>{segLabel(fx as Filters)}</p>
                {d != null ? <Result kind={kind} data={d} /> : <p className="p-4 text-sm font-semibold text-ink/50">Veri yok</p>}
              </div>
            ))}
          </div>
        )}
        </>}
      </section>
    </div>
  );
}

function Sel({ label, v, on, opts }: { label: string; v: unknown; on: (v: string) => void; opts: (string[] | [string, string])[] }) {
  return (
    <label className="text-xs font-bold text-ink/60">{label}
      <select value={String(v ?? "")} onChange={(e) => on(e.target.value)} className="game-input mt-1 !py-1.5 text-sm">
        {opts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
    </label>
  );
}
function Num({ label, v, on }: { label: string; v: unknown; on: (v: string) => void }) {
  return <label className="text-xs font-bold text-ink/60">{label}<input type="number" min={18} max={99} value={String(v ?? "")} onChange={(e) => on(e.target.value)} className="game-input mt-1 !py-1.5 text-sm" /></label>;
}
function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return <div className={`game-panel !rounded-3xl p-5 ${className}`}>{title && <h3 className="mb-3 font-display text-lg font-bold">{title}</h3>}{children}</div>;
}
function Empty() {
  return <p className="rounded-2xl bg-gold/20 p-4 font-semibold">Bu filtrelerde 10 veya daha fazla kişiden oluşan grup yok. Segmenti genişlet (şehir/yaş filtrelerini kaldır, tarih aralığını büyüt).</p>;
}

// ------------------------------------------------------------------ Sonuç ekranları
type Any = Record<string, unknown>;
export function Result({ kind, data }: { kind: ReportKind; data: unknown }) {
  if (kind === "overview") {
    const d = data as { segment: number | null; kpis: Record<string, { users: number | null; events: number | null }>; wish_ratio: number | null; wish_users: number | null; rising: { name: string; brand: string | null; cur: number; prev: number }[] };
    const v = d.kpis?.view?.users, p = d.kpis?.purchase?.users;
    return (
      <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Segment" value={d.segment} sub="rızalı kullanıcı" />
          <Kpi label="Görüntüleyen" value={v} />
          <Kpi label="İstek listesi" value={d.kpis?.wishlist?.users} />
          <Kpi label="Fiyat teklifi" value={d.kpis?.price_wish?.users} />
          <Kpi label="Satın alan" value={p} />
          <Kpi label="Dönüşüm" value={v && p ? `%${((p / v) * 100).toFixed(1)}` : null} sub="görüntüleme → satın alma" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="💰 Beklenen indirim">
            {d.wish_ratio == null ? <Empty /> : (
              <>
                <p className="font-display text-5xl font-bold" style={{ color: HUE }}>%{Math.round((1 - d.wish_ratio) * 100)}</p>
                <p className="mt-1 font-semibold text-ink/70">Fiyat teklifi veren {fmt(d.wish_users)} kişi, ortalamada liste fiyatının <b>%{Math.round(d.wish_ratio * 100)}</b>'ini ödemeye hazır.</p>
              </>
            )}
          </Card>
          <Card title="📈 Yükselen ürünler (son 7 gün)">
            {!d.rising?.length ? <Empty /> : (
              <BarList suffix="kişi" rows={d.rising.map((r) => ({ label: r.name, value: r.cur, sub: r.prev ? `önceki hafta ${r.prev} · ${r.cur >= r.prev ? "▲" : "▼"} %${Math.round(Math.abs(r.cur / r.prev - 1) * 100)}` : "yeni ilgi" }))} />
            )}
          </Card>
        </div>
      </>
    );
  }

  if (kind === "price") {
    const d = data as { products: { product: string; brand: string | null; list: number; wishers: number; p25: number; median: number; p75: number; median_discount: number;
      curve: { pct: number; price: number; buyers: number | null }[]; best: { discount: number; price: number; buyers: number } | null }[] };
    if (!d.products?.length) return <Card><Empty /><p className="mt-2 text-sm text-ink/60">İpucu: Ürün başına en az 10 fiyat teklifi gerekir.</p></Card>;
    return (
      <>
        {d.products.map((p) => {
          const max = Math.max(1, ...p.curve.map((c) => c.buyers ?? 0));
          return (
            <Card key={p.product}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h3 className="font-display text-xl font-bold">{p.product}</h3><p className="text-sm font-semibold text-ink/50">{p.brand} · liste fiyatı {fmt(p.list)} kredi · {fmt(p.wishers)} teklif</p></div>
                {p.best && (
                  <div className="rounded-2xl bg-mint/15 p-3 text-right">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#16865a]">Önerilen kampanya</p>
                    <p className="font-display text-2xl font-bold">%{p.best.discount} indirim → {fmt(p.best.price)}</p>
                    <p className="text-sm font-semibold text-ink/70">{fmt(p.best.buyers)} alıcı · tahmini {fmt(p.best.price * p.best.buyers)} kredi ciro</p>
                  </div>
                )}
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
                <div>
                  <p className="mb-2 text-sm font-bold text-ink/60">Kabul edilen fiyat aralığı</p>
                  <div className="relative h-10 rounded-xl bg-[#f1ecf8]">
                    <div className="absolute inset-y-2 rounded-lg" style={{ left: `${(p.p25 / p.list) * 100}%`, width: `${((p.p75 - p.p25) / p.list) * 100}%`, background: HUE, opacity: 0.35 }} />
                    <div className="absolute inset-y-0 w-1 rounded" style={{ left: `${(p.median / p.list) * 100}%`, background: HUE }} />
                    <div className="absolute inset-y-0 right-0 w-1 rounded bg-ink" />
                  </div>
                  <div className="mt-1 flex justify-between text-xs font-bold text-ink/50"><span>0</span><span>liste {fmt(p.list)}</span></div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-xl bg-white p-2"><dt className="text-xs text-ink/50">Alt çeyrek</dt><dd className="font-bold">{fmt(p.p25)}</dd></div>
                    <div className="rounded-xl bg-white p-2"><dt className="text-xs text-ink/50">Medyan teklif</dt><dd className="font-bold">{fmt(p.median)}</dd></div>
                    <div className="rounded-xl bg-white p-2"><dt className="text-xs text-ink/50">Üst çeyrek</dt><dd className="font-bold">{fmt(p.p75)}</dd></div>
                  </dl>
                  <p className="mt-2 text-sm font-semibold text-ink/70">Medyan beklenti: <b>%{p.median_discount} indirim</b>.</p>
                </div>
                <div>
                  <p className="mb-2 text-sm font-bold text-ink/60">Talep eğrisi — bu fiyata inilirse kaç kişi alır?</p>
                  <div className="flex h-44 items-end gap-1.5">
                    {p.curve.map((c) => (
                      <div key={c.pct} className="group flex h-full flex-1 flex-col items-center justify-end" title={`${fmt(c.price)} kredi (%${100 - c.pct} indirim): ${c.buyers == null ? "<10" : c.buyers} kişi`}>
                        <span className="mb-1 text-[10px] font-bold text-ink/60 opacity-0 group-hover:opacity-100">{c.buyers ?? "<10"}</span>
                        <div className="w-full rounded-t-[4px]" style={{ height: `${((c.buyers ?? 0) / max) * 85}%`, minHeight: 3,
                          background: c.buyers == null ? "repeating-linear-gradient(135deg,#e6e0ef 0 3px,#f7f4fb 3px 6px)" : HUE,
                          opacity: p.best && c.price === p.best.price ? 1 : 0.55 }} />
                        <span className="mt-1 text-[10px] font-bold text-ink/50">%{100 - c.pct}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-center text-xs font-semibold text-ink/40">İndirim oranı · koyu çubuk = en yüksek ciro noktası</p>
                </div>
              </div>
              <p className="mt-3 text-xs font-semibold text-ink/40">Not: Yalnızca “Bu fiyata alırım” teklifi veren kullanıcılar üzerinden hesaplanır; liste fiyatından doğrudan alanlar bu eğriye dahil değildir.</p>
            </Card>
          );
        })}
      </>
    );
  }

  if (kind === "funnel") {
    const rows = data as { label: string; views: number; wishlist: number; price_wish: number; purchase: number }[];
    if (!rows?.length) return <Card><Empty /></Card>;
    return (
      <Card>
        <div className="space-y-5">
          {rows.slice(0, 15).map((r) => {
            const steps = [["Görüntüleme", r.views], ["İstek listesi", r.wishlist], ["Fiyat teklifi", r.price_wish], ["Satın alma", r.purchase]] as [string, number][];
            return (
              <div key={r.label}>
                <p className="mb-1 font-bold">{r.label} <span className="text-sm font-semibold text-ink/50">· dönüşüm %{r.views ? ((r.purchase / r.views) * 100).toFixed(1) : 0}</span></p>
                <div className="grid grid-cols-4 gap-2">
                  {steps.map(([l, n], i) => (
                    <div key={l} className="rounded-xl bg-white p-2">
                      <div className="h-2 rounded-full bg-[#f1ecf8]"><div className="h-full rounded-full" style={{ width: `${r.views ? (n / r.views) * 100 : 0}%`, background: HUE }} /></div>
                      <p className="mt-1 text-xs font-bold text-ink/50">{l}</p>
                      <p className="font-display text-lg font-bold">{n < 10 ? "<10" : fmt(n)}</p>
                      {i > 0 && steps[i - 1][1] > 0 && <p className="text-[11px] font-semibold text-ink/50">önceki adımın %{Math.round((n / steps[i - 1][1]) * 100)}'i</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  if (kind === "brand") {
    const rows = data as { brand: string; views: number; wishes: number; purchases: number; credits: number }[];
    if (!rows?.length) return <Card><Empty /></Card>;
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="👁️ İlgi payı"><BarList rows={rows.map((r) => ({ label: r.brand, value: r.views }))} /></Card>
        <Card title="💖 İstek + teklif payı"><BarList rows={rows.map((r) => ({ label: r.brand, value: r.wishes < 10 ? null : r.wishes }))} /></Card>
        <Card title="🛍️ Satış payı"><BarList rows={rows.map((r) => ({ label: r.brand, value: r.purchases < 10 ? null : r.purchases, sub: `${fmt(r.credits)} kredi` }))} /></Card>
      </div>
    );
  }

  if (kind === "persona") {
    const d = data as { audience: number | null; dims?: Record<string, { label: string; users: number }[]> };
    if (!d.audience) return <Card><Empty /></Card>;
    return (
      <>
        <Card><p className="font-display text-2xl font-bold">Bu ürünlerle ilgilenen kitle: {fmt(d.audience)} kişi</p></Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(d.dims ?? {}).map(([k, rows]) => (
            <Card key={k} title={DIM_TR[k] ?? k}><BarList rows={rows.slice(0, 10).map((r) => ({ label: L(r.label), value: r.users }))} /></Card>
          ))}
        </div>
      </>
    );
  }

  if (kind === "variants") {
    const d = data as { sizes?: Record<string, { label: string; users: number }[]>; colors: { color: string; users: number }[] };
    if (!d.sizes && !d.colors?.length) return <Card><Empty /></Card>;
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(d.sizes ?? {}).map(([k, rows]) => <Card key={k} title={DIM_TR[k] ?? k}><BarList rows={rows.map((r) => ({ label: r.label, value: r.users }))} /></Card>)}
        {!!d.colors?.length && (
          <Card title="🎨 En çok satın alınan renkler">
            <div className="space-y-2">{d.colors.map((c) => (
              <div key={c.color} className="flex items-center gap-3"><span className="h-6 w-6 rounded-full border-2 border-white shadow" style={{ background: c.color }} /><code className="text-xs text-ink/50">{c.color}</code>
                <b className="ml-auto">{fmt(c.users)} kişi</b></div>))}</div>
          </Card>
        )}
      </div>
    );
  }

  if (kind === "time") {
    const d = data as { daily: { date: string; users: number | null }[]; heat: { dow: number; hour: number; users: number | null }[] };
    if (!d.daily?.length) return <Card><Empty /></Card>;
    return (
      <>
        <Card title="📈 Günlük ilgilenen kişi sayısı">
          <LineChart points={d.daily.map((x) => ({ x: new Date(x.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }), y: x.users }))} />
        </Card>
        <Card title="🗓️ Hangi gün ve saatte? (Türkiye saati)"><Heatmap cells={d.heat} /></Card>
      </>
    );
  }

  if (kind === "geo") return <GeoResult rows={data as GeoRow[]} />;

  if (kind === "basket") {
    const rows = data as { product_a: string; product_b: string; pair_users: number; users_a: number; confidence: number; lift: number }[];
    if (!rows?.length) return <Card><Empty /><p className="mt-2 text-sm text-ink/60">İpucu: Aynı iki ürünle ilgilenen en az 10 kişi gerekir.</p></Card>;
    return (
      <Card title="🧺 Birlikte ilgi gören ürün çiftleri">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wide text-ink/50">
              <th className="py-2">Bununla ilgilenen…</th><th>…buna da bakıyor</th><th className="pr-3 text-right">Ortak kişi</th><th className="w-44 pl-3">Olasılık</th><th className="text-right" title="1'den büyükse tesadüften güçlü ilişki">Lift</th>
            </tr></thead>
            <tbody className="divide-y divide-[#eee8f6]">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="py-2 pr-2 font-bold">{r.product_a}</td>
                  <td className="pr-2 font-semibold">{r.product_b}</td>
                  <td className="pr-3 text-right font-bold">{fmt(r.pair_users)}</td>
                  <td className="pl-3">
                    <div className="flex items-center gap-2"><div className="h-2 flex-1 rounded-full bg-[#f1ecf8]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, Number(r.confidence) * 100)}%`, background: HUE }} /></div>
                      <span className="w-10 text-right text-xs font-bold">%{Math.round(Number(r.confidence) * 100)}</span></div>
                  </td>
                  <td className={`text-right font-bold ${Number(r.lift) >= 1.5 ? "text-[#16865a]" : ""}`}>{Number(r.lift).toFixed(1)}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs font-semibold text-ink/50">Olasılık: A ile ilgilenenlerin yüzde kaçı B ile de ilgilendi. Lift &gt; 1,5 = güçlü çapraz satış / paket kampanya fırsatı.</p>
      </Card>
    );
  }

  if (kind === "reasons") {
    const rows = data as { label: string; reason: string; users: number }[];
    if (!rows?.length) return <Card><Empty /><p className="mt-2 text-sm text-ink/60">Kullanıcılar, istek listesine ekleyip 3 gün içinde almadıkları ürünler için profillerinde bu soruyu yanıtlar.</p></Card>;
    const groups = [...new Set(rows.map((r) => r.label))];
    return (
      <div className={`grid gap-4 ${groups.length > 1 ? "md:grid-cols-2" : ""}`}>
        {groups.map((g) => {
          const gr = rows.filter((r) => r.label === g);
          const tot = gr.reduce((a, r) => a + Number(r.users), 0);
          return <Card key={g} title={g}><BarList rows={gr.map((r) => ({ label: REASON_TR[r.reason] ?? r.reason, value: Number(r.users) }))} /><p className="mt-2 text-xs font-semibold text-ink/50">{fmt(tot)} yanıt</p></Card>;
        })}
      </div>
    );
  }

  // interest & profile
  const rows = data as { label: string; users: number; events?: number }[];
  if (!rows?.length) return <Card><Empty /></Card>;
  return <Card><BarList rows={rows.map((r) => ({ label: L(r.label), value: Number(r.users), sub: r.events != null ? `${fmt(r.events)} etkileşim` : undefined }))} /></Card>;
}

type GeoRow = { city_id: number; city: string; users: number | null; events: number | null; segment: number | null };
function GeoResult({ rows }: { rows: GeoRow[] }) {
  const [mode, setMode] = useState<"users" | "pen">("users");
  if (!rows?.length) return <Card><Empty /></Card>;
  const val = (r: GeoRow) => (mode === "users" ? r.users : r.users != null && r.segment ? Math.round((r.users / r.segment) * 1000) / 10 : null);
  const values: Record<number, number> = {};
  const names: Record<number, string> = {};
  rows.forEach((r) => { names[r.city_id] = r.city; const v = val(r); if (v != null) values[r.city_id] = v; });
  const top = rows.filter((r) => val(r) != null).sort((a, b) => (val(b) ?? 0) - (val(a) ?? 0)).slice(0, 12);
  return (
    <>
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-bold">🗺️ {mode === "users" ? "İlgilenen kişi sayısı" : "Penetrasyon: il nüfusumuzun yüzde kaçı ilgilendi"}</h3>
          <div className="no-print flex gap-1 rounded-full bg-[#f1ecf8] p-1 text-sm font-bold">
            {([["users", "Kişi"], ["pen", "Penetrasyon %"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setMode(k)} className={`rounded-full px-3 py-1 ${mode === k ? "bg-white shadow" : "text-ink/60"}`}>{l}</button>
            ))}
          </div>
        </div>
        <TurkeyMap values={values} names={names} unit={mode === "users" ? "kişi" : "%"} />
      </Card>
      <Card title={mode === "users" ? "🏆 En çok ilgi gösteren iller" : "🏆 En yüksek penetrasyon"}>
        <BarList suffix={mode === "users" ? "kişi" : "%"} rows={top.map((r) => ({ label: r.city, value: val(r), sub: `${fmt(r.segment)} kullanıcıdan` }))} />
      </Card>
    </>
  );
}

// ------------------------------------------------------------------ Dışa aktarma
function toRows(kind: ReportKind, data: unknown): Any[] {
  if (!data) return [];
  if (kind === "overview") {
    const d = data as { segment: number; kpis: Record<string, { users: number; events: number }>; rising: Any[] };
    return [{ metrik: "segment", deger: d.segment }, ...Object.entries(d.kpis ?? {}).map(([k, v]) => ({ metrik: L(k), kisi: v.users, etkilesim: v.events })),
      ...(d.rising ?? []).map((r) => ({ metrik: "yükselen", urun: r.name, bu_hafta: r.cur, gecen_hafta: r.prev }))];
  }
  if (kind === "price") {
    const d = data as { products: { product: string; list: number; wishers: number; p25: number; median: number; p75: number; best: { discount: number; price: number; buyers: number } | null; curve: { pct: number; price: number; buyers: number | null }[] }[] };
    return d.products.flatMap((p) => p.curve.map((c) => ({ urun: p.product, liste_fiyati: p.list, teklif_sayisi: p.wishers, medyan: p.median, p25: p.p25, p75: p.p75,
      indirim_yuzde: 100 - c.pct, fiyat: c.price, alici: c.buyers ?? "<10", onerilen_indirim: p.best?.discount ?? "" })));
  }
  if (kind === "persona") {
    const d = data as { dims?: Record<string, { label: string; users: number }[]> };
    return Object.entries(d.dims ?? {}).flatMap(([k, rows]) => rows.map((r) => ({ boyut: DIM_TR[k] ?? k, deger: L(r.label), kisi: r.users })));
  }
  if (kind === "variants") {
    const d = data as { sizes?: Record<string, { label: string; users: number }[]>; colors: { color: string; users: number }[] };
    return [...Object.entries(d.sizes ?? {}).flatMap(([k, rows]) => rows.map((r) => ({ boyut: DIM_TR[k] ?? k, deger: r.label, kisi: r.users }))),
      ...(d.colors ?? []).map((c) => ({ boyut: "Renk", deger: c.color, kisi: c.users }))];
  }
  if (kind === "reasons") return (data as Any[]).map((r) => ({ grup: r.label, neden: REASON_TR[String(r.reason)] ?? r.reason, kisi: r.users }));
  if (kind === "time") {
    const d = data as { daily: Any[]; heat: Any[] };
    return [...d.daily.map((x) => ({ tur: "gunluk", ...x })), ...d.heat.map((x) => ({ tur: "gun_saat", ...x }))];
  }
  return (data as Any[]).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "string" ? L(v) : v])));
}
