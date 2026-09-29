"use client";
import { useActionState, useState, useTransition } from "react";
import {
  createGiftAction, createTicketAction, redeemGiftAction, sendCreditsAction, setConsentAction, updateProfileAction,
  type FormState,
} from "./actions";

function Msg({ s }: { s: FormState }) {
  return (
    <>
      {s.error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{s.error}</p>}
      {s.ok && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{s.ok}</p>}
    </>
  );
}

export function SendCreditsForm({ balance }: { balance: number }) {
  const [s, action, pending] = useActionState<FormState, FormData>(sendCreditsAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input name="username" className="game-input" placeholder="@kullanıcıadı" required />
      <input name="amount" type="number" min={1} max={balance} className="game-input" placeholder={`Miktar (en fazla ${balance.toLocaleString("tr-TR")})`} required />
      <input name="note" maxLength={140} className="game-input" placeholder="Not (isteğe bağlı) — ör. İyi ki doğdun!" />
      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" name="gift" defaultChecked className="h-5 w-5 accent-[#c24dff]" /> 🎁 Hediye olarak gönder
      </label>
      <Msg s={s} />
      <button className="game-btn" disabled={pending}>{pending ? "Gönderiliyor…" : "Krediyi gönder"}</button>
    </form>
  );
}

export function CreateGiftForm({ admin = false }: { admin?: boolean }) {
  const [s, action, pending] = useActionState<FormState, FormData>(createGiftAction, {});
  const [copied, setCopied] = useState(false);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input name="amount" type="number" min={1} className="game-input" placeholder="Çek tutarı (kredi)" required />
      <input name="message" maxLength={140} className="game-input" placeholder="Mesaj (isteğe bağlı)" />
      {admin && (
        <div className="grid grid-cols-2 gap-3">
          <input name="max_uses" type="number" min={1} defaultValue={100} className="game-input" placeholder="Kaç kişi kullanabilir" />
          <input name="days" type="number" min={1} defaultValue={30} className="game-input" placeholder="Geçerlilik (gün)" />
        </div>
      )}
      <Msg s={{ error: s.error }} />
      {s.code && (
        <div className="animate-pop rounded-2xl border-2 border-dashed border-crystal bg-crystal/5 p-4 text-center">
          <p className="text-sm font-bold text-ink/60">{s.ok}</p>
          <p className="my-2 select-all font-display text-3xl font-bold tracking-wider text-crystal">{s.code}</p>
          <button type="button" className="chip" onClick={() => { navigator.clipboard.writeText(s.code!); setCopied(true); }}>
            {copied ? "✓ Kopyalandı" : "📋 Kopyala"}
          </button>
        </div>
      )}
      <button className="game-btn" disabled={pending}>{pending ? "Hazırlanıyor…" : admin ? "Kampanya kodu oluştur" : "Hediye çeki oluştur"}</button>
    </form>
  );
}

export function RedeemGiftForm() {
  const [s, action, pending] = useActionState<FormState, FormData>(redeemGiftAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input name="code" className="game-input font-display text-xl uppercase tracking-wider" placeholder="DREAM-XXXX-XXXX" required />
      <Msg s={s} />
      <button className="game-btn mint" disabled={pending}>{pending ? "Kontrol ediliyor…" : "Kodu kullan"}</button>
    </form>
  );
}

const CATS = [
  ["hata", "🐞 Hata bildirimi"], ["oneri", "💡 Öneri"], ["odeme", "💳 Ödeme / kredi"],
  ["hesap", "👤 Hesap"], ["hesap_silme", "🗑️ Hesabımı sil (KVKK)"], ["diger", "💬 Diğer"],
] as const;

export function TicketForm({ defaultCategory = "hata" }: { defaultCategory?: string }) {
  const [s, action, pending] = useActionState<FormState, FormData>(createTicketAction, {});
  const [cat, setCat] = useState(defaultCategory);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="category" value={cat} />
      <div className="flex flex-wrap gap-2">
        {CATS.map(([v, l]) => <button type="button" key={v} className="chip" data-on={cat === v} onClick={() => setCat(v)}>{l}</button>)}
      </div>
      <input name="subject" className="game-input" placeholder="Konu" maxLength={120} required
        defaultValue={cat === "hesap_silme" ? "Hesabımın ve verilerimin silinmesini talep ediyorum" : ""} key={cat} />
      <textarea name="message" className="game-input min-h-32" required
        placeholder={cat === "hata" ? "Ne yapıyordun, ne oldu, ne olmasını bekliyordun? Hangi sayfadaydın?" : "Mesajın…"} />
      {cat === "hata" && <input name="page_url" className="game-input" placeholder="Hatanın olduğu sayfa (ör. /sehir)" />}
      <Msg s={s} />
      <button className="game-btn" disabled={pending}>{pending ? "Gönderiliyor…" : "Gönder"}</button>
    </form>
  );
}

type City = { id: number; name: string };
export function ProfileForm({ cities, districts, initial }: {
  cities: City[]; districts: { city_id: number; name: string }[];
  initial: { display_name: string | null; city_id: number | null; district: string | null;
    bio?: string | null; dm_policy?: string; home_visibility?: string };
}) {
  const [s, action, pending] = useActionState<FormState, FormData>(updateProfileAction, {});
  const [city, setCity] = useState(initial.city_id ?? 34);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input name="display_name" className="game-input" placeholder="Görünen ad" defaultValue={initial.display_name ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2">
        <select name="city_id" className="game-input" value={city} onChange={(e) => setCity(Number(e.target.value))}>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="district" className="game-input" defaultValue={initial.city_id === city ? initial.district ?? "" : ""} key={city}>
          <option value="">İlçe seç</option>
          {districts.filter((d) => d.city_id === city).map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
        </select>
      </div>
      <textarea name="bio" maxLength={300} defaultValue={initial.bio ?? ""} className="game-input min-h-20" placeholder="Biyografi — kendini birkaç kelimeyle anlat" />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold">💬 Bana kim mesaj atabilir?
          <select name="dm_policy" defaultValue={initial.dm_policy ?? "everyone"} className="game-input mt-1">
            <option value="everyone">Herkes</option><option value="followers">Takip ettiklerim</option><option value="none">Kimse</option>
          </select>
        </label>
        <label className="text-sm font-bold">🏡 Evimi kim ziyaret edebilir?
          <select name="home_visibility" defaultValue={initial.home_visibility ?? "everyone"} className="game-input mt-1">
            <option value="everyone">Herkes</option><option value="followers">Takip ettiklerim</option><option value="none">Kimse</option>
          </select>
        </label>
      </div>
      <Msg s={s} />
      <button className="game-btn" disabled={pending}>{pending ? "Kaydediliyor…" : "Kaydet"}</button>
    </form>
  );
}

export function ConsentToggle({ type, label, desc, on }: { type: "aggregate_analytics" | "marketing"; label: string; desc: string; on: boolean }) {
  const [value, setValue] = useState(on);
  const [pending, start] = useTransition();
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 ${value ? "border-crystal bg-crystal/5" : "border-[#dbe4f5] bg-white"}`}>
      <input type="checkbox" checked={value} disabled={pending} className="mt-1 h-5 w-5 accent-[#c24dff]"
        onChange={(e) => { const v = e.target.checked; setValue(v); start(() => setConsentAction(type, v)); }} />
      <span><b>{label}</b><br /><span className="text-sm text-ink/70">{desc}</span></span>
    </label>
  );
}
