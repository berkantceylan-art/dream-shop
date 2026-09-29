import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Me = {
  id: string; username: string; display_name: string | null; role: "user" | "store_owner" | "admin" | "data_buyer";
  city_id: number | null; height_cm: number | null; balance: number;
  unread_notifications: number; unread_messages: number;
};

/** Giriş + KVKK onayı zorunlu sayfalar için. */
export async function requireMe(next = "/hesap") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/giris?next=${encodeURIComponent(next)}`);

  const [{ data: p }, { data: w }, { data: consent }, { count: nCount }, { count: mCount }] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, role, city_id, height_cm, banned_at").eq("id", user.id).single(),
    supabase.from("wallets").select("balance").eq("user_id", user.id).single(),
    supabase.from("consents").select("id").eq("user_id", user.id).eq("type", "kvkk_terms").eq("granted", true).limit(1),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null).neq("type", "message"),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).is("read_at", null),
  ]);
  if ((p as { banned_at?: string | null } | null)?.banned_at) redirect("/askida");
  if (!consent?.length) redirect("/kayit-tamamla");
  const me = { ...(p as object), balance: w?.balance ?? 0, unread_notifications: nCount ?? 0, unread_messages: mCount ?? 0 } as Me;
  return { supabase, me };
}

export async function requireAdmin(next = "/admin") {
  const r = await requireMe(next);
  if (r.me.role !== "admin") redirect("/hesap");
  return r;
}
