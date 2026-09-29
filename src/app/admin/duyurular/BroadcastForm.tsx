"use client";
import { useActionState } from "react";
import { broadcastAction } from "../actions";

export default function BroadcastForm({ cities }: { cities: { id: number; name: string }[] }) {
  const [s, action, pending] = useActionState(broadcastAction, {} as { error?: string; ok?: string });
  return (
    <form action={action} className="flex flex-col gap-3" onSubmit={(e) => { if (!confirm("Duyuru gönderilsin mi?")) e.preventDefault(); }}>
      <input name="title" className="game-input" placeholder="Başlık (ör. Yeni sezon başladı!)" required maxLength={120} />
      <textarea name="body" className="game-input min-h-28" placeholder="Duyuru metni" required maxLength={1000} />
      <select name="city_id" className="game-input"><option value="">🇹🇷 Tüm kullanıcılar</option>{cities.map((c) => <option key={c.id} value={c.id}>📍 Yalnızca {c.name}</option>)}</select>
      {s.error && <p className="rounded-xl bg-red-50 p-2 text-sm font-semibold text-red-600">{s.error}</p>}
      {s.ok && <p className="rounded-xl bg-emerald-50 p-2 text-sm font-semibold text-emerald-700">{s.ok}</p>}
      <button className="game-btn" disabled={pending}>{pending ? "Gönderiliyor…" : "📣 Duyuruyu gönder"}</button>
    </form>
  );
}
