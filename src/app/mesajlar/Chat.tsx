"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { markReadAction, sendMessageAction } from "./actions";

type Msg = { id: number; sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null };

export default function Chat({ meId, other, initial, canSend, reason }: {
  meId: string; other: { id: string; username: string; display_name: string | null }; initial: Msg[]; canSend: boolean; reason?: string;
}) {
  const [msgs, setMsgs] = useState(initial);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  const lastId = useRef(0);
  useEffect(() => { lastId.current = Math.max(0, ...msgs.map((m) => m.id)); }, [msgs]);

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);
  useEffect(() => { markReadAction(other.id); }, [other.id]);

  // Anlık gelen mesajlar (Supabase Realtime); çalışmazsa 5 sn'de bir yenile
  useEffect(() => {
    const supabase = createClient();
    const add = (m: Msg) => setMsgs((all) => (all.some((x) => x.id === m.id) ? all : [...all, m]));
    const channel = supabase.channel(`dm-${meId}-${other.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${meId}` }, (payload) => {
        const m = payload.new as Msg;
        if (m.sender_id === other.id) { add(m); markReadAction(other.id); }
      }).subscribe();
    const poll = setInterval(async () => {
      const last = lastId.current;
      const { data } = await supabase.from("messages").select("*")
        .or(`and(sender_id.eq.${other.id},recipient_id.eq.${meId}),and(sender_id.eq.${meId},recipient_id.eq.${other.id})`)
        .gt("id", last).order("id");
      (data as Msg[] | null)?.forEach(add);
    }, 5000);
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [meId, other.id]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim(); if (!body) return;
    setText(""); setErr("");
    const temp: Msg = { id: -Date.now(), sender_id: meId, recipient_id: other.id, body, created_at: new Date().toISOString(), read_at: null };
    setMsgs((m) => [...m, temp]);
    start(async () => {
      const r = await sendMessageAction(other.id, body);
      if (r.error) { setErr(r.error); setMsgs((m) => m.filter((x) => x.id !== temp.id)); setText(body); }
      else setMsgs((m) => m.map((x) => (x.id === temp.id ? { ...x, id: r.id! } : x)));
    });
  }

  let lastDay = "";
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-1.5 overflow-y-auto p-4">
        {!msgs.length && <p className="py-10 text-center font-semibold text-ink/50">@{other.username} ile sohbete başla 👋</p>}
        {msgs.map((m) => {
          const mine = m.sender_id === meId;
          const day = new Date(m.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
          const showDay = day !== lastDay; lastDay = day;
          return (
            <div key={m.id}>
              {showDay && <p className="my-3 text-center text-xs font-bold text-ink/40">{day}</p>}
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] whitespace-pre-wrap break-words rounded-3xl px-4 py-2 ${mine ? "rounded-br-md bg-crystal text-white" : "rounded-bl-md bg-white"} ${m.id < 0 ? "opacity-60" : ""}`}>
                  {m.body}
                  <span className={`ml-2 text-[10px] ${mine ? "text-white/70" : "text-ink/40"}`}>
                    {new Date(m.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}{mine && m.read_at ? " ✓✓" : ""}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      {err && <p className="mx-4 rounded-xl bg-red-50 p-2 text-sm font-semibold text-red-600">{err}</p>}
      {canSend ? (
        <form onSubmit={send} className="flex gap-2 border-t-2 border-white p-3">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Mesaj yaz…" className="game-input" disabled={pending && !text} />
          <button className="game-btn !px-5" disabled={!text.trim()}>Gönder</button>
        </form>
      ) : <p className="border-t-2 border-white p-4 text-center text-sm font-bold text-ink/50">{reason}</p>}
    </div>
  );
}
