"use server";
import { createClient } from "@/lib/supabase/server";
import { CONSENT_VERSION } from "@/lib/consent";

export type OnboardInput = {
  display_name: string;
  city_id: number;
  district: string;
  birth_year: number;
  gender: string;
  kvkk_terms: boolean;
  aggregate_analytics: boolean;
  marketing: boolean;
};

export async function completeOnboarding(input: OnboardInput): Promise<{ error?: string }> {
  if (!input.kvkk_terms) return { error: "Devam etmek için Aydınlatma Metni ve Kullanım Koşullarını kabul etmelisin." };
  const thisYear = new Date().getFullYear();
  if (!input.city_id) return { error: "Şehrini seç." };
  if (!input.birth_year || input.birth_year > thisYear - 18 || input.birth_year < 1920)
    return { error: "Platformu kullanmak için 18 yaşından büyük olmalısın." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı, tekrar giriş yap." };

  const { error: pErr } = await supabase.from("profiles").update({
    display_name: input.display_name.trim() || null,
    city_id: input.city_id,
    district: input.district.trim() || null,
    birth_year: input.birth_year,
    gender: input.gender || null,
  }).eq("id", user.id);
  if (pErr) return { error: pErr.message };

  const { error: cErr } = await supabase.from("consents").insert([
    { user_id: user.id, type: "kvkk_terms", granted: true, version: CONSENT_VERSION },
    { user_id: user.id, type: "aggregate_analytics", granted: input.aggregate_analytics, version: CONSENT_VERSION },
    { user_id: user.id, type: "marketing", granted: input.marketing, version: CONSENT_VERSION },
  ]);
  if (cErr) return { error: cErr.message };
  return {};
}
