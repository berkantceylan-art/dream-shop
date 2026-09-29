import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe } from "@/lib/session";
import { OUTLET_SLUG, PRODUCT_COLS, type Product } from "@/lib/catalog";
import AppHeader from "@/components/AppHeader";
import { placeMeta } from "@/lib/places";
import Shop from "./Shop";

export default async function MagazaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, me } = await requireMe(`/magaza/${slug}`);

  let title = "Dream Outlet", subtitle = "Resmi mağaza · Her şehirde", back = { href: "/sehir", label: "Şehir" };
  let q = supabase.from("products").select(PRODUCT_COLS).eq("status", "active");
  if (slug === OUTLET_SLUG) {
    q = q.is("store_id", null).is("chain_id", null);
  } else {
    const { data: store } = await supabase.from("stores")
      .select("id, name, mall_id, chain_id, district, place_type, city_id, malls(name), cities(name)").eq("slug", slug).eq("status", "approved").maybeSingle();
    if (!store) notFound();
    const mall = store.malls as unknown as { name: string } | null;
    const city = (store.cities as unknown as { name: string } | null)?.name;
    const pt = placeMeta(store.place_type);
    title = `${pt?.icon ?? ""} ${store.name}`.trim();
    subtitle = mall ? `${mall.name} · ${city}` : `${pt?.name ?? "Mağaza"} · ${store.district ?? "Merkez"}, ${city}`;
    back = store.mall_id ? { href: `/avm/${store.mall_id}`, label: mall?.name ?? "AVM" }
      : { href: `/sehir?il=${store.city_id}${store.place_type ? `&tur=${store.place_type}` : ""}`, label: city ?? "Şehir" };
    q = store.chain_id ? q.or(`store_id.eq.${store.id},chain_id.eq.${store.chain_id}`) : q.eq("store_id", store.id);
  }
  const [{ data: products }, { data: wl }] = await Promise.all([
    q.order("created_at", { ascending: false }),
    supabase.from("wishlist").select("product_id").eq("user_id", me.id),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff1c7] to-cream">
      <AppHeader me={me} />
      <main className="mx-auto max-w-6xl p-4 pb-16">
        <Link href={back.href} className="text-sm font-bold text-crystal">← {back.label}</Link>
        <h1 className="mt-1 font-display text-5xl font-bold">{title}</h1>
        <p className="mb-6 font-semibold text-ink/60">{subtitle}</p>
        <Shop products={(products ?? []) as Product[]} wished={(wl ?? []).map((w) => w.product_id)} balance={me.balance} />
      </main>
    </div>
  );
}
