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

// ---------- Mağaza düzenleme / silme ----------
export async function updateStoreAction(id: string, _: { error?: string; ok?: string }, f: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("stores").update({
    name: String(f.get("name") || "").trim(),
    place_type: String(f.get("place_type") || "") || null,
    city_id: Number(f.get("city_id")),
    district: String(f.get("district") || "") || null,
    mall_id: String(f.get("mall_id") || "") || null,
    status: String(f.get("status") || "approved"),
    logo_url: String(f.get("logo_url") || "") || null,
  }).eq("id", id);
  revalidatePath("/admin/magazalar");
  return error ? { error: error.message } : { ok: "Kaydedildi." };
}

export async function deleteStoreAction(id: string): Promise<{ error?: string; archived?: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.from("stores").delete().eq("id", id);
  if (error?.code === "23503") {
    await supabase.from("products").update({ status: "archived" }).eq("store_id", id);
    await supabase.from("stores").update({ status: "suspended" }).eq("id", id);
    revalidatePath("/admin/magazalar");
    return { archived: true };
  }
  revalidatePath("/admin/magazalar");
  return error ? { error: error.message } : {};
}

// ---------- Ürünler: toplu işlem ----------
export async function bulkProductsAction(ids: string[], op: "active" | "archived" | "delete"): Promise<{ error?: string; note?: string }> {
  const supabase = await createClient();
  if (!ids.length) return {};
  if (op === "delete") {
    let archived = 0;
    for (const id of ids) {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error?.code === "23503") { await supabase.from("products").update({ status: "archived" }).eq("id", id); archived++; }
    }
    revalidatePath("/admin/urunler");
    return archived ? { note: `${archived} ürün satıldığı için silinemedi, yayından kaldırıldı.` } : {};
  }
  const { error } = await supabase.from("products").update({ status: op }).in("id", ids);
  revalidatePath("/admin/urunler");
  return error ? { error: error.message } : {};
}

// ---------- Katalog CRUD ----------
export async function saveMall(f: FormData) {
  const supabase = await createClient();
  const id = String(f.get("id") || "");
  const row = { city_id: Number(f.get("city_id")), name: String(f.get("name")).trim(), district: String(f.get("district") || "").trim() || null };
  if (id) await supabase.from("malls").update(row).eq("id", id); else await supabase.from("malls").insert(row);
  revalidatePath("/admin/katalog");
}
export async function deleteMall(f: FormData) {
  const supabase = await createClient();
  const id = String(f.get("id"));
  await supabase.from("stores").update({ mall_id: null }).eq("mall_id", id);
  await supabase.from("malls").delete().eq("id", id);
  revalidatePath("/admin/katalog");
}
export async function saveChain(f: FormData) {
  const supabase = await createClient();
  const id = String(f.get("id") || "");
  const row = { name: String(f.get("name")).trim(), place_type: String(f.get("place_type") || "") || null };
  if (id) {
    await supabase.from("chains").update(row).eq("id", id);
    await supabase.from("stores").update({ name: row.name }).eq("chain_id", id);
  } else {
    const { data } = await supabase.from("chains").insert(row).select("id").single();
    if (data && f.get("branches") === "on" && row.place_type) {
      const { data: cities } = await supabase.from("cities").select("id");
      await supabase.from("stores").insert((cities ?? []).map((c) => ({
        name: row.name, slug: `${row.place_type}-${c.id}-${data.id.slice(0, 4)}`, city_id: c.id, place_type: row.place_type,
        chain_id: data.id, status: "approved", owner_id: null })));
    }
  }
  revalidatePath("/admin/katalog");
}
export async function saveCategory(f: FormData) {
  const supabase = await createClient();
  const id = Number(f.get("id") || 0);
  const row = { name: String(f.get("name")).trim(), kind: String(f.get("kind")), parent_id: Number(f.get("parent_id")) || null };
  if (id) await supabase.from("categories").update(row).eq("id", id); else await supabase.from("categories").insert(row);
  revalidatePath("/admin/katalog");
}
export async function savePlaceType(f: FormData) {
  const supabase = await createClient();
  await supabase.from("place_types").upsert({ id: String(f.get("id")).trim().toLowerCase(), name: String(f.get("name")).trim(), icon: String(f.get("icon")).trim() || "🏷️", sort: Number(f.get("sort") || 50) });
  revalidatePath("/admin/katalog");
}

// ---------- Duyurular ----------
export async function broadcastAction(_: { error?: string; ok?: string }, f: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_broadcast", {
    p_title: String(f.get("title") || "").trim(), p_body: String(f.get("body") || "").trim(), p_city: Number(f.get("city_id")) || null,
  });
  return error ? { error: error.message } : { ok: `${Number(data).toLocaleString("tr-TR")} kullanıcıya bildirim gönderildi.` };
}

// ---------- Ayarlar ----------
export async function saveEconomy(f: FormData) {
  const supabase = await createClient();
  await supabase.from("app_settings").update({ signup_bonus: Math.max(0, Number(f.get("signup_bonus"))), updated_at: new Date().toISOString() }).eq("id", true);
  for (const [k, v] of f.entries()) {
    if (k.startsWith("quest_")) await supabase.from("quests").update({ reward: Math.max(1, Number(v)) }).eq("id", k.slice(6));
  }
  revalidatePath("/admin/ayarlar");
}
export async function savePackage(f: FormData) {
  const supabase = await createClient();
  const id = Number(f.get("id") || 0);
  const row = { name: String(f.get("name")), credits: Number(f.get("credits")), price_try: Number(f.get("price_try")), active: f.get("active") === "on" };
  if (id) await supabase.from("credit_packages").update(row).eq("id", id); else await supabase.from("credit_packages").insert(row);
  revalidatePath("/admin/ayarlar");
}

export async function updateBuyerPlan(f: FormData) {
  const supabase = await createClient();
  const id = String(f.get("id"));
  const add = Number(f.get("add_credits") || 0);
  const { data: b } = await supabase.from("data_buyers").select("report_credits").eq("id", id).single();
  await supabase.from("data_buyers").update({
    plan_id: String(f.get("plan_id") || "") || null,
    plan_until: String(f.get("plan_until") || "") || null,
    report_credits: Math.max(0, Number(b?.report_credits ?? 0) + add),
  }).eq("id", id);
  revalidatePath("/admin/veri");
}
