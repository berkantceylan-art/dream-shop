"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Filters = Record<string, string | number | undefined>;
export type ReportKind = "overview" | "price" | "funnel" | "brand" | "persona" | "variants" | "time" | "interest" | "profile";

const RPC: Record<ReportKind, string> = {
  overview: "report_overview", price: "report_price", funnel: "report_funnel", brand: "report_brand", persona: "report_persona",
  variants: "report_variants", time: "report_time", interest: "report_interest", profile: "report_profile",
};
const clean = (f: Filters) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "" && v !== undefined && v !== null));

export async function runReport(kind: ReportKind, f: Filters): Promise<{ data?: unknown; error?: string; account?: unknown }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(RPC[kind], { f: clean(f) });
  const { data: account } = await supabase.rpc("my_report_account");
  if (error) return { error: error.message, account };
  return { data, account };
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
    plan_id: String(form.get("plan") || "") || null, created_by: user.id, approved: false,
  });
  if (error) return { error: error.message };
  await supabase.from("data_buyer_members").insert({ buyer_id: id, user_id: user.id });
  revalidatePath("/rapor");
  return { ok: true };
}
