"use client";
import { useActionState } from "react";
import PlaceFields from "@/components/PlaceFields";
import { adminCreateStore, type StoreFormState } from "./actions";

type City = { id: number; name: string };
type Mall = { id: string; name: string; city_id: number };
type District = { city_id: number; name: string };

export default function AdminStoreForm({ cities, malls, districts }: { cities: City[]; malls: Mall[]; districts: District[] }) {
  const [state, action, pending] = useActionState<StoreFormState, FormData>(adminCreateStore, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <input name="name" className="game-input" placeholder="Dükkân adı (ör. Yılmaz Kasabı)" required />
      <PlaceFields cities={cities} malls={malls} districts={districts} />
      <button className="game-btn" disabled={pending}>{pending ? "Açılıyor…" : "Dükkânı aç"}</button>
      {state.error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600 sm:col-span-3">{state.error}</p>}
      {state.ok && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 sm:col-span-3">{state.ok}</p>}
    </form>
  );
}
