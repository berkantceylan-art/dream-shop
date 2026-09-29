"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProductInput = {
  id?: string;
  store_id: string | null;
  category_id: number;
  name: string; brand: string; description: string;
  credit_price: number; real_price_try: number | null;
  thumbnail_url: string | null;
  avatar_style: string | null; avatar_color: string | null;
};

const CAT: Record<number, { kind: string; slot: string | null }> = {
  1: { kind: "clothing", slot: "top" }, 2: { kind: "clothing", slot: "top" }, 3: { kind: "clothing", slot: "bottom" },
  4: { kind: "clothing", slot: "shoes" }, 5: { kind: "clothing", slot: "outerwear" }, 6: { kind: "accessory", slot: "accessory" },
  7: { kind: "car", slot: null }, 8: { kind: "house", slot: null }, 9: { kind: "furniture", slot: null },
  10: { kind: "other", slot: null }, 11: { kind: "other", slot: null },
};

export async function saveProduct(input: ProductInput): Promise<{ error?: string }> {
  if (!input.name.trim()) return { error: "Ürün adı gerekli." };
  if (!(input.credit_price >= 0)) return { error: "Kredi fiyatı geçersiz." };
  const c = CAT[input.category_id];
  if (!c) return { error: "Kategori seç." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum yok." };

  const row = {
    store_id: input.store_id,
    category_id: input.category_id,
    kind: c.kind,
    wear_slot: c.slot,
    name: input.name.trim(),
    brand: input.brand.trim() || null,
    description: input.description.trim() || null,
    credit_price: Math.round(input.credit_price),
    real_price_try: input.real_price_try,
    thumbnail_url: input.thumbnail_url,
    attributes: c.slot && input.avatar_color
      ? { avatar: { style: input.avatar_style || undefined, color: input.avatar_color } } : {},
    status: "active",
    created_by: user.id,
  };
  const { error } = input.id
    ? await supabase.from("products").update(row).eq("id", input.id)
    : await supabase.from("products").insert(row);
  if (error) return { error: error.message.includes("row-level") ? "Bu işlem için yetkin yok (mağazan onaylı mı?)." : error.message };
  revalidatePath("/panel"); revalidatePath("/admin");
  return {};
}

export async function setProductStatus(id: string, status: "active" | "archived") {
  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ status }).eq("id", id);
  revalidatePath("/panel"); revalidatePath("/admin");
  return error ? { error: error.message } : {};
}
