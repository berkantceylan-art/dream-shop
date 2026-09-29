"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";

export type ApplyState = { error?: string };

export async function applyStore(_: ApplyState, form: FormData): Promise<ApplyState> {
  const name = String(form.get("name") || "").trim();
  const cityId = Number(form.get("city_id"));
  const mallId = String(form.get("mall_id") || "") || null;
  if (name.length < 2) return { error: "Mağaza adı gerekli." };
  if (!cityId) return { error: "Şehir seç." };
  if (form.get("terms") !== "on") return { error: "Mağaza sözleşmesini kabul etmelisin." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum yok." };

  const { error } = await supabase.from("stores").insert({
    owner_id: user.id, name, city_id: cityId, mall_id: mallId,
    place_type: String(form.get("place_type") || "") || null,
    district: String(form.get("district") || "") || null,
    slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`,
    tax_no: String(form.get("tax_no") || "").trim() || null,
    status: "pending",
  });
  if (error) return { error: error.message };
  revalidatePath("/panel");
  return {};
}
