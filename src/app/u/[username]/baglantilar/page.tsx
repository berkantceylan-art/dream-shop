import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe } from "@/lib/session";
import { getPublicProfile } from "@/lib/social";
import AppHeader from "@/components/AppHeader";
import UserRow from "@/components/UserRow";

export default async function Baglantilar({ params, searchParams }: { params: Promise<{ username: string }>; searchParams: Promise<{ liste?: string }> }) {
  const { username } = await params;
  const { liste = "takipci" } = await searchParams;
  const { supabase, me } = await requireMe(`/u/${username}`);
  const p = await getPublicProfile(supabase, decodeURIComponent(username));
  if (!p) notFound();
  const followers = liste !== "takip";
  const { data: rows } = await supabase.from("follows").select("follower_id, following_id")
    .eq(followers ? "following_id" : "follower_id", p.id).order("created_at", { ascending: false }).limit(300);
  const ids = (rows ?? []).map((r) => (followers ? r.follower_id : r.following_id));
  const [{ data: people }, { data: mine }] = await Promise.all([
    ids.length ? supabase.from("public_profiles").select("id, username, display_name, city_id").in("id", ids) : Promise.resolve({ data: [] }),
    supabase.from("follows").select("following_id").eq("follower_id", me.id),
  ]);
  const iFollow = new Set((mine ?? []).map((m) => m.following_id));
  const byId = new Map((people ?? []).map((x) => [x.id, x]));
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#efe3ff] to-cream">
      <AppHeader me={me} />
      <main className="mx-auto max-w-2xl p-4 pb-16">
        <Link href={`/u/${p.username}`} className="text-sm font-bold text-crystal">← @{p.username}</Link>
        <div className="my-3 flex gap-2">
          <Link href={`?liste=takipci`} className="chip" data-on={followers}>Takipçiler</Link>
          <Link href={`?liste=takip`} className="chip" data-on={!followers}>Takip edilenler</Link>
        </div>
        <div className="game-panel divide-y divide-[#e6ecf7] p-4">
          {!ids.length && <p className="p-4 text-center font-semibold text-ink/50">Henüz kimse yok.</p>}
          {ids.map((id) => byId.get(id)).filter(Boolean).map((u) => (
            <UserRow key={u!.id} user={u!} meId={me.id} following={iFollow.has(u!.id)} removable={followers && p.id === me.id} />
          ))}
        </div>
      </main>
    </div>
  );
}
