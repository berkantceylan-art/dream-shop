import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Me = {
  id: string; username: string; display_name: string | null; role: "user" | "store_owner" | "admin" | "data_buyer";
  city_id: number | null; height_cm: number | null; balance: number;
};

/** Giriş + KVKK onayı zorunlu sayfalar için. */
export async function requireMe(next = "/hesap") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/giris?next=${encodeURIComponent(next)}`);

  const [{ data: p }, { data: w }, { data: consent }] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, role, city_id, height_cm").eq("id", user.id).single(),
    supabase.from("wallets").select("balance").eq("user_id", user.id).single(),
    supabase.from("consents").select("id").eq("user_id", user.id).eq("type", "kvkk_terms").eq("granted", true).limit(1),
  ]);
  if (!consent?.length) redirect("/kayit-tamamla");
  const me = { ...(p as Omit<Me, "balance">), balance: w?.balance ?? 0 } as Me;
  return { supabase, me };
}

export async function requireAdmin(next = "/admin") {
  const r = await requireMe(next);
  if (r.me.role !== "admin") redirect("/hesap");
  return r;
}
