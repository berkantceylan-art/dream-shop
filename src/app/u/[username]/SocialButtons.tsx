"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { blockAction, followAction, likeHomeAction, reportUserAction } from "./actions";

export function FollowButton({ target, initial, followsMe }: { target: string; initial: boolean; followsMe?: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} className={`game-btn !py-2 ${on ? "ghost" : ""}`}
      onClick={() => { const next = !on; setOn(next); start(async () => { const r = await followAction(target, next); if (r.error) setOn(!next); }); }}>
      {on ? "Takip ediliyor ✓" : followsMe ? "Sen de takip et" : "Takip et"}
    </button>
  );
}

export function LikeHomeButton({ owner, initial, count }: { owner: string; initial: boolean; count: number }) {
  const [on, setOn] = useState(initial);
  const [n, setN] = useState(count);
  const [, start] = useTransition();
  return (
    <button className={`game-btn !py-2 ${on ? "" : "ghost"}`} onClick={() => {
      const next = !on; setOn(next); setN(n + (next ? 1 : -1)); start(() => likeHomeAction(owner, next));
    }}>{on ? "❤️" : "🤍"} {n}</button>
  );
}

const REASONS = [["spam", "Spam / reklam"], ["taciz", "Taciz veya zorbalık"], ["uygunsuz", "Uygunsuz içerik"], ["dolandiricilik", "Dolandırıcılık"], ["sahte", "Sahte hesap"], ["diger", "Diğer"]];

export function MoreMenu({ target, username, blocked }: { target: string; username: string; blocked: boolean }) {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="relative">
      <button className="game-btn ghost !px-3 !py-2" onClick={() => setOpen(!open)}>⋯</button>
      {open && (
        <div className="game-panel absolute right-0 top-12 z-20 w-72 !bg-white p-3 text-sm">
          {done ? <p className="p-2 font-bold text-[#16865a]">{done}</p> : report ? (
            <div className="flex flex-col gap-2">
              <p className="font-bold">@{username} kullanıcısını şikâyet et</p>
              <select className="game-input !py-2" value={reason} onChange={(e) => setReason(e.target.value)}>
                {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <textarea className="game-input min-h-20 !py-2" placeholder="Detay (isteğe bağlı)" value={details} onChange={(e) => setDetails(e.target.value)} />
              <button className="game-btn !py-2" disabled={pending} onClick={() => start(async () => {
                const r = await reportUserAction(target, reason, details); setDone(r.ok ? "Şikâyetin alındı, ekibimiz inceleyecek." : r.error ?? "Hata");
              })}>Gönder</button>
            </div>
          ) : (
            <div className="flex flex-col">
              <button className="rounded-xl p-2 text-left font-bold hover:bg-[#f3f5fb]" onClick={() => setReport(true)}>🚩 Şikâyet et</button>
              <button className="rounded-xl p-2 text-left font-bold text-red-600 hover:bg-red-50" disabled={pending} onClick={() => {
                if (!blocked && !confirm(`@${username} engellensin mi? Birbirinizi takip edemez ve mesajlaşamazsınız.`)) return;
                start(async () => { await blockAction(target, !blocked); setDone(blocked ? "Engel kaldırıldı." : "Kullanıcı engellendi."); });
              }}>{blocked ? "Engeli kaldır" : "⛔ Engelle"}</button>
              <Link href="/profil?tab=ayarlar" className="rounded-xl p-2 font-bold text-ink/60 hover:bg-[#f3f5fb]">Gizlilik ayarlarım</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
