"use client";
import { useActionState, useState, useTransition } from "react";
import { adjustCreditsAction, adminMessageAction, banAction, removeItemAction, updateUserAction, type R } from "./actions";

function Msg({ s }: { s: R }) {
  return <>{s.error && <p className="rounded-xl bg-red-50 p-2 text-sm font-semibold text-red-600">{s.error}</p>}
    {s.ok && <p className="rounded-xl bg-emerald-50 p-2 text-sm font-semibold text-emerald-700">{s.ok}</p>}</>;
}

export function CreditForm({ userId }: { userId: string }) {
  const [s, action, pending] = useActionState<R, FormData>(adjustCreditsAction.bind(null, userId), {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <select name="sign" className="game-input !w-24 !py-2"><option value="+">+ Ekle</option><option value="-">− Düş</option></select>
        <input name="amount" type="number" min={1} className="game-input !py-2" placeholder="Miktar" required />
      </div>
      <input name="note" className="game-input !py-2" placeholder="Açıklama (kullanıcı görür)" />
      <Msg s={s} />
      <button className="game-btn !py-2" disabled={pending}>{pending ? "…" : "Uygula"}</button>
    </form>
  );
}

type Profile = { username: string; display_name: string | null; bio: string | null; city_id: number | null; district: string | null; phone: string | null; role: string };
export function EditUserForm({ userId, p, cities }: { userId: string; p: Profile; cities: { id: number; name: string }[] }) {
  const [s, action, pending] = useActionState<R, FormData>(updateUserAction.bind(null, userId), {});
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-2">
      <label className="text-xs font-bold text-ink/60">Kullanıcı adı<input name="username" defaultValue={p.username} className="game-input mt-1 !py-2" /></label>
      <label className="text-xs font-bold text-ink/60">Görünen ad<input name="display_name" defaultValue={p.display_name ?? ""} className="game-input mt-1 !py-2" /></label>
      <label className="text-xs font-bold text-ink/60">Şehir
        <select name="city_id" defaultValue={p.city_id ?? ""} className="game-input mt-1 !py-2">
          <option value="">—</option>{cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="text-xs font-bold text-ink/60">İlçe<input name="district" defaultValue={p.district ?? ""} className="game-input mt-1 !py-2" /></label>
      <label className="text-xs font-bold text-ink/60">Telefon<input name="phone" defaultValue={p.phone ?? ""} className="game-input mt-1 !py-2" /></label>
      <label className="text-xs font-bold text-ink/60">Rol
        <select name="role" defaultValue={p.role} className="game-input mt-1 !py-2">
          <option value="user">Kullanıcı</option><option value="store_owner">Mağaza sahibi</option><option value="data_buyer">Veri alıcısı</option><option value="admin">Admin</option>
        </select>
      </label>
      <label className="text-xs font-bold text-ink/60 sm:col-span-2">Biyografi<textarea name="bio" defaultValue={p.bio ?? ""} className="game-input mt-1 min-h-16 !py-2" /></label>
      <div className="sm:col-span-2"><Msg s={s} /></div>
      <button className="game-btn !py-2 sm:col-span-2" disabled={pending}>{pending ? "…" : "Değişiklikleri kaydet"}</button>
    </form>
  );
}

export function MessageForm({ userId }: { userId: string }) {
  const [s, action, pending] = useActionState<R, FormData>(adminMessageAction.bind(null, userId), {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <textarea name="body" className="game-input min-h-20 !py-2" placeholder="Dream Shop ekibi olarak mesaj yaz…" required />
      <Msg s={s} />
      <button className="game-btn !py-2" disabled={pending}>{pending ? "…" : "💬 Mesaj gönder"}</button>
    </form>
  );
}

export function BanBox({ userId, banned, reason }: { userId: string; banned: boolean; reason: string | null }) {
  const [r, setR] = useState(reason ?? "");
  const [s, setS] = useState<R>({});
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      {banned && <p className="rounded-xl bg-red-50 p-2 text-sm font-bold text-red-600">⛔ Hesap askıda{reason ? `: ${reason}` : ""}</p>}
      {!banned && <input value={r} onChange={(e) => setR(e.target.value)} className="game-input !py-2" placeholder="Askıya alma nedeni" />}
      <Msg s={s} />
      <button disabled={pending} className={`game-btn !py-2 ${banned ? "mint" : "!bg-none !bg-red-500 !shadow-[0_6px_0_#b02a2a]"}`}
        onClick={() => { if (!banned && !confirm("Hesap askıya alınsın mı? Kullanıcı siteyi kullanamaz, ilanları kaldırılır.")) return;
          start(async () => setS(await banAction(userId, !banned, r))); }}>
        {banned ? "Askıyı kaldır" : "⛔ Hesabı askıya al"}
      </button>
    </div>
  );
}

export function RemoveItemButton({ userId, itemId, name }: { userId: string; itemId: string; name: string }) {
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);
  if (gone) return <span className="text-xs font-bold text-ink/40">kaldırıldı</span>;
  return (
    <button disabled={pending} className="chip !border-red-200 !text-red-600 !py-0.5 text-xs" onClick={() => {
      const refund = confirm(`“${name}” kaldırılacak. Ödenen kredi kullanıcıya iade edilsin mi?\n\nTamam = iade et, İptal = iadesiz kaldır`);
      if (!confirm(`“${name}” kaldırılsın mı${refund ? " (iadeli)" : " (iadesiz)"}?`)) return;
      start(async () => { const r = await removeItemAction(userId, itemId, refund); if (!r.error) setGone(true); else alert(r.error); });
    }}>Kaldır</button>
  );
}
