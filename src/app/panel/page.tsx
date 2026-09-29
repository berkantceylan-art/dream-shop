import Link from "next/link";
import { requireMe } from "@/lib/session";
import { PRODUCT_COLS, type Product } from "@/lib/catalog";
import AppHeader from "@/components/AppHeader";
import ProductForm from "@/components/panel/ProductForm";
import ProductTable from "@/components/panel/ProductTable";
import ApplyForm from "./ApplyForm";

export default async function PanelPage() {
  const { supabase, me } = await requireMe("/panel");
  const { data: store } = await supabase.from("stores")
    .select("id, name, slug, status, mall_id, malls(name), cities(name)").eq("owner_id", me.id).maybeSingle();

  let body: React.ReactNode;
  if (!store) {
    const [{ data: cities }, { data: malls }] = await Promise.all([
      supabase.from("cities").select("id, name"),
      supabase.from("malls").select("id, name, city_id").order("name"),
    ]);
    body = (
      <div className="game-panel mx-auto max-w-xl p-8">
        <h1 className="font-display text-3xl font-bold">🏪 Mağazanı aç</h1>
        <p className="mb-6 mt-1 font-semibold text-ink/60">
          Ürünlerini Türkiye'nin her yerindeki oyunculara sergile. Hangi ürünlerinin ne kadar ilgi gördüğünü raporlarla takip et.
        </p>
        <ApplyForm cities={(cities ?? []).sort((a, b) => a.name.localeCompare(b.name, "tr"))} malls={malls ?? []} defaultCity={me.city_id ?? 34} />
      </div>
    );
  } else if (store.status !== "approved") {
    body = (
      <div className="game-panel mx-auto max-w-xl p-10 text-center">
        <p className="text-6xl">{store.status === "pending" ? "⏳" : "⛔"}</p>
        <h1 className="mt-3 font-display text-3xl font-bold">{store.name}</h1>
        <p className="mt-2 font-semibold text-ink/60">
          {store.status === "pending" ? "Başvurun inceleniyor. Onaylandığında ürün eklemeye başlayabilirsin." : "Mağazan askıya alındı. Destek ekibiyle iletişime geç."}
        </p>
      </div>
    );
  } else {
    const [{ data: products }, { data: categories }] = await Promise.all([
      supabase.from("products").select(PRODUCT_COLS).eq("store_id", store.id).order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name, parent_id").order("id"),
    ]);
    const ids = (products ?? []).map((p) => p.id);
    const { data: sold } = ids.length
      ? await supabase.from("inventory_items").select("product_id").in("product_id", ids).eq("source", "store")
      : { data: [] as { product_id: string }[] };
    const sales: Record<string, number> = {};
    (sold ?? []).forEach((s) => { sales[s.product_id] = (sales[s.product_id] ?? 0) + 1; });
    const totalSales = Object.values(sales).reduce((a, b) => a + b, 0);
    const mall = store.malls as unknown as { name: string } | null;
    const city = (store.cities as unknown as { name: string } | null)?.name;

    body = (
      <div className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink/60">Mağaza paneli</p>
            <h1 className="font-display text-4xl font-bold">{store.name}</h1>
            <p className="font-semibold text-ink/60">{mall?.name ?? "Cadde mağazası"} · {city}</p>
          </div>
          <Link href={`/magaza/${store.slug}`} className="game-btn ghost">Vitrini gör →</Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Aktif ürün" value={(products ?? []).filter((p) => p.status === "active").length} />
          <Stat label="Toplam satış" value={totalSales} />
          <Stat label="Kategori" value={new Set((products ?? []).map((p) => p.kind)).size} />
        </div>
        <section className="game-panel p-6">
          <h2 className="mb-4 font-display text-2xl font-bold">➕ Yeni ürün</h2>
          <ProductForm storeId={store.id} categories={categories ?? []} userId={me.id} />
        </section>
        <section className="game-panel p-6">
          <h2 className="mb-2 font-display text-2xl font-bold">📦 Ürünlerim</h2>
          <ProductTable products={(products ?? []) as Product[]} sales={sales} />
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#d8ecff] to-cream">
      <AppHeader me={me} />
      <main className="mx-auto max-w-5xl p-4 pb-16">{body}</main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="game-panel p-4 text-center">
      <p className="font-display text-3xl font-bold">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wide text-ink/50">{label}</p>
    </div>
  );
}
