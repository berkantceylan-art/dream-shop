"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function run(fn: string, args: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, args);
  revalidatePath("/admin");
  return error ? { error: error.message } : {};
}

export async function setStoreStatus(id: string, status: "approved" | "suspended" | "pending") {
  return run("admin_set_store_status", { p_store: id, p_status: status });
}
export async function setRole(userId: string, role: string) {
  return run("admin_set_role", { p_user: userId, p_role: role });
}
export async function addMall(form: FormData) {
  const supabase = await createClient();
  await supabase.from("malls").insert({
    city_id: Number(form.get("city_id")),
    name: String(form.get("name")).trim(),
    district: String(form.get("district") || "").trim() || null,
  });
  revalidatePath("/admin");
}

export type StoreFormState = { error?: string; ok?: string };
export async function adminCreateStore(_: StoreFormState, form: FormData): Promise<StoreFormState> {
  const { slugify } = await import("@/lib/slug");
  const name = String(form.get("name") || "").trim();
  const cityId = Number(form.get("city_id"));
  if (name.length < 2 || !cityId) return { error: "Mağaza adı ve şehir gerekli." };
  const supabase = await createClient();
  const { error } = await supabase.from("stores").insert({
    name, city_id: cityId, mall_id: String(form.get("mall_id") || "") || null,
    place_type: String(form.get("place_type") || "") || null,
    district: String(form.get("district") || "") || null,
    slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`,
    status: "approved", owner_id: null,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: `“${name}” açıldı. Artık Ürünler sekmesinden bu mağazaya ürün ekleyebilirsin.` };
}

export async function replyTicket(form: FormData) {
  const supabase = await createClient();
  await supabase.from("support_tickets").update({
    admin_reply: String(form.get("reply") || "").trim() || null,
    status: String(form.get("status") || "answered"),
    updated_at: new Date().toISOString(),
  }).eq("id", String(form.get("id")));
  revalidatePath("/admin");
}

export async function saveMarketSettings(form: FormData) {
  const supabase = await createClient();
  const fee = Math.min(50, Math.max(0, Number(form.get("fee_percent"))));
  const quick = Math.min(100, Math.max(0, Number(form.get("quick_sell_pct"))));
  await supabase.from("market_settings").update({ fee_percent: fee, quick_sell_pct: quick }).eq("id", true);
  revalidatePath("/admin");
}

export async function approveBuyer(id: string, ok: boolean) {
  const supabase = await createClient();
  await supabase.rpc("admin_approve_buyer", { p_buyer: id, p_ok: ok });
  revalidatePath("/admin");
}
export async function reviewReport(form: FormData) {
  const supabase = await createClient();
  await supabase.from("user_reports").update({ status: "reviewed" }).eq("id", Number(form.get("id")));
  revalidatePath("/admin");
}
