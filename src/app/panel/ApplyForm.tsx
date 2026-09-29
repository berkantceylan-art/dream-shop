"use client";
import { useActionState, useState } from "react";
import { applyStore, type ApplyState } from "./actions";

type City = { id: number; name: string };
type Mall = { id: string; name: string; city_id: number };

export default function ApplyForm({ cities, malls, defaultCity }: { cities: City[]; malls: Mall[]; defaultCity: number }) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(applyStore, {});
  const [city, setCity] = useState(defaultCity);
  const cityMalls = malls.filter((m) => m.city_id === city);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input name="name" className="game-input" placeholder="Mağaza adı *" required />
      <div className="grid gap-3 sm:grid-cols-2">
        <select name="city_id" className="game-input" value={city} onChange={(e) => setCity(Number(e.target.value))}>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="mall_id" className="game-input" defaultValue="">
          <option value="">Cadde mağazası (AVM dışı)</option>
          {cityMalls.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <input name="tax_no" className="game-input" placeholder="Vergi numarası (gerçek işletmeler için)" />
      <label className="flex gap-2 text-sm font-semibold">
        <input type="checkbox" name="terms" className="h-5 w-5 accent-[#c24dff]" />
        <span><a href="/yasal/magaza" target="_blank" className="underline">Mağaza sözleşmesi</a>'ni okudum ve kabul ediyorum.</span>
      </label>
      {state.error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{state.error}</p>}
      <button className="game-btn" disabled={pending}>{pending ? "Başvuru gönderiliyor…" : "Başvuruyu gönder"}</button>
    </form>
  );
}
