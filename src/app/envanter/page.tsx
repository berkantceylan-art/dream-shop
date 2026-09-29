import Link from "next/link";
import { requireMe } from "@/lib/session";
import { PRODUCT_COLS, type Product } from "@/lib/catalog";
import { heightScale, normalizeAvatar } from "@/lib/avatar";
import AppHeader from "@/components/AppHeader";
import ProductCard from "@/components/ProductCard";
import { AvatarStageLazy } from "@/components/3d/Lazy";
import EquipButton from "./EquipButton";

const TABS = [
  { id: "gardirop", label: "Gardırop", icon: "👗", kinds: ["clothing", "accessory"] },
  { id: "garaj", label: "Garaj", icon: "🚗", kinds: ["car"] },
  { id: "evim", label: "Evim", icon: "🏡", kinds: ["house", "furniture"] },
  { id: "diger", label: "Diğer", icon: "📦", kinds: ["other"] },
] as const;

type Item = { id: string; equipped: boolean; acquired_at: string; source: string; products: Product };

export default async function EnvanterPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { supabase, me } = await requireMe("/envanter");
  const { tab = "gardirop" } = await searchParams;
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  const [{ data: items }, { data: avatar }] = await Promise.all([
    supabase.from("inventory_items").select(`id, equipped, acquired_at, source, products(${PRODUCT_COLS})`)
      .eq("owner_id", me.id).eq("status", "owned").order("acquired_at", { ascending: false }),
    supabase.from("avatars").select("config").eq("user_id", me.id).maybeSingle(),
  ]);
  const all = (items ?? []) as unknown as Item[];
  const count = (kinds: readonly string[]) => all.filter((i) => kinds.includes(i.products.kind)).length;
  const list = all.filter((i) => (active.kinds as readonly string[]).includes(i.products.kind));

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
          <p className="text-center text-sm font-semibold text-ink/50">{all.length} eşya</p>
        </aside>

        <section>
          <h1 className="font-display text-4xl font-bold">Eşyalarım</h1>
          <div className="my-4 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <Link key={t.id} href={`/envanter?tab=${t.id}`} className="chip" data-on={t.id === active.id}>
                {t.icon} {t.label} <span className="opacity-60">({count(t.kinds)})</span>
              </Link>
            ))}
          </div>
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
                  <div className="flex items-center justify-between gap-2 px-1">
                    {i.equipped ? <span className="text-xs font-bold text-mint">✓ Üzerinde</span> : <span />}
                    {i.products.wear_slot && <EquipButton id={i.id} equipped={i.equipped} />}
                  </div>
                </ProductCard>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
