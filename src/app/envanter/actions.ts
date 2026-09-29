"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeAvatar } from "@/lib/avatar";

type AvatarAttr = { style?: string; color?: string };

export async function equip(itemId: string, on: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum yok" };

  const { data: attrs, error } = await supabase.rpc("equip_item", { p_item: itemId, p_on: on });
  if (error) return { error: error.message };

  // Giyilen ürünü 3D karaktere yansıt
  if (on) {
    const { data: item } = await supabase.from("inventory_items").select("products(wear_slot)").eq("id", itemId).single();
    const slot = (item?.products as unknown as { wear_slot: string } | null)?.wear_slot;
    const a = ((attrs as Record<string, unknown> | null)?.avatar ?? {}) as AvatarAttr;
    const { data: av } = await supabase.from("avatars").select("config").eq("user_id", user.id).maybeSingle();
    const cfg = normalizeAvatar(av?.config);
    if (slot === "top" || slot === "outerwear") cfg.top = { style: (a.style as never) ?? cfg.top.style, color: a.color ?? cfg.top.color };
    if (slot === "bottom") cfg.bottom = { style: (a.style as never) ?? cfg.bottom.style, color: a.color ?? cfg.bottom.color };
    if (slot === "shoes" && a.color) cfg.shoes = a.color;
    await supabase.from("avatars").upsert({ user_id: user.id, config: cfg, updated_at: new Date().toISOString() });
  }
  revalidatePath("/envanter");
  return {};
}
