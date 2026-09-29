import Link from "next/link";
import { requireMe } from "@/lib/session";
import { OUTLET_SLUG } from "@/lib/catalog";
import AppHeader from "@/components/AppHeader";
import Crystal from "@/components/Crystal";
import StoreGrid from "@/components/StoreGrid";

export default async function SehirPage({ searchParams }: { searchParams: Promise<{ il?: string }> }) {
  const { supabase, me } = await requireMe("/sehir");
  const { il } = await searchParams;
  const cityId = Number(il) || me.city_id || 34;

  const [{ data: cities }, { data: malls }, { data: street }] = await Promise.all([
    supabase.from("cities").select("id, name"),
    supabase.from("malls").select("id, name, district").eq("city_id", cityId).order("name"),
    supabase.from("stores").select("id, name, slug, logo_url").eq("city_id", cityId).is("mall_id", null).eq("status", "approved").order("name"),
  ]);
  const sorted = (cities ?? []).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const city = sorted.find((c) => c.id === cityId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-top via-sky-bottom to-cream">
      <AppHeader me={me} />
      <main className="mx-auto max-w-6xl p-4 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink/60">📍 Şu an buradasın</p>
            <h1 className="font-display text-5xl font-bold">{city?.name}</h1>
          </div>
          <form className="flex gap-2">
            <select name="il" defaultValue={cityId} className="game-input !w-auto">
              {sorted.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="game-btn ghost !py-2">Şehre git</button>
          </form>
        </div>

        <h2 className="mb-3 mt-8 font-display text-2xl font-bold">🏬 Alışveriş merkezleri</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(malls ?? []).map((m) => (
            <Link key={m.id} href={`/avm/${m.id}`} className="game-panel group overflow-hidden transition hover:-translate-y-1">
              <div className="relative h-32 bg-gradient-to-br from-crystal-light to-crystal">
                <div className="absolute inset-x-6 bottom-0 h-20 rounded-t-2xl bg-white/85
                  [background-image:repeating-linear-gradient(90deg,transparent_0_22px,#c24dff22_22px_28px)]" />
                <Crystal size={28} className="absolute left-1/2 top-3 -translate-x-1/2 animate-bob" />
              </div>
              <div className="p-4">
                <p className="font-display text-xl font-bold">{m.name}</p>
                <p className="text-sm font-semibold text-ink/60">{m.district ?? "Merkez"} · Kapıdan gir →</p>
              </div>
            </Link>
          ))}
          <Link href={`/magaza/${OUTLET_SLUG}`} className="game-panel overflow-hidden transition hover:-translate-y-1">
            <div className="grid h-32 place-items-center bg-gradient-to-br from-gold to-[#ff922b] text-6xl">🛍️</div>
            <div className="p-4">
              <p className="font-display text-xl font-bold">Dream Outlet</p>
              <p className="text-sm font-semibold text-ink/60">Her şehirde · Resmi mağaza</p>
            </div>
          </Link>
        </div>

        {!!street?.length && (
          <>
            <h2 className="mb-3 mt-10 font-display text-2xl font-bold">🛣️ Cadde mağazaları</h2>
            <StoreGrid stores={street} />
          </>
        )}
      </main>
    </div>
  );
}
