"use server";
import { createClient } from "@/lib/supabase/server";
import { QUEST_FIELDS } from "@/lib/quests";

export async function submitQuest(id: string, values: Record<string, unknown>): Promise<{ error?: string; reward?: number }> {
  const fields = QUEST_FIELDS[id];
  if (!fields) return { error: "Görev bulunamadı." };

  // Sadece bu göreve ait alanlar yazılabilir
  const patch: Record<string, unknown> = {};
  for (const f of fields) {
    let v = values[f.key];
    if (f.type === "number") v = v === "" || v == null ? null : Number(v);
    if (f.key === "children_count") v = v === "" || v == null ? null : Number(v);
    if (f.type === "bool") v = v === "true" ? true : v === "false" ? false : null;
    if (f.type === "phone" && typeof v === "string") v = "+90" + v.replace(/\D/g, "").replace(/^(90|0)/, "");
    if (v === "") v = null;
    patch[f.key] = v;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const { error: uErr } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (uErr) return { error: "Bilgiler kaydedilemedi: " + uErr.message };

  const { data, error } = await supabase.rpc("claim_quest", { p_quest: id });
  if (error) {
    if (error.message.includes("zaten")) return { reward: 0 }; // bilgiler güncellendi, ödül önceden alınmış
    return { error: error.message };
  }
  return { reward: Number(data) };
}
