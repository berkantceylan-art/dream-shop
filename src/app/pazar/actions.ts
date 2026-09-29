"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const done = () => { revalidatePath("/pazar"); revalidatePath("/envanter"); revalidatePath("/profil"); };

export async function buyListingAction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("buy_listing", { p_listing: id });
  if (error) return { error: error.message.includes("Yetersiz") ? "Kredin yetmiyor 😢" : error.message };
  done(); return {};
}

export async function createListingAction(item: string, price: number, note: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_listing", { p_item: item, p_price: Math.round(price), p_note: note || null });
  if (error) return { error: error.message };
  done(); return {};
}

export async function cancelListingAction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_listing", { p_listing: id });
  if (error) return { error: error.message };
  done(); return {};
}

export async function quickSellAction(item: string): Promise<{ error?: string; amount?: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("quick_sell", { p_item: item });
  if (error) return { error: error.message };
  done(); return { amount: Number(data) };
}
