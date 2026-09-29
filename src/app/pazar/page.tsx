import Link from "next/link";
import { requireMe } from "@/lib/session";
import type { MarketListing } from "@/lib/catalog";
import AppHeader from "@/components/AppHeader";
import Market from "./Market";

const KINDS = [
  { id: "", label: "Tümü", icon: "✨" }, { id: "car", label: "Araba", icon: "🚗" }, { id: "house", label: "Konut", icon: "🏡" },
  { id: "clothing", label: "Giyim", icon: "👕" }, { id: "accessory", label: "Aksesuar", icon: "👜" },
  { id: "furniture", label: "Mobilya", icon: "🛋️" }, { id: "other", label: "Diğer", icon: "📦" },
];
const SORTS = [{ id: "yeni", label: "En yeni" }, { id: "ucuz", label: "En ucuz" }, { id: "pahali", label: "En pahalı" }];

export default async function PazarPage({ searchParams }: { searchParams: Promise<{ tur?: string; il?: string; sirala?: string; q?: string }> }) {
  const { supabase, me } = await requireMe("/pazar");
  const { tur = "", il = "", sirala = "yeni", q = "" } = await searchParams;

  let query = supabase.from("market_listings").select("*").limit(120);
  if (tur) query = query.eq("kind", tur);
  if (il === "benim" && me.city_id) query = query.eq("city_id", me.city_id);
  if (q) query = query.ilike("name", `%${q}%`);
  query = sirala === "ucuz" ? query.order("price") : sirala === "pahali" ? query.order("price", { ascending: false }) : query.order("created_at", { ascending: false });
  const { data } = await query;

  const link = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(tur && { tur }), ...(il && { il }), ...(sirala !== "yeni" && { sirala }), ...(q && { q }), ...patch });
    [...p.entries()].forEach(([k, v]) => { if (!v) p.delete(k); });
    return `/pazar?${p}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#d9f7e8] to-cream">
      <AppHeader me={me} />
      <main className="mx-auto max-w-6xl p-4 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-5xl font-bold">🤝 2. El Pazarı</h1>
            <p className="font-semibold text-ink/60">Oyuncuların sattığı araba, ev ve eşyalar. Satıcı fiyatın %95'ini alır.</p>
          </div>
          <Link href="/envanter" className="game-btn">+ İlan ver</Link>
        </div>

        <div className="my-5 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => <Link key={k.id} href={link({ tur: k.id })} className="chip" data-on={tur === k.id}>{k.icon} {k.label}</Link>)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={link({ il: "" })} className="chip" data-on={il !== "benim"}>🇹🇷 Tüm Türkiye</Link>
            <Link href={link({ il: "benim" })} className="chip" data-on={il === "benim"}>📍 Şehrim</Link>
            <span className="mx-1 text-ink/30">|</span>
            {SORTS.map((s) => <Link key={s.id} href={link({ sirala: s.id === "yeni" ? "" : s.id })} className="chip" data-on={sirala === s.id}>{s.label}</Link>)}
            <form className="ml-auto flex gap-2">
              {tur && <input type="hidden" name="tur" value={tur} />}
              {il && <input type="hidden" name="il" value={il} />}
              <input name="q" defaultValue={q} placeholder="Ara…" className="game-input !py-2" />
            </form>
          </div>
        </div>

        <Market listings={(data ?? []) as MarketListing[]} meId={me.id} balance={me.balance} />
      </main>
    </div>
  );
}
