"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ago, COVERS } from "@/lib/posts";
import { createStoryAction, deleteStoryAction, viewStoryAction } from "@/app/sosyal/actions";
import Avatar from "./Avatar";

export type Story = { id: number; text: string | null; image_url: string | null; bg: string; created_at: string; viewed: boolean };
export type StoryGroup = { author: { id: string; username: string; display_name: string | null; cover_color: string }; stories: Story[] };

const BGS = Object.keys(COVERS);

export default function StoriesBar({ groups, meId, meUsername, meCover }: { groups: StoryGroup[]; meId: string; meUsername: string; meCover: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const [create, setCreate] = useState(false);
  const mine = groups.find((g) => g.author.id === meId);
  const others = groups.filter((g) => g.author.id !== meId).sort((a, b) => Number(a.stories.every((s) => s.viewed)) - Number(b.stories.every((s) => s.viewed)));
  const ordered = [...(mine ? [mine] : []), ...others];

  return (
    <>
      <div className="game-panel flex gap-4 overflow-x-auto !rounded-3xl p-4">
        <button onClick={() => (mine ? setOpen(0) : setCreate(true))} className="flex w-16 shrink-0 flex-col items-center gap-1">
          <span className="relative">
            <Avatar username={meUsername} cover={meCover} size={60} link={false} ring={!!mine} />
            <span onClick={(e) => { e.stopPropagation(); setCreate(true); }} className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-crystal text-sm font-bold text-white">+</span>
          </span>
          <span className="w-full truncate text-center text-xs font-bold">Hikâyen</span>
        </button>
        {others.map((g) => {
          const idx = ordered.indexOf(g);
          const seen = g.stories.every((s) => s.viewed);
          return (
            <button key={g.author.id} onClick={() => setOpen(idx)} className="flex w-16 shrink-0 flex-col items-center gap-1">
              <span className={`rounded-full p-[3px] ${seen ? "bg-[#dbe4f5]" : "bg-gradient-to-tr from-gold via-[#ff6b9d] to-crystal"}`}>
                <span className="block rounded-full bg-white p-[2px]"><Avatar username={g.author.username} cover={g.author.cover_color} size={54} link={false} /></span>
              </span>
              <span className="w-full truncate text-center text-xs font-bold">{g.author.username}</span>
            </button>
          );
        })}
        {!others.length && <p className="self-center text-sm font-semibold text-ink/40">Takip ettiklerinin hikâyeleri burada görünür.</p>}
      </div>
      {open !== null && ordered[open] && <Viewer groups={ordered} start={open} meId={meId} onClose={() => setOpen(null)} />}
      {create && <CreateStory meId={meId} onClose={() => setCreate(false)} />}
    </>
  );
}

function Viewer({ groups, start, meId, onClose }: { groups: StoryGroup[]; start: number; meId: string; onClose: () => void }) {
  const [g, setG] = useState(start);
  const [i, setI] = useState(0);
  const [t, setT] = useState(0);
  const [paused, setPaused] = useState(false);
  const [, startT] = useTransition();
  const group = groups[g]; const s = group?.stories[i];
  const next = useCallback(() => {
    setT(0);
    if (i + 1 < group.stories.length) setI(i + 1);
    else if (g + 1 < groups.length) { setG(g + 1); setI(0); } else onClose();
  }, [i, g, group, groups.length, onClose]);
  const prev = () => { setT(0); if (i > 0) setI(i - 1); else if (g > 0) { setG(g - 1); setI(0); } };
  const tick = useRef(next); tick.current = next;

  useEffect(() => { if (s && group.author.id !== meId && !s.viewed) { s.viewed = true; startT(() => viewStoryAction(s.id)); } }, [s, group, meId]);
  useEffect(() => {
    if (paused) return;
    const h = setInterval(() => setT((x) => { if (x >= 100) { tick.current(); return 0; } return x + 2; }), 100);
    return () => clearInterval(h);
  }, [paused, g, i]);
  if (!s) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4" onClick={onClose}>
      <div className={`relative aspect-[9/16] h-[86vh] max-w-full overflow-hidden rounded-3xl bg-gradient-to-br ${COVERS[s.bg] ?? COVERS.crystal}`}
        onClick={(e) => e.stopPropagation()} onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {s.image_url && <img src={s.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-x-3 top-3 flex gap-1">
          {group.stories.map((_, k) => (
            <div key={k} className="h-1 flex-1 overflow-hidden rounded-full bg-white/40">
              <div className="h-full bg-white" style={{ width: k < i ? "100%" : k === i ? `${t}%` : "0%" }} />
            </div>
          ))}
        </div>
        <div className="absolute inset-x-3 top-6 flex items-center gap-2 text-white">
          <Link href={`/u/${group.author.username}`} className="flex items-center gap-2 font-bold drop-shadow">
            <Avatar username={group.author.username} cover={group.author.cover_color} size={32} link={false} />{group.author.username}
          </Link>
          <span className="text-sm opacity-80">{ago(s.created_at)}</span>
          <span className="flex-1" />
          {group.author.id === meId && <button className="text-sm font-bold" onClick={() => { startT(() => deleteStoryAction(s.id)); onClose(); }}>🗑️</button>}
          <button onClick={onClose} className="text-2xl">✕</button>
        </div>
        {s.text && (
          <div className={`absolute inset-x-6 ${s.image_url ? "bottom-16" : "top-1/2 -translate-y-1/2"} text-center font-display text-3xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,.4)]`}>
            {s.text}
          </div>
        )}
        <button className="absolute inset-y-0 left-0 w-1/3" onClick={prev} aria-label="Önceki" />
        <button className="absolute inset-y-0 right-0 w-1/3" onClick={next} aria-label="Sonraki" />
      </div>
    </div>
  );
}

function CreateStory({ meId, onClose }: { meId: string; onClose: () => void }) {
  const [text, setText] = useState("");
  const [bg, setBg] = useState("crystal");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  async function upload(f: File) {
    setBusy(true);
    const supabase = createClient();
    const path = `${meId}/story-${crypto.randomUUID()}.${f.name.split(".").pop() || "jpg"}`;
    const { error } = await supabase.storage.from("post-images").upload(path, f, { contentType: f.type });
    setBusy(false);
    if (error) return setErr(error.message);
    setImage(supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl);
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div className="flex w-full max-w-sm flex-col gap-3" onClick={(e) => e.stopPropagation()}>
        <div className={`relative grid aspect-[9/16] max-h-[60vh] place-items-center overflow-hidden rounded-3xl bg-gradient-to-br ${COVERS[bg]}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder="Bir şey yaz…"
            className="relative z-10 w-5/6 resize-none bg-transparent text-center font-display text-2xl font-bold text-white placeholder:text-white/60 outline-none drop-shadow" rows={3} />
        </div>
        <div className="flex items-center gap-2">
          {BGS.map((b) => <button key={b} onClick={() => setBg(b)} className={`h-8 w-8 rounded-full bg-gradient-to-br ${COVERS[b]} ${bg === b ? "ring-4 ring-white" : ""}`} />)}
          <label className="ml-auto cursor-pointer rounded-full bg-white px-3 py-1.5 text-sm font-bold">{busy ? "⏳" : "🖼️ Fotoğraf"}
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></label>
        </div>
        {err && <p className="rounded-xl bg-red-50 p-2 text-sm text-red-600">{err}</p>}
        <button className="game-btn" disabled={pending || busy || (!text.trim() && !image)} onClick={() => start(async () => {
          const r = await createStoryAction({ text, image, bg }); if (r.error) setErr(r.error); else { onClose(); location.reload(); }
        })}>{pending ? "…" : "Hikâyeni paylaş (24 saat)"}</button>
      </div>
    </div>
  );
}
