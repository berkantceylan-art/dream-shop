"use client";
import { useActionState } from "react";
import PlaceFields from "@/components/PlaceFields";
import { applyStore, type ApplyState } from "./actions";

type City = { id: number; name: string };
type Mall = { id: string; name: string; city_id: number };
type District = { city_id: number; name: string };

export default function ApplyForm({ cities, malls, districts, defaultCity }: {
  cities: City[]; malls: Mall[]; districts: District[]; defaultCity: number;
}) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(applyStore, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input name="name" className="game-input" placeholder="Dükkân adı *" required />
      <div className="grid gap-3 sm:grid-cols-2">
        <PlaceFields cities={cities} malls={malls} districts={districts} defaultCity={defaultCity} />
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
