import { requireMe } from "@/lib/session";
import { PRODUCT_COLS, type Product, type MarketSettings } from "@/lib/catalog";
import { carOf } from "@/lib/home";
import AppHeader from "@/components/AppHeader";
import GarageView from "./GarageView";

export default async function GarajPage() {
  const { supabase, me } = await requireMe("/garaj");
  const [{ data: inv }, { data: prof }, { data: ms }] = await Promise.all([
    supabase.from("inventory_items").select(`id, paid_credits, products!inner(${PRODUCT_COLS})`)
      .eq("owner_id", me.id).eq("status", "owned").eq("products.kind", "car").order("acquired_at"),
    supabase.from("profiles").select("car_item_id").eq("id", me.id).single(),
    supabase.from("market_settings").select("fee_percent, quick_sell_pct").maybeSingle(),
  ]);
  const cars = ((inv ?? []) as unknown as { id: string; paid_credits: number; products: Product }[]).map((i) => ({
    id: i.id, name: i.products.name, brand: i.products.brand, paid: i.paid_credits, price: i.products.credit_price, ...carOf(i.products),
  }));
  const settings: MarketSettings = { fee_percent: Number(ms?.fee_percent ?? 5), quick_sell_pct: Number(ms?.quick_sell_pct ?? 50) };
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#d8ecff] to-cream">
      <AppHeader me={me} />
      <main className="mx-auto max-w-7xl p-4 pb-16">
        <h1 className="mb-4 font-display text-4xl font-bold">🚗 Garajım</h1>
        <GarageView cars={cars} favorite={prof?.car_item_id ?? null} settings={settings} />
      </main>
    </div>
  );
}
