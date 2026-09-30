import Link from "next/link";
import { requireMe } from "@/lib/session";
import { hydratePosts, POST_COLS, type PostRow } from "@/lib/posts";
import AppHeader from "@/components/AppHeader";
import PostCard from "@/components/social/PostCard";

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag: raw } = await params;
  const tag = decodeURIComponent(raw).toLocaleLowerCase("tr");
  const { supabase, me } = await requireMe(`/etiket/${raw}`);
  const { data: tagged, count } = await supabase.from("post_tags").select("post_id", { count: "exact" }).eq("tag", tag)
    .order("created_at", { ascending: false }).limit(60);
  const ids = (tagged ?? []).map((t) => t.post_id);
  const { data } = ids.length
    ? await supabase.from("posts").select(POST_COLS).in("id", ids).is("deleted_at", null).order("created_at", { ascending: false })
    : { data: [] };
  const posts = await hydratePosts(supabase, me.id, (data ?? []) as PostRow[]);
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#efe3ff] to-cream">
      <AppHeader me={me} />
      <main className="mx-auto max-w-2xl p-4 pb-16">
        <Link href="/sosyal?akis=kesfet" className="text-sm font-bold text-crystal">← Keşfet</Link>
        <div className="game-panel my-3 !rounded-3xl bg-gradient-to-br from-crystal-light/30 to-crystal/20 p-6">
          <h1 className="font-display text-4xl font-bold">#{tag}</h1>
          <p className="font-semibold text-ink/60">{(count ?? 0).toLocaleString("tr-TR")} gönderi</p>
        </div>
        <div className="flex flex-col gap-4">
          {posts.map((p) => <PostCard key={p.id} p={p} isAdmin={me.role === "admin"} />)}
          {!posts.length && <p className="game-panel p-8 text-center font-semibold text-ink/50">Bu etiketle henüz gönderi yok.</p>}
        </div>
      </main>
    </div>
  );
}
