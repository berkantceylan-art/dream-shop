import Link from "next/link";
import { requireMe } from "@/lib/session";
import { OUTLET_SLUG } from "@/lib/catalog";
import { PLACE_TYPES, placeMeta } from "@/lib/places";
import AppHeader from "@/components/AppHeader";
import Crystal from "@/components/Crystal";
import StoreGrid from "@/components/StoreGrid";
import CityPicker from "./CityPicker";

export default async function SehirPage({ searchParams }: { searchParams: Promise<{ il?: string; ilce?: string; tur?: string }> }) {
  const { supabase, me } = await requireMe("/sehir");
  const { il, ilce = "", tur } = await searchParams;
  const cityId = Number(il) || me.city_id || 34;

  const [{ data: cities }, { data: districts }, { data: malls }, { data: shops }] = await Promise.all([
    supabase.from("cities").select("id, name"),
    supabase.from("districts").select("name").eq("city_id", cityId).order("name"),
    supabase.from("malls").select("id, name, district").eq("city_id", cityId).order("name"),
    supabase.from("stores").select("id, name, slug, logo_url, place_type, district")
      .eq("city_id", cityId).is("mall_id", null).eq("status", "approved").order("name"),
  ]);
  const sortedCities = (cities ?? []).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const city = sortedCities.find((c) => c.id === cityId);
  const inDistrict = <T extends { district: string | null }>(x: T) => !ilce || !x.district || x.district === ilce;
  const visibleShops = (shops ?? []).filter(inDistrict);
  const visibleMalls = (malls ?? []).filter(inDistrict);
  const qs = (extra: Record<string, string>) => new URLSearchParams({ il: String(cityId), ...(ilce ? { ilce } : {}), ...extra }).toString();

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-ink/60">📍 Şu an buradasın</p>
        <h1 className="font-display text-5xl font-bold">{city?.name}{ilce && <span className="text-ink/40"> / {ilce}</span>}</h1>
      </div>
      <CityPicker cities={sortedCities} districts={(districts ?? []).map((d) => d.name)} cityId={cityId} district={ilce} />
    </div>
  );

  // ---- Tek bir işletme türünün listesi ----
  if (tur) {
    const pt = placeMeta(tur);
    const list = visibleShops.filter((s) => s.place_type === tur);
    return (
      <Shell me={me}>
        <Link href={`/sehir?${qs({})}`} className="text-sm font-bold text-crystal">← {city?.name} çarşısı</Link>
        {header}
        <h2 className="mb-3 mt-8 font-display text-2xl font-bold">{pt?.icon} {pt?.name ?? "Mağazalar"}</h2>
        {list.length ? <StoreGrid stores={list} /> : <Empty />}
      </Shell>
    );
  }

  // ---- Şehir genel görünümü ----
  const counts = new Map<string, number>();
  visibleShops.forEach((s) => s.place_type && counts.set(s.place_type, (counts.get(s.place_type) ?? 0) + 1));
  const independents = visibleShops.filter((s) => !s.place_type);

  return (
    <Shell me={me}>
      {header}

      <h2 className="mb-3 mt-8 font-display text-2xl font-bold">🏬 Alışveriş merkezleri</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleMalls.map((m) => (
          <Link key={m.id} href={`/avm/${m.id}`} className="game-panel overflow-hidden transition hover:-translate-y-1">
            <div className="relative h-28 bg-gradient-to-br from-crystal-light to-crystal">
              <div className="absolute inset-x-6 bottom-0 h-16 rounded-t-2xl bg-white/85
                [background-image:repeating-linear-gradient(90deg,transparent_0_22px,#c24dff22_22px_28px)]" />
              <Crystal size={26} className="absolute left-1/2 top-3 -translate-x-1/2 animate-bob" />
            </div>
            <div className="p-4">
              <p className="font-display text-xl font-bold">{m.name}</p>
              <p className="text-sm font-semibold text-ink/60">{m.district ?? "Merkez"} · Kapıdan gir →</p>
            </div>
          </Link>
        ))}
        <Link href={`/magaza/${OUTLET_SLUG}`} className="game-panel overflow-hidden transition hover:-translate-y-1">
          <div className="grid h-28 place-items-center bg-gradient-to-br from-gold to-[#ff922b] text-5xl">🛍️</div>
          <div className="p-4">
            <p className="font-display text-xl font-bold">Dream Outlet</p>
            <p className="text-sm font-semibold text-ink/60">Her şehirde · Resmi mağaza</p>
          </div>
        </Link>
      </div>

      <h2 className="mb-3 mt-10 font-display text-2xl font-bold">🛣️ Çarşı</h2>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {PLACE_TYPES.filter((p) => counts.get(p.id)).map((p) => (
          <Link key={p.id} href={`/sehir?${qs({ tur: p.id })}`}
            className="game-panel flex flex-col items-center gap-1 p-4 text-center transition hover:-translate-y-1">
            <span className="text-4xl">{p.icon}</span>
            <span className="font-display font-semibold leading-tight">{p.name}</span>
            <span className="text-xs font-bold text-ink/50">{counts.get(p.id)} dükkân</span>
          </Link>
        ))}
      </div>

      {!!independents.length && (
        <>
          <h2 className="mb-3 mt-10 font-display text-2xl font-bold">🏷️ Diğer dükkânlar</h2>
          <StoreGrid stores={independents} />
        </>
      )}
    </Shell>
  );
}

function Shell({ me, children }: { me: Parameters<typeof AppHeader>[0]["me"]; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-top via-sky-bottom to-cream">
      <AppHeader me={me} />
      <main className="mx-auto max-w-6xl p-4 pb-16">{children}</main>
    </div>
  );
}

function Empty() {
  return (
    <div className="game-panel p-10 text-center">
      <p className="text-5xl">🚧</p>
      <p className="mt-3 font-display text-2xl font-bold">Burada henüz dükkân yok</p>
      <Link href="/panel" className="game-btn mt-6">🏪 İlk dükkânı sen aç</Link>
    </div>
  );
}
