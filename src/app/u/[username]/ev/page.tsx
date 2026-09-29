import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe } from "@/lib/session";
import { getPublicProfile, relation, canSeeHome } from "@/lib/social";
import { PRODUCT_COLS, type Product } from "@/lib/catalog";
import { normalizeAvatar } from "@/lib/avatar";
import { HOME_SIZES, STARTER_HOME, autoPlace, carOf, furnitureOf, homeOf } from "@/lib/home";
import AppHeader from "@/components/AppHeader";
import { HomeSceneLazy } from "@/components/3d/Lazy";
import { LikeHomeButton, FollowButton } from "../SocialButtons";

const HIDDEN = new Set([11, 12]);

export default async function VisitHomePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { supabase, me } = await requireMe(`/u/${username}/ev`);
  const p = await getPublicProfile(supabase, decodeURIComponent(username));
  if (!p) notFound();
  const isMe = p.id === me.id;
  const rel = isMe ? { iFollow: false, followsMe: false, iBlocked: false } : await relation(supabase, me.id, p.id);

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gradient-to-b from-[#fff1c7] to-cream">
      <AppHeader me={me} />
      <main className="mx-auto max-w-7xl p-4 pb-16">{children}</main>
    </div>
  );
  if (!canSeeHome(p, isMe, rel.followsMe) || rel.iBlocked)
    return shell(
      <div className="game-panel mx-auto max-w-lg p-10 text-center">
        <p className="text-6xl">🔒</p>
        <p className="mt-3 font-display text-2xl font-bold">@{p.username} evini herkese açmamış</p>
        {p.home_visibility === "followers" && <p className="mt-1 font-semibold text-ink/60">Yalnızca takip ettiği kişiler ziyaret edebilir.</p>}
        <Link href={`/u/${p.username}`} className="game-btn mt-6">Profile dön</Link>
      </div>);

  const [{ data: inv }, { data: layout }, { data: avatar }, { count: likes }, { data: liked }] = await Promise.all([
    supabase.from("inventory_items").select(`id, products(${PRODUCT_COLS})`).eq("owner_id", p.id).eq("status", "owned"),
    supabase.from("home_layout").select("item_id, x, z, rot").eq("owner_id", p.id),
    supabase.from("avatars").select("config").eq("user_id", p.id).maybeSingle(),
    supabase.from("home_likes").select("*", { count: "exact", head: true }).eq("owner_id", p.id),
    supabase.from("home_likes").select("liker_id").eq("owner_id", p.id).eq("liker_id", me.id).maybeSingle(),
  ]);
  const items = ((inv ?? []) as unknown as { id: string; products: Product | null }[]).filter((i) => i.products) as { id: string; products: Product }[];
  const house = items.find((i) => i.id === p.home_item_id) ?? items.find((i) => i.products.kind === "house");
  const car = items.find((i) => i.id === p.car_item_id) ?? items.find((i) => i.products.kind === "car");
  const h = house ? homeOf(house.products) : { size: STARTER_HOME.size, color: STARTER_HOME.color };
  const dims = HOME_SIZES[h.size];
  const pos = new Map((layout ?? []).map((l) => [l.item_id, l]));
  let auto = 0;
  const decor = items.filter((i) => (i.products.kind === "furniture" || i.products.kind === "other") && !HIDDEN.has(i.products.category_id))
    .map((i) => { const f = furnitureOf(i.products); const q = pos.get(i.id) ?? autoPlace(auto++, dims.w, dims.d);
      return { id: i.id, type: f.type, color: f.color, x: q.x, z: q.z, rot: q.rot }; });

  return shell(
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href={`/u/${p.username}`} className="text-sm font-bold text-crystal">← @{p.username}</Link>
          <h1 className="font-display text-4xl font-bold">🏡 {p.display_name || p.username}&apos;in evi</h1>
          <p className="font-semibold text-ink/60">{house ? house.products.name : STARTER_HOME.name} · {decor.length} eşya</p>
        </div>
        {!isMe && (
          <div className="flex gap-2">
            <LikeHomeButton owner={p.id} initial={!!liked} count={likes ?? 0} />
            <FollowButton target={p.id} initial={rel.iFollow} followsMe={rel.followsMe} />
          </div>
        )}
      </div>
      <div className="game-panel h-[70vh] overflow-hidden">
        <HomeSceneLazy size={h.size} wallColor={h.color} items={decor} avatar={avatar ? normalizeAvatar(avatar.config) : null}
          car={dims.garden && car ? carOf(car.products) : null} className="h-full w-full" />
      </div>
    </>);
}
