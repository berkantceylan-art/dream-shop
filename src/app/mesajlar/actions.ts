"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function sendMessageAction(to: string, body: string): Promise<{ error?: string; id?: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_message", { p_to: to, p_body: body });
  if (error) return { error: error.message };
  revalidatePath("/mesajlar");
  return { id: Number(data) };
}

export async function markReadAction(other: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.rpc("mark_conversation_read", { p_other: other });
  if (user) await supabase.from("notifications").update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id).eq("actor_id", other).eq("type", "message").is("read_at", null);
}
