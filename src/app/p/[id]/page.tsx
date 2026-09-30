import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe } from "@/lib/session";
import { hydratePosts, POST_COLS, type PostRow } from "@/lib/posts";
import AppHeader from "@/components/AppHeader";
import PostCard from "@/components/social/PostCard";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, me } = await requireMe(`/p/${id}`);
  const { data } = await supabase.from("posts").select(POST_COLS).eq("id", Number(id)).is("deleted_at", null).maybeSingle();
  if (!data) notFound();
  const [post] = await hydratePosts(supabase, me.id, [data as PostRow]);
  if (!post) notFound();
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#efe3ff] to-cream">
      <AppHeader me={me} />
      <main className="mx-auto max-w-2xl p-4 pb-16">
        <Link href="/sosyal" className="mb-3 inline-block text-sm font-bold text-crystal">← Akış</Link>
        <PostCard p={post} isAdmin={me.role === "admin"} openComments />
      </main>
    </div>
  );
}
