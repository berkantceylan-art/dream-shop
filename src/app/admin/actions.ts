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
