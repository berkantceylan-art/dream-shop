"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Filters = Record<string, string | number | undefined>;
export type Row = { label: string; users: number; events?: number };

const clean = (f: Filters) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "" && v !== undefined && v !== null));

export async function runReport(kind: "interest" | "profile", f: Filters): Promise<{ rows?: Row[]; size?: number | null; error?: string }> {
  const supabase = await createClient();
  const filters = clean(f);
  const [{ data, error }, { data: size }] = await Promise.all([
    supabase.rpc(kind === "interest" ? "report_interest" : "report_profile", { f: filters }),
    supabase.rpc("report_segment_size", { f: filters }),
  ]);
  if (error) return { error: error.message };
  return { rows: (data ?? []).map((r: Row) => ({ ...r, users: Number(r.users), events: r.events != null ? Number(r.events) : undefined })), size: size as number | null };
}

export type ApplyState = { error?: string; ok?: boolean };
export async function applyBuyerAction(_: ApplyState, form: FormData): Promise<ApplyState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Giriş gerekli" };
  if (form.get("terms") !== "on") return { error: "Veri kullanım sözleşmesini kabul etmelisin." };
  const company = String(form.get("company") || "").trim();
  if (company.length < 2) return { error: "Şirket adı gerekli." };
  const id = crypto.randomUUID();
  const { error } = await supabase.from("data_buyers").insert({
    id, company, tax_no: String(form.get("tax_no") || "") || null, contact_email: String(form.get("email") || "") || null,
    sector: String(form.get("sector") || "") || null, purpose: String(form.get("purpose") || "").slice(0, 1000) || null,
    created_by: user.id, approved: false,
  });
  if (error) return { error: error.message };
  await supabase.from("data_buyer_members").insert({ buyer_id: id, user_id: user.id });
  revalidatePath("/rapor");
  return { ok: true };
}
