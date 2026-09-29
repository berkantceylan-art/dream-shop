"use server";
import { createClient } from "@/lib/supabase/server";
import { normalizeAvatar, type AvatarConfig } from "@/lib/avatar";

export async function saveAvatar(config: AvatarConfig): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı." };
  const { error } = await supabase.from("avatars").upsert({
    user_id: user.id,
    config: normalizeAvatar(config),
    updated_at: new Date().toISOString(),
  });
  return error ? { error: error.message } : {};
}
