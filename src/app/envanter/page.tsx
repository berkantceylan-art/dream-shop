import Link from "next/link";
import { requireMe } from "@/lib/session";
import { PRODUCT_COLS, type Product } from "@/lib/catalog";
import { heightScale, normalizeAvatar } from "@/lib/avatar";
import AppHeader from "@/components/AppHeader";
import ProductCard from "@/components/ProductCard";
import { AvatarStageLazy } from "@/components/3d/Lazy";
import EquipButton from "./EquipButton";
import SellButton, { CancelListingButton } from "./SellButton";
import Credits from "@/components/Credits";
import type { MarketSettings } from "@/lib/catalog";

const TABS = [
  { id: "gardirop", label: "Gardırop", icon: "👗", kinds: ["clothing", "accessory"] },
  { id: "garaj", label: "Garaj", icon: "🚗", kinds: ["car"] },
  { id: "evim", label: "Evim", icon: "🏡", kinds: ["house", "furniture"] },
  { id: "diger", label: "Diğer", icon: "📦", kinds: ["other"] },
  { id: "satista", label: "Satışta", icon: "🤝", kinds: [] },
] as const;

type Item = { id: string; equipped: boolean; acquired_at: string; source: string; status: string; paid_credits: number; products: Product };

export default async function EnvanterPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { supabase, me } = await requireMe("/envanter");
  const { tab = "gardirop" } = await searchParams;
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  const [{ data: items }, { data: avatar }, { data: listings }, { data: ms }] = await Promise.all([
    supabase.from("inventory_items").select(`id, equipped, acquired_at, source, status, paid_credits, products(${PRODUCT_COLS})`)
      .eq("owner_id", me.id).in("status", ["owned", "listed"]).order("acquired_at", { ascending: false }),
    supabase.from("avatars").select("config").eq("user_id", me.id).maybeSingle(),
    supabase.from("resale_listings").select("id, inventory_item_id, price").eq("seller_id", me.id).eq("status", "active"),
    supabase.from("market_settings").select("fee_percent, quick_sell_pct").maybeSingle(),
  ]);
  const settings: MarketSettings = { fee_percent: Number(ms?.fee_percent ?? 5), quick_sell_pct: Number(ms?.quick_sell_pct ?? 50) };
  const listingOf = new Map((listings ?? []).map((l) => [l.inventory_item_id, l]));
  const everything = ((items ?? []) as unknown as Item[]).filter((i) => i.products);
  const all = everything.filter((i) => i.status === "owned");
  const listed = everything.filter((i) => i.status === "listed");
  const count = (t: (typeof TABS)[number]) => t.id === "satista" ? listed.length
    : all.filter((i) => (t.kinds as readonly string[]).includes(i.products.kind)).length;
  const list = active.id === "satista" ? listed : all.filter((i) => (active.kinds as readonly string[]).includes(i.products.kind));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#efe3ff] to-cream">
      <AppHeader me={me} />
      <main className="mx-auto grid max-w-6xl gap-4 p-4 pb-16 lg:grid-cols-[300px_1fr]">
        <aside className="game-panel h-fit p-4 lg:sticky lg:top-20">
          {avatar ? (
            <AvatarStageLazy config={normalizeAvatar(avatar.config)} scale={heightScale(me.height_cm)} className="h-80 w-full" />
          ) : (
            <Link href="/karakter" className="game-btn w-full">Önce karakterini oluştur</Link>
          )}
          <p className="mt-2 text-center font-display text-xl font-bold">{me.display_name || me.username}</p>
          <p className="text-center text-sm font-semibold text-ink/50">{all.length} eşya{listed.length ? ` · ${listed.length} satışta` : ""}</p>
          <Link href="/pazar" className="game-btn ghost mt-3 w-full !py-2">🤝 2. El Pazarı</Link>
        </aside>

        <section>
          <h1 className="font-display text-4xl font-bold">Eşyalarım</h1>
          <div className="my-4 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <Link key={t.id} href={`/envanter?tab=${t.id}`} className="chip" data-on={t.id === active.id}>
                {t.icon} {t.label} <span className="opacity-60">({count(t)})</span>
              </Link>
            ))}
          </div>
          {(active.id === "garaj" || active.id === "evim") && (
            <Link href={active.id === "garaj" ? "/garaj" : "/evim"} className="game-panel mb-4 flex items-center gap-3 p-4 transition hover:-translate-y-0.5">
              <span className="text-3xl">{active.icon}</span>
              <span className="flex-1 font-display text-lg font-bold">{active.id === "garaj" ? "Garajını 3D gör" : "Evini 3D gör ve eşyalarını yerleştir"}</span>
              <span className="game-btn !py-2">Aç →</span>
            </Link>
          )}
          {list.length === 0 ? (
            <div className="game-panel p-10 text-center">
              <p className="text-5xl">{active.icon}</p>
              <p className="mt-3 font-display text-2xl font-bold">{active.label} şimdilik boş</p>
              <Link href="/sehir" className="game-btn mt-6">Alışverişe çık 🛍️</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {list.map((i) => (
                <ProductCard key={i.id} p={i.products}>
                  {i.status === "listed" ? (
                    <div className="flex items-center justify-between gap-2 px-1">
                      <span className="text-xs font-bold text-ink/60">İlanda: <Credits amount={listingOf.get(i.id)?.price ?? 0} /></span>
                      {listingOf.get(i.id) && <CancelListingButton listingId={listingOf.get(i.id)!.id} />}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 px-1">
                      {i.equipped ? <span className="text-xs font-bold text-mint">✓ Üzerinde</span> : <span />}
                      <div className="flex gap-1.5">
                        {i.products.wear_slot && <EquipButton id={i.id} equipped={i.equipped} />}
                        <SellButton itemId={i.id} name={i.products.name} paid={i.paid_credits} storePrice={i.products.credit_price} settings={settings} />
                      </div>
                    </div>
                  )}
                </ProductCard>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
