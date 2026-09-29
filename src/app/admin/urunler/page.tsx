import { requireAdmin } from "@/lib/session";
import { PRODUCT_COLS, type Product, KIND_META } from "@/lib/catalog";
import { placeMeta } from "@/lib/places";
import ProductForm, { type StoreOption, type ChainOption } from "@/components/panel/ProductForm";
import { Filters, PageTitle, Pager, Section, qs } from "../_ui";
import AdminProductList from "./AdminProductList";

const SIZE = 50;

export default async function Urunler({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase, me } = await requireAdmin();
  const sp = await searchParams;
  const { q = "", tur = "", kat = "", durum = "", yer = "", sirala = "yeni" } = sp;
  const page = Math.max(1, Number(sp.sayfa) || 1);

  let query = supabase.from("products").select(`${PRODUCT_COLS}, stores(name, cities(name), malls(name)), chains(name)`, { count: "exact" });
  if (q) query = query.or(`name.ilike.%${q.replace(/[%,()]/g, "")}%,brand.ilike.%${q.replace(/[%,()]/g, "")}%`);
  if (tur) query = query.eq("kind", tur);
  if (kat) query = query.eq("category_id", Number(kat));
  if (durum) query = query.eq("status", durum);
  if (yer === "outlet") query = query.is("store_id", null).is("chain_id", null);
  else if (yer === "zincir") query = query.not("chain_id", "is", null);
  else if (yer === "magaza") query = query.not("store_id", "is", null);
  query = sirala === "ucuz" ? query.order("credit_price") : sirala === "pahali" ? query.order("credit_price", { ascending: false })
    : sirala === "ad" ? query.order("name") : query.order("created_at", { ascending: false });

  const [{ data: products, count }, { data: categories }, { data: storeList }, { data: chainList }] = await Promise.all([
    query.range((page - 1) * SIZE, page * SIZE - 1),
    supabase.from("categories").select("id, name, parent_id").order("id"),
    supabase.from("stores").select("id, name, cities(name), malls(name)").eq("status", "approved").is("chain_id", null).order("name"),
    supabase.from("chains").select("id, name, place_type").order("name"),
  ]);
  const ids = (products ?? []).map((p) => p.id);
  const { data: sold } = ids.length ? await supabase.from("inventory_items").select("product_id").in("product_id", ids) : { data: [] };
  const sales = new Map<string, number>();
  (sold ?? []).forEach((s) => sales.set(s.product_id, (sales.get(s.product_id) ?? 0) + 1));

  type Loc = { name: string; cities: { name: string } | null; malls: { name: string } | null } | null;
  const rows = (products ?? []).map((p) => {
    const chain = (p.chains as unknown as { name: string } | null)?.name;
    const st = p.stores as unknown as Loc;
    return { ...(p as unknown as Product), sales: sales.get(p.id) ?? 0,
      place: chain ? `${chain} (tüm şubeler)` : st ? `${st.name} · ${st.cities?.name} · ${st.malls?.name ?? "cadde"}` : "Dream Outlet" };
  });
  const storeOptions: StoreOption[] = (storeList ?? []).map((st) => {
    const l = st as unknown as NonNullable<Loc> & { id: string };
    return { id: l.id, label: `${l.name} — ${l.malls?.name ?? "Cadde"}`, group: l.cities?.name ?? "" };
  }).sort((a, b) => a.group.localeCompare(b.group, "tr"));
  const chainOptions: ChainOption[] = (chainList ?? []).map((c) => ({ id: c.id, label: `${placeMeta(c.place_type)?.icon ?? "🏷️"} ${c.name}` }));

  return (
    <>
      <PageTitle icon="📦" title="Ürünler" sub="Ara, filtrele, toplu yayına al / kaldır / sil, satır içinde düzenle" />
      <details className="game-panel mb-4 p-4">
        <summary className="cursor-pointer font-display text-lg font-bold">➕ Yeni ürün ekle</summary>
        <div className="mt-3"><ProductForm storeId={null} categories={categories ?? []} userId={me.id} stores={storeOptions} chains={chainOptions} /></div>
      </details>
      <Filters action="/admin/urunler">
        <input name="q" defaultValue={q} placeholder="Ürün veya marka ara…" className="game-input !w-60 !py-2" />
        <select name="tur" defaultValue={tur} className="game-input !w-auto !py-2">
          <option value="">Tüm türler</option>{Object.entries(KIND_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <select name="kat" defaultValue={kat} className="game-input !w-auto !py-2">
          <option value="">Tüm kategoriler</option>{(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.parent_id ? "— " : ""}{c.name}</option>)}
        </select>
        <select name="yer" defaultValue={yer} className="game-input !w-auto !py-2">
          <option value="">Her yer</option><option value="outlet">Dream Outlet</option><option value="zincir">Zincirler</option><option value="magaza">Tek mağaza</option>
        </select>
        <select name="durum" defaultValue={durum} className="game-input !w-auto !py-2">
          <option value="">Tüm durumlar</option><option value="active">● Yayında</option><option value="archived">○ Kapalı</option><option value="pending">Bekliyor</option>
        </select>
        <select name="sirala" defaultValue={sirala} className="game-input !w-auto !py-2">
          <option value="yeni">En yeni</option><option value="ad">A → Z</option><option value="ucuz">En ucuz</option><option value="pahali">En pahalı</option>
        </select>
      </Filters>
      <Section>
        <AdminProductList rows={rows} categories={categories ?? []} userId={me.id} stores={storeOptions} chains={chainOptions} />
        <Pager page={page} size={SIZE} total={count ?? 0} base={`/admin/urunler${qs({ q, tur, kat, durum, yer, sirala })}`} />
      </Section>
    </>
  );
}
