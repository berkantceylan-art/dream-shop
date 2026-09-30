"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Filters = Record<string, string | number | undefined>;
export type ReportKind = "overview" | "price" | "funnel" | "brand" | "persona" | "variants" | "time" | "interest" | "profile" | "geo" | "basket" | "reasons" | "survey";

const RPC: Record<ReportKind, string> = {
  overview: "report_overview", price: "report_price", funnel: "report_funnel", brand: "report_brand", persona: "report_persona",
  variants: "report_variants", time: "report_time", interest: "report_interest", profile: "report_profile",
  geo: "report_geo", basket: "report_basket", reasons: "report_reasons", survey: "",
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

// ---- Kayıtlı raporlar ----
export async function listSavedAction() {
  const supabase = await createClient();
  const { data } = await supabase.from("saved_reports").select("id, name, kind, filters, created_at").order("created_at", { ascending: false }).limit(50);
  return (data ?? []) as { id: number; name: string; kind: ReportKind; filters: Filters; created_at: string }[];
}
export async function saveReportAction(name: string, kind: ReportKind, filters: Filters) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("saved_reports").insert({ user_id: user.id, name: name.slice(0, 80), kind, filters: clean(filters) });
}
export async function deleteSavedAction(id: number) {
  const supabase = await createClient();
  await supabase.from("saved_reports").delete().eq("id", id);
}

// ---- Sponsorlu anketler ----
export type Survey = { id: number; question: string; options: string[]; reward: number; max_responses: number; responses: number; status: string; created_at: string; target: Filters };
export async function listSurveysAction(): Promise<Survey[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("surveys").select("id, question, options, reward, max_responses, responses, status, created_at, target").order("created_at", { ascending: false }).limit(50);
  return (data ?? []) as Survey[];
}
export async function createSurveyAction(input: { question: string; options: string[]; target: Filters; reward: number; max: number }): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_survey", { p_question: input.question, p_options: input.options, p_target: clean(input.target), p_reward: input.reward, p_max: input.max });
  return error ? { error: error.message } : {};
}
export async function surveyResultsAction(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("survey_results", { p_survey: id });
  return error ? { error: error.message } : { data };
}
