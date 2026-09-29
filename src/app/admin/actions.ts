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
    slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`,
    status: "approved", owner_id: null,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: `“${name}” açıldı. Artık Ürünler sekmesinden bu mağazaya ürün ekleyebilirsin.` };
}
