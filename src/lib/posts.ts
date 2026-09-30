import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "./catalog";

export type PostRow = {
  id: number; author_id: string; body: string | null; images: string[]; item_id: string | null; product_id: string | null;
  kind: string; visibility: "public" | "followers"; like_count: number; comment_count: number; city_id: number | null; created_at: string;
};
export type Author = { id: string; username: string; display_name: string | null; role: string; cover_color: string };
export type PostView = PostRow & {
  author: Author; liked: boolean; saved: boolean; mine: boolean; pinned: boolean;
  product: Pick<Product, "id" | "name" | "brand" | "kind" | "thumbnail_url" | "attributes" | "credit_price"> | null;
  city: string | null;
};

export const POST_COLS = "id, author_id, body, images, item_id, product_id, kind, visibility, like_count, comment_count, city_id, created_at";

export const COVERS: Record<string, string> = {
  crystal: "from-crystal-light via-crystal to-[#7a1fb8]",
  sky: "from-[#a5d8ff] via-[#4dabf7] to-[#1c7ed6]",
  sunset: "from-[#ffd43b] via-[#ff922b] to-[#ff6b6b]",
  mint: "from-[#c3fae8] via-[#3ddc97] to-[#0ca678]",
  night: "from-[#364fc7] via-[#1e2a4a] to-[#141b3d]",
  peach: "from-[#fff0f6] via-[#ffc9c9] to-[#ff8787]",
};

/** Ham gönderileri yazar, beğeni, kaydetme ve ürün bilgisiyle zenginleştirir */
export async function hydratePosts(supabase: SupabaseClient, meId: string, rows: PostRow[]): Promise<PostView[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const authorIds = [...new Set(rows.map((r) => r.author_id))];
  const productIds = [...new Set(rows.map((r) => r.product_id).filter(Boolean))] as string[];
  const cityIds = [...new Set(rows.map((r) => r.city_id).filter(Boolean))] as number[];
  const [{ data: authors }, { data: likes }, { data: saves }, { data: products }, { data: cities }] = await Promise.all([
    supabase.from("public_profiles").select("id, username, display_name, role, cover_color, pinned_post_id").in("id", authorIds),
    supabase.from("post_likes").select("post_id").eq("user_id", meId).in("post_id", ids),
    supabase.from("post_saves").select("post_id").eq("user_id", meId).in("post_id", ids),
    productIds.length ? supabase.from("products").select("id, name, brand, kind, thumbnail_url, attributes, credit_price").in("id", productIds) : Promise.resolve({ data: [] }),
    cityIds.length ? supabase.from("cities").select("id, name").in("id", cityIds) : Promise.resolve({ data: [] }),
  ]);
  const A = new Map((authors ?? []).map((a) => [a.id, a]));
  const L = new Set((likes ?? []).map((l) => l.post_id));
  const S = new Set((saves ?? []).map((s) => s.post_id));
  const P = new Map((products ?? []).map((p) => [p.id, p]));
  const C = new Map((cities ?? []).map((c) => [c.id, c.name]));
  return rows.filter((r) => A.has(r.author_id)).map((r) => {
    const a = A.get(r.author_id)!;
    return {
      ...r, author: a as Author, liked: L.has(r.id), saved: S.has(r.id), mine: r.author_id === meId,
      pinned: a.pinned_post_id === r.id, product: r.product_id ? (P.get(r.product_id) as PostView["product"]) ?? null : null,
      city: r.city_id ? C.get(r.city_id) ?? null : null,
    };
  });
}

export const ago = (d: string) => {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "şimdi";
  if (m < 60) return `${m} dk`;
  if (m < 1440) return `${Math.floor(m / 60)} sa`;
  if (m < 10080) return `${Math.floor(m / 1440)} g`;
  return new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
};
