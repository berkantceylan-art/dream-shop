import Link from "next/link";
import { requireMe } from "@/lib/session";
import AppHeader from "@/components/AppHeader";
import UserRow from "@/components/UserRow";

export default async function SosyalPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { supabase, me } = await requireMe("/sosyal");
  const { q = "" } = await searchParams;
  const term = q.trim().replace(/^@/, "").toLowerCase();

  const [{ data: mine }, { data: blocked }, { data: cities }] = await Promise.all([
    supabase.from("follows").select("following_id").eq("follower_id", me.id),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", me.id),
    supabase.from("cities").select("id, name"),
  ]);
  const iFollow = new Set((mine ?? []).map((m) => m.following_id));
  const hidden = new Set([me.id, ...(blocked ?? []).map((b) => b.blocked_id)]);
  const cityName = new Map((cities ?? []).map((c) => [c.id, c.name]));

  const [results, sameCity, newest, followingList] = await Promise.all([
    term.length >= 2
      ? supabase.from("public_profiles").select("id, username, display_name, city_id")
          .or(`username.ilike.%${term.replace(/[%,()]/g, "")}%,display_name.ilike.%${term.replace(/[%,()]/g, "")}%`).limit(30)
      : Promise.resolve({ data: null }),
    me.city_id ? supabase.from("public_profiles").select("id, username, display_name, city_id").eq("city_id", me.city_id)
      .order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
    supabase.from("public_profiles").select("id, username, display_name, city_id").order("created_at", { ascending: false }).limit(20),
    iFollow.size ? supabase.from("public_profiles").select("id, username, display_name, city_id").in("id", [...iFollow]).limit(50) : Promise.resolve({ data: [] }),
  ]);
  type U = { id: string; username: string; display_name: string | null; city_id: number | null };
  const clean = (arr: U[] | null | undefined, excludeFollowed = false) =>
    (arr ?? []).filter((u) => !hidden.has(u.id) && (!excludeFollowed || !iFollow.has(u.id)));
  const suggestions = [...clean(sameCity.data as U[], true), ...clean(newest.data as U[], true)]
    .filter((u, i, a) => a.findIndex((x) => x.id === u.id) === i).slice(0, 12);

  const list = (title: string, users: U[], empty: string) => (
    <section className="game-panel p-5">
      <h2 className="mb-1 font-display text-xl font-bold">{title}</h2>
      {!users.length ? <p className="py-3 text-sm font-semibold text-ink/50">{empty}</p> : (
        <div className="divide-y divide-[#e6ecf7]">
          {users.map((u) => <UserRow key={u.id} user={u} meId={me.id} following={iFollow.has(u.id)} sub={cityName.get(u.city_id ?? 0)} />)}
        </div>
      )}
    </section>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#efe3ff] to-cream">
      <AppHeader me={me} />
      <main className="mx-auto max-w-5xl p-4 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-4xl font-bold">👥 Sosyal</h1>
          <div className="flex gap-2">
            <Link href={`/u/${me.username}`} className="game-btn ghost !py-2">Profilim</Link>
            <Link href="/mesajlar" className="game-btn !py-2">💬 Mesajlar</Link>
          </div>
        </div>
        <form className="my-4">
          <input name="q" defaultValue={q} placeholder="🔎 Kullanıcı ara (ör. @ayse)" className="game-input !text-lg" autoFocus={!!q} />
        </form>
        {results.data ? list(`“${q}” için sonuçlar`, clean(results.data as U[]), "Kimse bulunamadı.") : (
          <div className="grid gap-4 md:grid-cols-2">
            {list("✨ Tanıyor olabileceğin kişiler", suggestions, "Şimdilik öneri yok.")}
            {list(`Takip ettiklerin (${iFollow.size})`, clean(followingList.data as U[]), "Henüz kimseyi takip etmiyorsun.")}
          </div>
        )}
      </main>
    </div>
  );
}
