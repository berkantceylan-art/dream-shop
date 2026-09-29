import type { SupabaseClient } from "@supabase/supabase-js";

/** Yeni üyeye verilen kredi (admin panelinden değiştirilebilir) */
export async function getSignupBonus(supabase: SupabaseClient) {
  const { data } = await supabase.from("app_settings").select("signup_bonus").maybeSingle();
  return Number(data?.signup_bonus ?? 50000);
}
export const fmtCredits = (n: number) => n.toLocaleString("tr-TR");
