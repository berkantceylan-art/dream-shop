"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveLayoutAction(entries: { item_id: string; x: number; z: number; rot: number }[]): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum yok." };
  if (!entries.length) return {};
  const { error } = await supabase.from("home_layout").upsert(
    entries.slice(0, 300).map((e) => ({ ...e, owner_id: user.id, updated_at: new Date().toISOString() })));
  if (error) return { error: error.message };
  revalidatePath("/evim");
  return {};
}

export async function setActiveAction(item: string | null, kind: "house" | "car"): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_active_item", { p_item: item, p_kind: kind });
  if (error) return { error: error.message };
  revalidatePath("/evim"); revalidatePath("/garaj");
  return {};
}
