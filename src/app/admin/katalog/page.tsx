import { requireAdmin } from "@/lib/session";
import { KIND_META } from "@/lib/catalog";
import { PageTitle, Section } from "../_ui";
import { saveMall, deleteMall, saveChain, saveCategory, savePlaceType } from "../actions";

export default async function Katalog({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase } = await requireAdmin();
  const { il = "" } = await searchParams;
  const [{ data: cities }, { data: malls }, { data: chains }, { data: cats }, { data: types }, { data: branchCounts }] = await Promise.all([
    supabase.from("cities").select("id, name"),
    il ? supabase.from("malls").select("id, name, district, city_id").eq("city_id", Number(il)).order("name")
       : supabase.from("malls").select("id, name, district, city_id").order("created_at", { ascending: false }).limit(100),
    supabase.from("chains").select("id, name, place_type").order("name"),
    supabase.from("categories").select("id, name, kind, parent_id").order("id"),
    supabase.from("place_types").select("id, name, icon, sort").order("sort"),
    supabase.from("stores").select("chain_id").not("chain_id", "is", null),
  ]);
  const sorted = (cities ?? []).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const cityName = new Map(sorted.map((c) => [c.id, c.name]));
  const branches = new Map<string, number>();
  (branchCounts ?? []).forEach((b) => branches.set(b.chain_id!, (branches.get(b.chain_id!) ?? 0) + 1));
  const typeOpts = (types ?? []).map((t) => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>);

  return (
    <>
      <PageTitle icon="🏬" title="AVM · Zincir · Kategori" sub="Şehir yapısını ve katalog iskeletini yönet" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="🏬 AVM'ler" right={
          <form className="flex gap-2" action="/admin/katalog">
            <select name="il" defaultValue={il} className="game-input !w-auto !py-1.5 text-sm"><option value="">Son eklenenler</option>{sorted.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <button className="chip">Göster</button>
          </form>}>
          <form action={saveMall} className="mb-3 grid gap-2 sm:grid-cols-4">
            <select name="city_id" defaultValue={il || 34} className="game-input !py-2">{sorted.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <input name="name" className="game-input !py-2" placeholder="Yeni AVM adı" required />
            <input name="district" className="game-input !py-2" placeholder="İlçe" />
            <button className="game-btn !py-2">Ekle</button>
          </form>
          <div className="max-h-96 divide-y divide-[#e6ecf7] overflow-y-auto">
            {(malls ?? []).map((m) => (
              <form key={m.id} action={saveMall} className="flex items-center gap-2 py-1.5">
                <input type="hidden" name="id" value={m.id} /><input type="hidden" name="city_id" value={m.city_id} />
                <span className="w-24 shrink-0 text-xs font-bold text-ink/50">{cityName.get(m.city_id)}</span>
                <input name="name" defaultValue={m.name} className="game-input !py-1 text-sm" />
                <input name="district" defaultValue={m.district ?? ""} placeholder="İlçe" className="game-input !w-32 !py-1 text-sm" />
                <button className="chip !py-0.5 text-xs">Kaydet</button>
                <button formAction={deleteMall} className="chip !border-red-200 !py-0.5 text-xs !text-red-600">Sil</button>
              </form>
            ))}
          </div>
        </Section>

        <Section title="🔗 Zincirler (81 ilde şube)">
          <form action={saveChain} className="mb-3 grid gap-2 sm:grid-cols-4">
            <input name="name" className="game-input !py-2 sm:col-span-2" placeholder="Yeni zincir adı" required />
            <select name="place_type" className="game-input !py-2">{typeOpts}</select>
            <button className="game-btn !py-2">Ekle</button>
            <label className="flex items-center gap-2 text-xs font-bold sm:col-span-4"><input type="checkbox" name="branches" defaultChecked className="accent-[#c24dff]" /> 81 ilin hepsinde şube aç</label>
          </form>
          <div className="max-h-96 divide-y divide-[#e6ecf7] overflow-y-auto">
            {(chains ?? []).map((c) => (
              <form key={c.id} action={saveChain} className="flex items-center gap-2 py-1.5">
                <input type="hidden" name="id" value={c.id} />
                <input name="name" defaultValue={c.name} className="game-input !py-1 text-sm" />
                <select name="place_type" defaultValue={c.place_type ?? ""} className="game-input !w-40 !py-1 text-sm">{typeOpts}</select>
                <span className="w-16 text-right text-xs font-bold text-ink/50">{branches.get(c.id) ?? 0} şube</span>
                <button className="chip !py-0.5 text-xs">Kaydet</button>
              </form>
            ))}
          </div>
        </Section>

        <Section title="🗂️ Kategoriler">
          <form action={saveCategory} className="mb-3 grid gap-2 sm:grid-cols-4">
            <input name="name" className="game-input !py-2" placeholder="Yeni kategori" required />
            <select name="kind" className="game-input !py-2">{Object.entries(KIND_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
            <select name="parent_id" className="game-input !py-2"><option value="">Ana kategori</option>{(cats ?? []).filter((c) => !c.parent_id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <button className="game-btn !py-2">Ekle</button>
          </form>
          <div className="max-h-96 divide-y divide-[#e6ecf7] overflow-y-auto">
            {(cats ?? []).map((c) => (
              <form key={c.id} action={saveCategory} className="flex items-center gap-2 py-1.5">
                <input type="hidden" name="id" value={c.id} /><input type="hidden" name="parent_id" value={c.parent_id ?? ""} />
                <span className="w-6 text-xs text-ink/40">{c.id}</span>
                <input name="name" defaultValue={c.name} className={`game-input !py-1 text-sm ${c.parent_id ? "ml-4" : ""}`} />
                <select name="kind" defaultValue={c.kind} className="game-input !w-32 !py-1 text-sm">{Object.entries(KIND_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
                <button className="chip !py-0.5 text-xs">Kaydet</button>
              </form>
            ))}
          </div>
          <p className="mt-2 text-xs font-semibold text-ink/50">Not: 1–19 numaralı kategorilerin ürün türü ve karakter/ev görünümü kodla eşleştirildi; yeni kategoriler “Diğer” gibi davranır.</p>
        </Section>

        <Section title="🏷️ İşletme türleri">
          <form action={savePlaceType} className="mb-3 grid gap-2 sm:grid-cols-5">
            <input name="id" className="game-input !py-2" placeholder="kod (ör. saat)" required />
            <input name="name" className="game-input !py-2" placeholder="Ad" required />
            <input name="icon" className="game-input !py-2" placeholder="İkon ⌚" />
            <input name="sort" type="number" className="game-input !py-2" placeholder="Sıra" />
            <button className="game-btn !py-2">Ekle</button>
          </form>
          <div className="flex flex-wrap gap-2">{(types ?? []).map((t) => <span key={t.id} className="chip">{t.icon} {t.name} <span className="text-ink/40">({t.id})</span></span>)}</div>
          <p className="mt-2 text-xs font-semibold text-ink/50">Yeni türler mağaza formlarında görünmesi için bir sonraki güncellemede koddaki listeye de eklenecek.</p>
        </Section>
      </div>
    </>
  );
}
