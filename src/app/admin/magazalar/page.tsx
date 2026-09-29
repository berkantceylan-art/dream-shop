import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { PLACE_TYPES, placeMeta } from "@/lib/places";
import { Filters, PageTitle, Pager, Section, fmt, qs, STORE_STATUS } from "../_ui";
import { StoreActions } from "../AdminButtons";
import AdminStoreForm from "../AdminStoreForm";

const SIZE = 50;

export default async function Magazalar({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const { q = "", durum = "", tur = "", il = "", zincir = "" } = sp;
  const page = Math.max(1, Number(sp.sayfa) || 1);

  let query = supabase.from("stores").select("id, name, slug, status, place_type, district, created_at, owner_id, chain_id, cities(name), malls(name)", { count: "exact" });
  if (q) query = query.ilike("name", `%${q}%`);
  if (durum) query = query.eq("status", durum);
  if (tur) query = query.eq("place_type", tur);
  if (il) query = query.eq("city_id", Number(il));
  if (zincir === "evet") query = query.not("chain_id", "is", null); else if (zincir !== "hepsi") query = query.is("chain_id", null);
  const [{ data: stores, count }, { data: cities }, { data: malls }, { data: districts }] = await Promise.all([
    query.order("created_at", { ascending: false }).range((page - 1) * SIZE, page * SIZE - 1),
    supabase.from("cities").select("id, name"),
    supabase.from("malls").select("id, name, city_id").order("name"),
    supabase.from("districts").select("city_id, name").order("name").limit(2000),
  ]);
  const ownerIds = Array.from(new Set((stores ?? []).map((s) => s.owner_id).filter(Boolean))) as string[];
  const { data: owners } = ownerIds.length ? await supabase.from("profiles").select("id, username").in("id", ownerIds) : { data: [] };
  const owner = new Map((owners ?? []).map((o) => [o.id, o.username]));
  const sortedCities = (cities ?? []).sort((a, b) => a.name.localeCompare(b.name, "tr"));

  return (
    <>
      <PageTitle icon="🏪" title="Mağazalar" sub="Başvuruları onayla, düzenle, sil. Varsayılan olarak zincir şubeleri gizlenir." />
      <details className="game-panel mb-4 p-4">
        <summary className="cursor-pointer font-display text-lg font-bold">➕ Yeni dükkân aç</summary>
        <div className="mt-3"><AdminStoreForm cities={sortedCities} malls={malls ?? []} districts={districts ?? []} /></div>
      </details>
      <Filters action="/admin/magazalar">
        <input name="q" defaultValue={q} placeholder="Mağaza adı…" className="game-input !w-56 !py-2" />
        <select name="durum" defaultValue={durum} className="game-input !w-auto !py-2">
          <option value="">Tüm durumlar</option><option value="pending">⏳ Bekleyen</option><option value="approved">✅ Onaylı</option><option value="suspended">⛔ Askıda</option>
        </select>
        <select name="tur" defaultValue={tur} className="game-input !w-auto !py-2">
          <option value="">Tüm türler</option>{PLACE_TYPES.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
        </select>
        <select name="il" defaultValue={il} className="game-input !w-auto !py-2">
          <option value="">Tüm şehirler</option>{sortedCities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="zincir" defaultValue={zincir} className="game-input !w-auto !py-2">
          <option value="">Bağımsızlar</option><option value="evet">Zincir şubeleri</option><option value="hepsi">Hepsi</option>
        </select>
      </Filters>
      <Section>
        <div className="divide-y divide-[#e6ecf7]">
          {(stores ?? []).map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <span className="text-2xl">{placeMeta(s.place_type)?.icon ?? "🏷️"}</span>
              <div className="min-w-56 flex-1">
                <Link href={`/admin/magazalar/${s.id}`} className="font-bold text-crystal">{s.name}</Link>
                <p className="text-xs font-semibold text-ink/50">
                  {(s.cities as unknown as { name: string } | null)?.name} · {(s.malls as unknown as { name: string } | null)?.name ?? s.district ?? "Merkez"}
                  {s.owner_id ? ` · @${owner.get(s.owner_id)}` : s.chain_id ? " · zincir şubesi" : " · platform"} · {fmt(s.created_at)}
                </p>
              </div>
              <span className="text-sm font-bold">{STORE_STATUS[s.status]}</span>
              <StoreActions id={s.id} status={s.status} />
              <Link href={`/admin/magazalar/${s.id}`} className="chip">✏️ Düzenle</Link>
            </div>
          ))}
        </div>
        <Pager page={page} size={SIZE} total={count ?? 0} base={`/admin/magazalar${qs({ q, durum, tur, il, zincir })}`} />
      </Section>
    </>
  );
}
