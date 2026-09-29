"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function uid() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, me: user?.id };
}
const refresh = () => { revalidatePath("/u", "layout"); revalidatePath("/sosyal"); };

export async function followAction(target: string, on: boolean): Promise<{ error?: string }> {
  const { supabase, me } = await uid(); if (!me) return { error: "Giriş gerekli" };
  const { error } = on
    ? await supabase.from("follows").insert({ follower_id: me, following_id: target })
    : await supabase.from("follows").delete().eq("follower_id", me).eq("following_id", target);
  refresh();
  return error && error.code !== "23505" ? { error: "İşlem yapılamadı" } : {};
}

export async function removeFollowerAction(follower: string) {
  const { supabase, me } = await uid(); if (!me) return;
  await supabase.from("follows").delete().eq("follower_id", follower).eq("following_id", me);
  refresh();
}

export async function blockAction(target: string, on: boolean) {
  const { supabase, me } = await uid(); if (!me) return;
  if (on) await supabase.from("blocks").insert({ blocker_id: me, blocked_id: target });
  else await supabase.from("blocks").delete().eq("blocker_id", me).eq("blocked_id", target);
  refresh();
}

export async function reportUserAction(target: string, reason: string, details: string): Promise<{ ok?: boolean; error?: string }> {
  const { supabase, me } = await uid(); if (!me) return { error: "Giriş gerekli" };
  const { error } = await supabase.from("user_reports").insert({ reporter_id: me, reported_id: target, reason, details: details.slice(0, 1000) || null });
  return error ? { error: error.message } : { ok: true };
}

export async function likeHomeAction(owner: string, on: boolean) {
  const { supabase, me } = await uid(); if (!me) return;
  if (on) await supabase.from("home_likes").insert({ owner_id: owner, liker_id: me });
  else await supabase.from("home_likes").delete().eq("owner_id", owner).eq("liker_id", me);
  refresh();
}
