"use client";
import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PostView } from "@/lib/posts";
import { createPostAction } from "@/app/sosyal/actions";
import Avatar from "./Avatar";

type Item = { id: string; name: string; kind: string };

export default function Composer({ me, items, onPosted }: {
  me: { id: string; username: string; cover: string }; items: Item[]; onPosted: (p: PostView) => void;
}) {
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [item, setItem] = useState("");
  const [vis, setVis] = useState<"public" | "followers">("public");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const file = useRef<HTMLInputElement>(null);

  async function upload(files: FileList) {
    setErr(""); setUploading(true);
    const supabase = createClient();
    const urls: string[] = [];
    for (const f of Array.from(files).slice(0, 4 - images.length)) {
      if (f.size > 5 * 1024 * 1024) { setErr("Fotoğraf en fazla 5 MB olabilir."); continue; }
      const path = `${me.id}/${crypto.randomUUID()}.${f.name.split(".").pop()?.toLowerCase() || "jpg"}`;
      const { error } = await supabase.storage.from("post-images").upload(path, f, { contentType: f.type });
      if (error) { setErr("Yükleme başarısız: " + error.message); continue; }
      urls.push(supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl);
    }
    setImages((x) => [...x, ...urls]); setUploading(false);
  }

  const submit = () => start(async () => {
    setErr("");
    const r = await createPostAction({ body, images, itemId: item || null, visibility: vis });
    if (r.error) return setErr(r.error);
    setBody(""); setImages([]); setItem("");
    if (r.post) onPosted(r.post);
  });

  const left = 2200 - body.length;
  return (
    <div className="game-panel !rounded-3xl p-4">
      <div className="flex gap-3">
        <Avatar username={me.username} cover={me.cover} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2200} rows={body.length > 80 ? 4 : 2}
          placeholder="Neler oluyor? #etiket ekle, @arkadaşını an…" className="flex-1 resize-none bg-transparent pt-2 text-[15px] outline-none placeholder:text-ink/40" />
      </div>
      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2 pl-14">
          {images.map((src, i) => (
            <div key={src} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="aspect-square w-full rounded-xl object-cover" />
              <button onClick={() => setImages((x) => x.filter((_, j) => j !== i))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-xs text-white">✕</button>
            </div>
          ))}
        </div>
      )}
      {item && <p className="mt-2 pl-14 text-sm font-bold text-crystal">📎 {items.find((i) => i.id === item)?.name} iliştirildi <button className="ml-1 text-ink/40" onClick={() => setItem("")}>✕</button></p>}
      {err && <p className="mt-2 rounded-xl bg-red-50 p-2 text-sm font-semibold text-red-600">{err}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t-2 border-[#eef1f6] pt-3 pl-12">
        <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} />
        <button title="Fotoğraf" disabled={images.length >= 4 || uploading} onClick={() => file.current?.click()} className="rounded-full px-2.5 py-1.5 text-lg hover:bg-crystal/10">{uploading ? "⏳" : "🖼️"}</button>
        <select value={item} onChange={(e) => setItem(e.target.value)} className="max-w-44 rounded-full border-2 border-[#e6ecf7] bg-white px-2 py-1 text-xs font-bold">
          <option value="">📎 Eşya iliştir</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <select value={vis} onChange={(e) => setVis(e.target.value as "public" | "followers")} className="rounded-full border-2 border-[#e6ecf7] bg-white px-2 py-1 text-xs font-bold">
          <option value="public">🌍 Herkes</option><option value="followers">👥 Takipçiler</option>
        </select>
        <span className="flex-1" />
        {body.length > 1800 && <span className={`text-xs font-bold ${left < 50 ? "text-red-500" : "text-ink/40"}`}>{left}</span>}
        <button onClick={submit} disabled={pending || uploading || (!body.trim() && !images.length && !item)} className="game-btn !rounded-full !px-5 !py-2 !text-base">
          {pending ? "…" : "Paylaş"}
        </button>
      </div>
    </div>
  );
}
