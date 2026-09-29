"use client";
import { useActionState, useState } from "react";
import { adminCreateStore, type StoreFormState } from "./actions";

type City = { id: number; name: string };
type Mall = { id: string; name: string; city_id: number };

export default function AdminStoreForm({ cities, malls }: { cities: City[]; malls: Mall[] }) {
  const [state, action, pending] = useActionState<StoreFormState, FormData>(adminCreateStore, {});
  const [city, setCity] = useState(34);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4">
      <input name="name" className="game-input" placeholder="Mağaza adı" required />
      <select name="city_id" className="game-input" value={city} onChange={(e) => setCity(Number(e.target.value))}>
        {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select name="mall_id" className="game-input" defaultValue="">
        <option value="">Cadde mağazası</option>
        {malls.filter((m) => m.city_id === city).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      <button className="game-btn" disabled={pending}>{pending ? "Açılıyor…" : "Mağaza aç"}</button>
      {state.error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600 sm:col-span-4">{state.error}</p>}
      {state.ok && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 sm:col-span-4">{state.ok}</p>}
    </form>
  );
}
