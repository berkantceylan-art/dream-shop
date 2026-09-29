import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { PRODUCT_COLS, type Product } from "@/lib/catalog";
import ProductTable from "@/components/panel/ProductTable";
import ProductForm from "@/components/panel/ProductForm";
import { Section } from "../../_ui";
import StoreEdit from "../StoreEdit";

export default async function AdminStore({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, me } = await requireAdmin();
  const { data: s } = await supabase.from("stores").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();
  const [{ data: cities }, { data: malls }, { data: districts }, { data: products }, { data: categories }, { data: owner }] = await Promise.all([
    supabase.from("cities").select("id, name"),
    supabase.from("malls").select("id, name, city_id").order("name"),
    supabase.from("districts").select("city_id, name").order("name").limit(2000),
    supabase.from("products").select(PRODUCT_COLS).or(`store_id.eq.${id}${s.chain_id ? `,chain_id.eq.${s.chain_id}` : ""}`).order("created_at", { ascending: false }),
    supabase.from("categories").select("id, name, parent_id").order("id"),
    s.owner_id ? supabase.from("profiles").select("id, username").eq("id", s.owner_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return (
    <>
      <Link href="/admin/magazalar" className="text-sm font-bold text-crystal">← Mağazalar</Link>
      <h1 className="mb-4 mt-1 font-display text-3xl font-bold">{s.name}</h1>
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-4">
          <Section title="➕ Bu mağazaya ürün ekle"><ProductForm storeId={id} categories={categories ?? []} userId={me.id} /></Section>
          <Section title={`📦 Ürünler (${products?.length ?? 0})`}>
            <ProductTable products={(products ?? []) as Product[]} categories={categories ?? []} userId={me.id} />
          </Section>
        </div>
        <div className="grid h-fit gap-4">
          <Section title="✏️ Mağaza bilgileri">
            <StoreEdit s={s} cities={(cities ?? []).sort((a, b) => a.name.localeCompare(b.name, "tr"))} malls={malls ?? []} districts={districts ?? []} />
          </Section>
          <Section title="Sahip">
            {owner ? <Link href={`/admin/kullanicilar/${owner.id}`} className="font-bold text-crystal">@{owner.username}</Link>
              : <p className="text-sm font-semibold text-ink/60">{s.chain_id ? "Zincir şubesi (platform)" : "Platform mağazası"}</p>}
            {s.tax_no && <p className="mt-1 text-sm">VKN: {s.tax_no}</p>}
            <Link href={`/magaza/${s.slug}`} className="mt-2 inline-block text-sm font-bold text-crystal">Vitrini gör →</Link>
          </Section>
        </div>
      </div>
    </>
  );
}
