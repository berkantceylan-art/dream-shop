import { requireMe } from "@/lib/session";
import { PRODUCT_COLS, type Product } from "@/lib/catalog";
import { heightScale, normalizeAvatar } from "@/lib/avatar";
import { HOME_SIZES, STARTER_HOME, autoPlace, carOf, furnitureOf, homeOf } from "@/lib/home";
import AppHeader from "@/components/AppHeader";
import HomeEditor from "./HomeEditor";

// Evde gösterilmeyen kategoriler: gıda (12), kozmetik (11)
const HIDDEN_CATEGORIES = new Set([11, 12]);

type Item = { id: string; products: Product };

export default async function EvimPage() {
  const { supabase, me } = await requireMe("/evim");
  const [{ data: inv }, { data: prof }, { data: layout }, { data: avatar }] = await Promise.all([
    supabase.from("inventory_items").select(`id, products(${PRODUCT_COLS})`).eq("owner_id", me.id).eq("status", "owned")
      .order("acquired_at"),
    supabase.from("profiles").select("home_item_id, car_item_id").eq("id", me.id).single(),
    supabase.from("home_layout").select("item_id, x, z, rot").eq("owner_id", me.id),
    supabase.from("avatars").select("config").eq("user_id", me.id).maybeSingle(),
  ]);
  const items = ((inv ?? []) as unknown as Item[]).filter((i) => i.products);
  const houses = items.filter((i) => i.products.kind === "house");
  const cars = items.filter((i) => i.products.kind === "car");
  const home = houses.find((h) => h.id === prof?.home_item_id) ?? houses[0];
  const car = cars.find((c) => c.id === prof?.car_item_id) ?? cars[0];

  const h = home ? homeOf(home.products) : { size: STARTER_HOME.size, color: STARTER_HOME.color };
  const dims = HOME_SIZES[h.size];
  const pos = new Map((layout ?? []).map((l) => [l.item_id, l]));
  let auto = 0;
  const decor = items
    .filter((i) => (i.products.kind === "furniture" || i.products.kind === "other") && !HIDDEN_CATEGORIES.has(i.products.category_id))
    .map((i) => {
      const f = furnitureOf(i.products);
      const p = pos.get(i.id) ?? autoPlace(auto++, dims.w, dims.d);
      return { id: i.id, name: i.products.name, type: f.type, color: f.color, x: p.x, z: p.z, rot: p.rot };
    });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff1c7] to-cream">
      <AppHeader me={me} />
      <main className="mx-auto max-w-7xl p-4 pb-16">
        <h1 className="mb-4 font-display text-4xl font-bold">🏡 Evim</h1>
        <HomeEditor size={h.size} wallColor={h.color} homeName={home ? `${home.products.name} · ${dims.label}` : STARTER_HOME.name}
          houses={houses.map((x) => ({ id: x.id, name: x.products.name }))} activeHouse={home?.id ?? null}
          initialItems={decor} avatar={avatar ? normalizeAvatar(avatar.config) : null} avatarScale={heightScale(me.height_cm)}
          car={dims.garden && car ? carOf(car.products) : null} />
      </main>
    </div>
  );
}
