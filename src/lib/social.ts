import type { SupabaseClient } from "@supabase/supabase-js";

export type PublicProfile = {
  id: string; username: string; display_name: string | null; city_id: number | null; bio: string | null;
  dm_policy: "everyone" | "followers" | "none"; home_visibility: "everyone" | "followers" | "none";
  home_item_id: string | null; car_item_id: string | null; created_at: string; role: string;
  cover_color: string; pinned_post_id: number | null;
};

export const PUBLIC_COLS = "id, username, display_name, city_id, bio, dm_policy, home_visibility, home_item_id, car_item_id, created_at, role, cover_color, pinned_post_id";

export async function getPublicProfile(supabase: SupabaseClient, username: string) {
  const { data } = await supabase.from("public_profiles").select(PUBLIC_COLS).eq("username", username.toLowerCase()).maybeSingle();
  return data as PublicProfile | null;
}

/** Ben → o ve o → ben takip / engel durumu */
export async function relation(supabase: SupabaseClient, me: string, other: string) {
  const [{ data: f1 }, { data: f2 }, { data: b }] = await Promise.all([
    supabase.from("follows").select("follower_id").eq("follower_id", me).eq("following_id", other).maybeSingle(),
    supabase.from("follows").select("follower_id").eq("follower_id", other).eq("following_id", me).maybeSingle(),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", me).eq("blocked_id", other).maybeSingle(),
  ]);
  return { iFollow: !!f1, followsMe: !!f2, iBlocked: !!b };
}

export function canSeeHome(p: PublicProfile, isMe: boolean, followsMe: boolean) {
  return isMe || p.home_visibility === "everyone" || (p.home_visibility === "followers" && followsMe);
}
export function canMessage(p: PublicProfile, followsMe: boolean) {
  return p.dm_policy === "everyone" || (p.dm_policy === "followers" && followsMe);
}
