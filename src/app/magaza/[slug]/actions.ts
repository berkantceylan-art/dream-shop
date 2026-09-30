"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function buyProduct(productId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("purchase_product", { p_product: productId });
  if (error) return { error: error.message.includes("Yetersiz") ? "Kredin yetmiyor 😢" : error.message };
  revalidatePath("/", "layout");
  return {};
}

export async function viewProduct(productId: string) {
  const supabase = await createClient();
  await supabase.rpc("log_product_event", { p_product: productId, p_type: "view" });
}

export async function toggleWishlist(productId: string, on: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  if (on) {
    await supabase.from("wishlist").upsert({ user_id: user.id, product_id: productId });
    await supabase.rpc("log_product_event", { p_product: productId, p_type: "wishlist" });
  } else {
    await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", productId);
  }
}

export async function setPriceWishAction(productId: string, price: number, notify: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_price_wish", { p_product: productId, p_price: Math.round(price), p_notify: notify });
  return error ? { error: error.message } : {};
}

export async function removePriceWishAction(productId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await supabase.from("price_wishes").delete().eq("user_id", user.id).eq("product_id", productId);
  revalidatePath("/profil");
}
