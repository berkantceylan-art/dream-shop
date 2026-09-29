"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type R = { error?: string; ok?: string };
const done = (id: string) => { revalidatePath(`/admin/kullanicilar/${id}`); revalidatePath("/admin/kullanicilar"); };

export async function adjustCreditsAction(userId: string, _: R, f: FormData): Promise<R> {
  const supabase = await createClient();
  const sign = f.get("sign") === "-" ? -1 : 1;
  const amount = Math.round(Number(f.get("amount"))) * sign;
  if (!amount) return { error: "Miktar gir." };
  const { data, error } = await supabase.rpc("admin_adjust_credits", { p_user: userId, p_amount: amount, p_note: String(f.get("note") || "Admin düzeltmesi") });
  if (error) return { error: error.message };
  done(userId);
  return { ok: `Yeni bakiye: ${Number(data).toLocaleString("tr-TR")} kredi` };
}

export async function updateUserAction(userId: string, _: R, f: FormData): Promise<R> {
  const supabase = await createClient();
  const p = Object.fromEntries(["username", "display_name", "bio", "city_id", "district", "phone"].map((k) => [k, String(f.get(k) ?? "")]));
  const { error } = await supabase.rpc("admin_update_profile", { p_user: userId, p });
  if (error) return { error: error.message.includes("duplicate") ? "Bu kullanıcı adı alınmış." : error.message };
  const role = String(f.get("role") || "");
  if (role) {
    const { error: e2 } = await supabase.rpc("admin_set_role", { p_user: userId, p_role: role });
    if (e2) return { error: e2.message };
  }
  done(userId);
  return { ok: "Kaydedildi." };
}

export async function banAction(userId: string, ban: boolean, reason: string): Promise<R> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_ban_user", { p_user: userId, p_ban: ban, p_reason: reason || null });
  if (error) return { error: error.message };
  done(userId);
  return { ok: ban ? "Hesap askıya alındı." : "Askı kaldırıldı." };
}

export async function removeItemAction(userId: string, itemId: string, refund: boolean): Promise<R> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_remove_item", { p_item: itemId, p_refund: refund });
  if (error) return { error: error.message };
  done(userId);
  return { ok: "Eşya kaldırıldı." };
}

export async function adminMessageAction(userId: string, _: R, f: FormData): Promise<R> {
  const supabase = await createClient();
  const body = String(f.get("body") || "").trim();
  if (!body) return { error: "Mesaj boş." };
  const { error } = await supabase.rpc("send_message", { p_to: userId, p_body: body });
  if (error) return { error: error.message };
  return { ok: "Mesaj gönderildi. Kullanıcı Mesajlar bölümünde görecek." };
}
