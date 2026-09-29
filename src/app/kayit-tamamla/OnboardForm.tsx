"use client";
import { useActionState } from "react";
import { completeOnboarding, type OnboardState } from "./actions";

type City = { id: number; name: string };

export default function OnboardForm({ cities }: { cities: City[] }) {
  const [state, action, pending] = useActionState<OnboardState, FormData>(completeOnboarding, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input name="display_name" placeholder="Görünen ad (isteğe bağlı)" className="rounded-lg border p-3" />
      <select name="city_id" required defaultValue="" className="rounded-lg border p-3">
        <option value="" disabled>Şehrini seç</option>
        {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input name="birth_year" type="number" placeholder="Doğum yılı" required className="rounded-lg border p-3" />
      <select name="gender" defaultValue="" className="rounded-lg border p-3">
        <option value="">Cinsiyet (belirtmek istemiyorum)</option>
        <option value="kadin">Kadın</option>
        <option value="erkek">Erkek</option>
        <option value="diger">Diğer</option>
      </select>

      <fieldset className="flex flex-col gap-3 rounded-lg bg-gray-50 p-4 text-sm">
        <label className="flex gap-2">
          <input type="checkbox" name="kvkk_terms" />
          <span><b>(Zorunlu)</b> <a href="/yasal/aydinlatma" target="_blank" className="underline">KVKK Aydınlatma Metni</a>'ni okudum,{" "}
          <a href="/yasal/kosullar" target="_blank" className="underline">Kullanım Koşulları</a>'nı kabul ediyorum. Kredilerin yalnızca platform içinde kullanılabildiğini ve paraya çevrilemediğini biliyorum.</span>
        </label>
        <label className="flex gap-2">
          <input type="checkbox" name="aggregate_analytics" />
          <span><b>(İsteğe bağlı)</b> Platformdaki tercihlerimin, kimliğim ayırt edilemeyecek şekilde <b>anonim ve toplu</b> istatistiklere dahil edilerek iş ortaklarıyla paylaşılmasına <a href="/yasal/acik-riza" target="_blank" className="underline">açık rıza</a> veriyorum.</span>
        </label>
        <label className="flex gap-2">
          <input type="checkbox" name="marketing" />
          <span><b>(İsteğe bağlı)</b> Kampanya ve duyurulardan e-posta ile haberdar olmak istiyorum.</span>
        </label>
      </fieldset>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="rounded-lg bg-black p-3 font-semibold text-white disabled:opacity-50">
        {pending ? "Kaydediliyor…" : "Devam et"}
      </button>
    </form>
  );
}
