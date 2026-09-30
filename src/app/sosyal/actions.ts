"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hydratePosts, POST_COLS, type PostRow, type PostView } from "@/lib/posts";
import { fetchFeed } from "@/lib/feed";

async function ctx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, me: user?.id ?? "" };
}

export async function createPostAction(input: { body: string; images: string[]; itemId: string | null; visibility: "public" | "followers" }): Promise<{ error?: string; post?: PostView }> {
  const { supabase, me } = await ctx(); if (!me) return { error: "Giriş gerekli" };
  const body = input.body.trim().slice(0, 2200);
  let productId: string | null = null;
  if (input.itemId) {
    const { data } = await supabase.from("inventory_items").select("product_id").eq("id", input.itemId).eq("owner_id", me).maybeSingle();
    productId = data?.product_id ?? null;
  }
  if (!body && !input.images.length && !productId) return { error: "Bir şey yaz, fotoğraf ekle ya da eşya iliştir." };
  const { data, error } = await supabase.from("posts").insert({
    author_id: me, body: body || null, images: input.images.slice(0, 4), item_id: productId ? input.itemId : null, product_id: productId, visibility: input.visibility,
  }).select(POST_COLS).single();
  if (error) return { error: error.message };
  revalidatePath("/sosyal");
  const [post] = await hydratePosts(supabase, me, [data as PostRow]);
  return { post };
}

export async function deletePostAction(id: number) {
  const { supabase } = await ctx();
  await supabase.from("posts").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/sosyal");
}

export async function pinPostAction(id: number | null) {
  const { supabase, me } = await ctx(); if (!me) return;
  await supabase.from("profiles").update({ pinned_post_id: id }).eq("id", me);
  revalidatePath("/u", "layout");
}

export async function likeAction(id: number, on: boolean) {
  const { supabase, me } = await ctx(); if (!me) return;
  if (on) await supabase.from("post_likes").insert({ post_id: id, user_id: me });
  else await supabase.from("post_likes").delete().eq("post_id", id).eq("user_id", me);
}

export async function saveAction(id: number, on: boolean) {
  const { supabase, me } = await ctx(); if (!me) return;
  if (on) await supabase.from("post_saves").insert({ post_id: id, user_id: me });
  else await supabase.from("post_saves").delete().eq("post_id", id).eq("user_id", me);
}

export type CommentView = { id: number; body: string; created_at: string; author: { id: string; username: string; display_name: string | null }; mine: boolean };

export async function getCommentsAction(postId: number): Promise<CommentView[]> {
  const { supabase, me } = await ctx();
  const { data } = await supabase.from("post_comments").select("id, body, created_at, author_id").eq("post_id", postId).order("created_at").limit(200);
  const ids = [...new Set((data ?? []).map((c) => c.author_id))];
  const { data: people } = ids.length ? await supabase.from("public_profiles").select("id, username, display_name").in("id", ids) : { data: [] };
  const P = new Map((people ?? []).map((p) => [p.id, p]));
  return (data ?? []).filter((c) => P.has(c.author_id)).map((c) => ({ id: c.id, body: c.body, created_at: c.created_at, author: P.get(c.author_id)!, mine: c.author_id === me }));
}

export async function addCommentAction(postId: number, body: string): Promise<{ error?: string }> {
  const { supabase, me } = await ctx(); if (!me) return { error: "Giriş gerekli" };
  const text = body.trim().slice(0, 1000); if (!text) return {};
  const { error } = await supabase.from("post_comments").insert({ post_id: postId, author_id: me, body: text });
  return error ? { error: "Yorum yapılamadı." } : {};
}

export async function deleteCommentAction(id: number) {
  const { supabase } = await ctx();
  await supabase.from("post_comments").update({ deleted_at: new Date().toISOString() }).eq("id", id);
}

export async function reportPostAction(authorId: string, postId: number, reason: string) {
  const { supabase, me } = await ctx(); if (!me) return;
  await supabase.from("user_reports").insert({ reporter_id: me, reported_id: authorId, reason, details: `Gönderi #${postId}` });
}

export async function loadFeedAction(tab: string, offset: number, cityId: number | null): Promise<PostView[]> {
  const { supabase, me } = await ctx(); if (!me) return [];
  return fetchFeed(supabase, me, tab, offset, cityId);
}

// ---- Hikâyeler ----
export async function createStoryAction(input: { text: string; image: string | null; bg: string }): Promise<{ error?: string }> {
  const { supabase, me } = await ctx(); if (!me) return { error: "Giriş gerekli" };
  const { error } = await supabase.from("stories").insert({ author_id: me, text: input.text.trim().slice(0, 200) || null, image_url: input.image, bg: input.bg });
  revalidatePath("/sosyal");
  return error ? { error: error.message } : {};
}
export async function viewStoryAction(id: number) {
  const { supabase, me } = await ctx(); if (!me) return;
  await supabase.from("story_views").upsert({ story_id: id, viewer_id: me });
}
export async function deleteStoryAction(id: number) {
  const { supabase } = await ctx();
  await supabase.from("stories").delete().eq("id", id);
  revalidatePath("/sosyal");
}

