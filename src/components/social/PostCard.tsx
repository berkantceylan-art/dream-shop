"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ago, type PostView } from "@/lib/posts";
import { KIND_META } from "@/lib/catalog";
import { ProductThumb } from "@/components/ProductCard";
import Credits from "@/components/Credits";
import RichText from "./RichText";
import Avatar from "./Avatar";
import {
  addCommentAction, deleteCommentAction, deletePostAction, getCommentsAction, likeAction, pinPostAction, reportPostAction, saveAction,
  type CommentView,
} from "@/app/sosyal/actions";

const BADGE: Record<string, string> = { admin: "🛠️", store_owner: "🏪" };

export default function PostCard({ p, isAdmin = false, openComments = false }: { p: PostView; isAdmin?: boolean; openComments?: boolean }) {
  const [liked, setLiked] = useState(p.liked);
  const [likes, setLikes] = useState(p.like_count);
  const [saved, setSaved] = useState(p.saved);
  const [pinned, setPinned] = useState(p.pinned);
  const [count, setCount] = useState(p.comment_count);
  const [comments, setComments] = useState<CommentView[] | null>(null);
  const [showC, setShowC] = useState(false);
  const [text, setText] = useState("");
  const [menu, setMenu] = useState(false);
  const [gone, setGone] = useState(false);
  const [pop, setPop] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, start] = useTransition();

  const toggleLike = () => {
    const n = !liked; setLiked(n); setLikes((x) => x + (n ? 1 : -1));
    if (n) { setPop(true); setTimeout(() => setPop(false), 500); }
    start(() => likeAction(p.id, n));
  };
  const openC = async () => {
    setShowC(!showC);
    if (!comments) setComments(await getCommentsAction(p.id));
  };
  useEffect(() => {
    if (openComments) { setShowC(true); getCommentsAction(p.id).then(setComments); }
  }, [openComments, p.id]);
  if (gone) return null;

  return (
    <article className="game-panel !rounded-3xl p-4">
      <header className="flex items-center gap-3">
        <Avatar username={p.author.username} cover={p.author.cover_color} />
        <div className="min-w-0 flex-1 leading-tight">
          <Link href={`/u/${p.author.username}`} className="font-bold hover:underline">{p.author.display_name || p.author.username}</Link>
          {BADGE[p.author.role] && <span className="ml-1 text-sm" title={p.author.role}>{BADGE[p.author.role]}</span>}
          <p className="truncate text-xs font-semibold text-ink/50">
            @{p.author.username} · <Link href={`/p/${p.id}`} className="hover:underline">{ago(p.created_at)}</Link>
            {p.city && ` · 📍 ${p.city}`}{p.visibility === "followers" && " · 👥"}{pinned && " · 📌 Sabitlendi"}
          </p>
        </div>
        <div className="relative">
          <button onClick={() => setMenu(!menu)} className="rounded-full px-2 text-xl font-bold text-ink/40 hover:bg-white">⋯</button>
          {menu && (
            <div className="game-panel absolute right-0 top-9 z-20 w-52 !bg-white p-1.5 text-sm font-bold" onMouseLeave={() => setMenu(false)}>
              <button className="w-full rounded-xl p-2 text-left hover:bg-[#f3f5fb]" onClick={() => { navigator.clipboard.writeText(`${location.origin}/p/${p.id}`); setMenu(false); }}>🔗 Bağlantıyı kopyala</button>
              {p.mine && (
                <button className="w-full rounded-xl p-2 text-left hover:bg-[#f3f5fb]" onClick={() => { const n = !pinned; setPinned(n); start(() => pinPostAction(n ? p.id : null)); setMenu(false); }}>
                  📌 {pinned ? "Sabitlemeyi kaldır" : "Profilimde sabitle"}</button>
              )}
              {(p.mine || isAdmin) && (
                <button className="w-full rounded-xl p-2 text-left text-red-600 hover:bg-red-50" onClick={() => { if (confirm("Gönderi silinsin mi?")) { setGone(true); start(() => deletePostAction(p.id)); } }}>🗑️ Sil</button>
              )}
              {!p.mine && (
                <button className="w-full rounded-xl p-2 text-left hover:bg-[#f3f5fb]" onClick={() => { start(() => reportPostAction(p.author.id, p.id, "uygunsuz")); setMenu(false); alert("Bildirimin alındı, teşekkürler."); }}>🚩 Şikâyet et</button>
              )}
            </div>
          )}
        </div>
      </header>

      {p.kind === "activity" && <p className="mt-2 inline-block rounded-full bg-gold/25 px-2.5 py-0.5 text-xs font-bold">✨ Yeni edinim</p>}
      {p.body && <RichText text={p.body} className="mt-2 text-[15px]" />}

      {p.images.length > 0 && (
        <div className={`mt-3 grid gap-1 overflow-hidden rounded-2xl ${p.images.length > 1 ? "grid-cols-2" : ""}`} onDoubleClick={() => !liked && toggleLike()}>
          {p.images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className={`w-full object-cover ${p.images.length === 1 ? "max-h-[520px]" : "aspect-square"} ${p.images.length === 3 && i === 0 ? "row-span-2 h-full" : ""}`} />
          ))}
        </div>
      )}

      {p.product && (
        <Link href="/sehir" className="mt-3 flex items-center gap-3 rounded-2xl border-2 border-[#e6ecf7] bg-white p-2.5 transition hover:border-crystal">
          <div className="w-16 shrink-0"><ProductThumb p={p.product} className="!rounded-xl !text-3xl" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-ink/50">{KIND_META[p.product.kind].icon} {KIND_META[p.product.kind].label}{p.product.brand ? ` · ${p.product.brand}` : ""}</p>
            <p className="truncate font-display text-lg font-bold">{p.product.name}</p>
          </div>
          <Credits amount={p.product.credit_price} />
        </Link>
      )}

      <footer className="mt-3 flex items-center gap-1 text-sm font-bold text-ink/60">
        <button onClick={toggleLike} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-[#ffe3f1] ${liked ? "text-[#e64980]" : ""}`}>
          <span className={`text-lg transition ${pop ? "scale-150" : ""}`}>{liked ? "❤️" : "🤍"}</span>{likes > 0 && likes}
        </button>
        <button onClick={openC} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-[#e7f5ff]"><span className="text-lg">💬</span>{count > 0 && count}</button>
        <button onClick={() => { navigator.clipboard.writeText(`${location.origin}/p/${p.id}`); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-[#ebfbee]"><span className="text-lg">↗️</span>{copied ? "Kopyalandı" : ""}</button>
        <span className="flex-1" />
        <button onClick={() => { const n = !saved; setSaved(n); start(() => saveAction(p.id, n)); }} title="Kaydet"
          className="rounded-full px-3 py-1.5 text-lg hover:bg-[#fff9db]"><span className={saved ? "" : "opacity-35 grayscale"}>🔖</span></button>
      </footer>

      {showC && (
        <div className="mt-2 border-t-2 border-[#eef1f6] pt-3">
          {comments === null ? <p className="text-sm text-ink/40">Yükleniyor…</p> : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {!comments.length && <p className="text-sm font-semibold text-ink/40">İlk yorumu sen yaz 💬</p>}
              {comments.map((c) => (
                <div key={c.id} className="group flex gap-2">
                  <Avatar username={c.author.username} size={30} />
                  <div className="min-w-0 flex-1 rounded-2xl bg-[#f3f5fb] px-3 py-1.5 text-sm">
                    <Link href={`/u/${c.author.username}`} className="font-bold">{c.author.display_name || c.author.username}</Link>
                    <span className="ml-2 text-xs text-ink/40">{ago(c.created_at)}</span>
                    <RichText text={c.body} />
                  </div>
                  {(c.mine || p.mine || isAdmin) && (
                    <button className="hidden text-xs text-ink/40 group-hover:block" onClick={() => {
                      setComments((cs) => cs!.filter((x) => x.id !== c.id)); setCount((n) => n - 1); start(() => deleteCommentAction(c.id)); }}>Sil</button>
                  )}
                </div>
              ))}
            </div>
          )}
          <form className="mt-2 flex gap-2" onSubmit={(e) => {
            e.preventDefault(); const t = text.trim(); if (!t) return; setText("");
            start(async () => { const r = await addCommentAction(p.id, t); if (!r.error) { setCount((n) => n + 1); setComments(await getCommentsAction(p.id)); } });
          }}>
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Yorum yaz…" className="game-input !rounded-full !py-2" />
            <button className="game-btn !rounded-full !px-4 !py-2 !text-sm" disabled={!text.trim()}>Gönder</button>
          </form>
        </div>
      )}
    </article>
  );
}
