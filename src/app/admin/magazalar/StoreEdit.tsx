"use client";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PLACE_TYPES } from "@/lib/places";
import { deleteStoreAction, updateStoreAction } from "../actions";

type S = { id: string; name: string; place_type: string | null; city_id: number; district: string | null; mall_id: string | null; status: string; logo_url: string | null };

export default function StoreEdit({ s, cities, malls, districts }: {
  s: S; cities: { id: number; name: string }[]; malls: { id: string; name: string; city_id: number }[]; districts: { city_id: number; name: string }[];
}) {
  const [state, action, pending] = useActionState(updateStoreAction.bind(null, s.id), {} as { error?: string; ok?: string });
  const [city, setCity] = useState(s.city_id);
  const [del, startDel] = useTransition();
  const router = useRouter();
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-bold text-ink/60">Ad<input name="name" defaultValue={s.name} className="game-input mt-1 !py-2" /></label>
      <label className="text-xs font-bold text-ink/60">Tür
        <select name="place_type" defaultValue={s.place_type ?? ""} className="game-input mt-1 !py-2">
          <option value="">—</option>{PLACE_TYPES.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
        </select>
      </label>
      <label className="text-xs font-bold text-ink/60">Şehir
        <select name="city_id" value={city} onChange={(e) => setCity(Number(e.target.value))} className="game-input mt-1 !py-2">
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="text-xs font-bold text-ink/60">İlçe
        <select name="district" defaultValue={s.district ?? ""} key={city} className="game-input mt-1 !py-2">
          <option value="">Merkez</option>{districts.filter((d) => d.city_id === city).map((d) => <option key={d.name}>{d.name}</option>)}
        </select>
      </label>
      <label className="text-xs font-bold text-ink/60">AVM
        <select name="mall_id" defaultValue={s.mall_id ?? ""} key={`m${city}`} className="game-input mt-1 !py-2">
          <option value="">Cadde dükkânı</option>{malls.filter((m) => m.city_id === city).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      <label className="text-xs font-bold text-ink/60">Durum
        <select name="status" defaultValue={s.status} className="game-input mt-1 !py-2">
          <option value="pending">⏳ Bekliyor</option><option value="approved">✅ Onaylı</option><option value="suspended">⛔ Askıda</option>
        </select>
      </label>
      <label className="text-xs font-bold text-ink/60 sm:col-span-2">Logo URL<input name="logo_url" defaultValue={s.logo_url ?? ""} className="game-input mt-1 !py-2" /></label>
      {state.error && <p className="rounded-xl bg-red-50 p-2 text-sm font-semibold text-red-600 sm:col-span-2">{state.error}</p>}
      {state.ok && <p className="rounded-xl bg-emerald-50 p-2 text-sm font-semibold text-emerald-700 sm:col-span-2">{state.ok}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button className="game-btn flex-1 !py-2" disabled={pending}>{pending ? "…" : "Kaydet"}</button>
        <button type="button" disabled={del} className="game-btn ghost !py-2 !text-red-600" onClick={() => {
          if (!confirm(`“${s.name}” silinsin mi? Ürünü olan mağazalar silinmez, askıya alınır ve ürünleri yayından kalkar.`)) return;
          startDel(async () => { const r = await deleteStoreAction(s.id); if (r.error) alert(r.error); else { if (r.archived) alert("Mağazanın ürünleri olduğu için askıya alındı."); router.push("/admin/magazalar"); } });
        }}>🗑️ Sil</button>
      </div>
    </form>
  );
}
