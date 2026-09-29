"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CONSENT_VERSION } from "@/lib/consent";

export type OnboardState = { error?: string };

export async function completeOnboarding(_: OnboardState, form: FormData): Promise<OnboardState> {
  if (form.get("kvkk_terms") !== "on")
    return { error: "Devam etmek için Aydınlatma Metni ve Kullanım Koşullarını kabul etmelisin." };

  const cityId = Number(form.get("city_id"));
  const birthYear = Number(form.get("birth_year"));
  const thisYear = new Date().getFullYear();
  if (!cityId) return { error: "Şehrini seç." };
  if (!birthYear || birthYear > thisYear - 18 || birthYear < 1920)
    return { error: "Platformu kullanmak için 18 yaşından büyük olmalısın." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const { error: pErr } = await supabase.from("profiles").update({
    city_id: cityId,
    birth_year: birthYear,
    gender: (form.get("gender") as string) || null,
    display_name: (form.get("display_name") as string) || null,
  }).eq("id", user.id);
  if (pErr) return { error: pErr.message };

  const { error: cErr } = await supabase.from("consents").insert([
    { user_id: user.id, type: "kvkk_terms", granted: true, version: CONSENT_VERSION },
    { user_id: user.id, type: "aggregate_analytics", granted: form.get("aggregate_analytics") === "on", version: CONSENT_VERSION },
    { user_id: user.id, type: "marketing", granted: form.get("marketing") === "on", version: CONSENT_VERSION },
  ]);
  if (cErr) return { error: cErr.message };

  redirect("/hesap");
}
