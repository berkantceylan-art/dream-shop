"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CONSENT_VERSION } from "@/lib/consent";

export type FormState = { error?: string; ok?: string; code?: string };
const clean = (m: string) => m.replace(/^.*?:\s*/, "");

export async function sendCreditsAction(_: FormState, f: FormData): Promise<FormState> {
  const supabase = await createClient();
  const username = String(f.get("username") || "").replace(/^@/, "");
  const amount = Number(f.get("amount"));
  const { error } = await supabase.rpc("send_credits", {
    p_username: username, p_amount: amount, p_note: String(f.get("note") || "") || null, p_gift: f.get("gift") === "on",
  });
  if (error) return { error: clean(error.message) };
  revalidatePath("/profil", "layout");
  return { ok: `@${username} kullanıcısına ${amount.toLocaleString("tr-TR")} kredi gönderildi 🎁` };
}

export async function createGiftAction(_: FormState, f: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_gift_card", {
    p_amount: Number(f.get("amount")), p_message: String(f.get("message") || "") || null,
    p_max_uses: Number(f.get("max_uses") || 1), p_days: Number(f.get("days") || 365),
  });
  if (error) return { error: clean(error.message) };
  revalidatePath("/profil", "layout"); revalidatePath("/admin");
  return { ok: "Hediye çekin hazır! Kodu arkadaşına gönder.", code: String(data) };
}

export async function redeemGiftAction(_: FormState, f: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_gift_card", { p_code: String(f.get("code") || "") });
  if (error) return { error: clean(error.message) };
  revalidatePath("/profil", "layout");
  return { ok: `+${Number(data).toLocaleString("tr-TR")} kredi hesabına eklendi 🎉` };
}

export async function createTicketAction(_: FormState, f: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum yok." };
  const subject = String(f.get("subject") || "").trim(), message = String(f.get("message") || "").trim();
  if (subject.length < 3 || message.length < 10) return { error: "Konu ve açıklamayı biraz daha detaylı yaz." };
  const { error } = await supabase.from("support_tickets").insert({
    user_id: user.id, category: String(f.get("category") || "diger"), subject: subject.slice(0, 120),
    message: message.slice(0, 4000), page_url: String(f.get("page_url") || "") || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/profil");
  return { ok: "Talebin alındı. Yanıtımızı buradan takip edebilirsin." };
}

export async function updateProfileAction(_: FormState, f: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum yok." };
  const { error } = await supabase.from("profiles").update({
    display_name: String(f.get("display_name") || "").trim() || null,
    city_id: Number(f.get("city_id")) || null,
    district: String(f.get("district") || "") || null,
    bio: String(f.get("bio") || "").trim().slice(0, 300) || null,
    dm_policy: ["everyone", "followers", "none"].includes(String(f.get("dm_policy"))) ? String(f.get("dm_policy")) : "everyone",
    home_visibility: ["everyone", "followers", "none"].includes(String(f.get("home_visibility"))) ? String(f.get("home_visibility")) : "everyone",
  }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: "Bilgilerin güncellendi." };
}

export async function setConsentAction(type: "aggregate_analytics" | "marketing", granted: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("consents").insert({ user_id: user.id, type, granted, version: CONSENT_VERSION });
  revalidatePath("/profil");
}
