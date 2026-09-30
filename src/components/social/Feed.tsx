"use client";
import { useState, useTransition } from "react";
import type { PostView } from "@/lib/posts";
import { loadFeedAction } from "@/app/sosyal/actions";
import PostCard from "./PostCard";
import Composer from "./Composer";

export default function Feed({ initial, tab, cityId, me, items, isAdmin, showComposer = true }: {
  initial: PostView[]; tab: string; cityId: number | null; isAdmin: boolean; showComposer?: boolean;
  me: { id: string; username: string; cover: string }; items: { id: string; name: string; kind: string }[];
}) {
  const [posts, setPosts] = useState(initial);
  const [done, setDone] = useState(initial.length < 15);
  const [pending, start] = useTransition();
  const more = () => start(async () => {
    const next = await loadFeedAction(tab, posts.length, cityId);
    setPosts((p) => [...p, ...next.filter((n) => !p.some((x) => x.id === n.id))]);
    if (next.length < 15) setDone(true);
  });
  return (
    <div className="flex flex-col gap-4">
      {showComposer && <Composer me={me} items={items} onPosted={(p) => setPosts((x) => [p, ...x])} />}
      {posts.map((p) => <PostCard key={p.id} p={p} isAdmin={isAdmin} />)}
      {!posts.length && (
        <div className="game-panel !rounded-3xl p-10 text-center">
          <p className="text-5xl">{tab === "takip" ? "👋" : "🌱"}</p>
          <p className="mt-2 font-display text-xl font-bold">{tab === "takip" ? "Akışın henüz sessiz" : "Burada henüz gönderi yok"}</p>
          <p className="mt-1 text-sm font-semibold text-ink/60">{tab === "takip" ? "Birkaç kişiyi takip et ya da Keşfet'e göz at." : "İlk paylaşımı sen yap!"}</p>
        </div>
      )}
      {!done && posts.length > 0 && (
        <button onClick={more} disabled={pending} className="game-btn ghost mx-auto">{pending ? "Yükleniyor…" : "Daha fazla göster"}</button>
      )}
    </div>
  );
}
