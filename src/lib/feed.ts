import type { SupabaseClient } from "@supabase/supabase-js";
import { hydratePosts, POST_COLS, type PostRow } from "./posts";

// ---- Akış sorguları ----
export async function fetchFeed(supabase: SupabaseClient, me: string, tab: string, offset: number, cityId: number | null) {
  const SIZE = 15;
  let rows: PostRow[] = [];
  if (tab === "kesfet") {
    const { data } = await supabase.rpc("explore_posts", { p_limit: SIZE, p_offset: offset });
    rows = (data ?? []) as PostRow[];
  } else {
    let q = supabase.from("posts").select(POST_COLS).is("deleted_at", null).order("created_at", { ascending: false }).range(offset, offset + SIZE - 1);
    if (tab === "sehir") q = q.eq("city_id", cityId ?? 34);
    else {
      const { data: f } = await supabase.from("follows").select("following_id").eq("follower_id", me);
      q = q.in("author_id", [me, ...(f ?? []).map((x) => x.following_id)]);
    }
    const { data } = await q;
    rows = (data ?? []) as PostRow[];
  }
  return hydratePosts(supabase, me, rows);
}
