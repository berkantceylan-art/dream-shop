import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe } from "@/lib/session";
import AppHeader from "@/components/AppHeader";
import StoreGrid from "@/components/StoreGrid";

export default async function AvmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, me } = await requireMe(`/avm/${id}`);
  const { data: mall } = await supabase.from("malls").select("id, name, district, cities(name)").eq("id", id).maybeSingle();
  if (!mall) notFound();
  const { data: stores } = await supabase.from("stores").select("id, name, slug, logo_url, place_type, district")
    .eq("mall_id", id).eq("status", "approved").order("name");
  const city = (mall.cities as unknown as { name: string } | null)?.name;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#ffe3f1] to-cream">
      <AppHeader me={me} />
      <main className="mx-auto max-w-6xl p-4 pb-16">
        <Link href="/sehir" className="text-sm font-bold text-crystal">← {city}</Link>
        <h1 className="mt-1 font-display text-5xl font-bold">{mall.name}</h1>
        <p className="font-semibold text-ink/60">{mall.district ?? "Merkez"} · {stores?.length ?? 0} mağaza</p>

        <div className="mt-8">
          {stores?.length ? <StoreGrid stores={stores} /> : (
            <div className="game-panel p-10 text-center">
              <p className="text-5xl">🚧</p>
              <p className="mt-3 font-display text-2xl font-bold">Vitrinler hazırlanıyor…</p>
              <p className="mt-1 font-semibold text-ink/60">Bu AVM'de henüz mağaza açılmadı. İlk mağaza sen olmak ister misin?</p>
              <Link href="/panel" className="game-btn mt-6">🏪 Mağazanı aç</Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
