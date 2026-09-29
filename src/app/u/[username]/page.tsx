import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe } from "@/lib/session";
import { getPublicProfile, relation, canSeeHome, canMessage } from "@/lib/social";
import { heightScale, normalizeAvatar } from "@/lib/avatar";
import { homeOf, HOME_SIZES } from "@/lib/home";
import type { Product } from "@/lib/catalog";
import AppHeader from "@/components/AppHeader";
import { AvatarStageLazy } from "@/components/3d/Lazy";
import { FollowButton, MoreMenu } from "./SocialButtons";

const ROLE_BADGE: Record<string, string> = { store_owner: "🏪 Mağaza sahibi", admin: "🛠️ Dream Shop ekibi" };

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { supabase, me } = await requireMe(`/u/${username}`);
  const p = await getPublicProfile(supabase, decodeURIComponent(username));
  if (!p) notFound();
  const isMe = p.id === me.id;

  const [rel, { data: avatar }, { data: city }, { count: followers }, { count: following }, { count: items }, { count: cars },
    { data: home }, { count: likes }] = await Promise.all([
    isMe ? Promise.resolve({ iFollow: false, followsMe: false, iBlocked: false }) : relation(supabase, me.id, p.id),
    supabase.from("avatars").select("config").eq("user_id", p.id).maybeSingle(),
    supabase.from("cities").select("name").eq("id", p.city_id ?? 0).maybeSingle(),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", p.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", p.id),
    supabase.from("inventory_items").select("id", { count: "exact", head: true }).eq("owner_id", p.id).eq("status", "owned"),
    supabase.from("inventory_items").select("id, products!inner(kind)", { count: "exact", head: true }).eq("owner_id", p.id).eq("status", "owned").eq("products.kind", "car"),
    p.home_item_id ? supabase.from("inventory_items").select("products(id, name, attributes, credit_price)").eq("id", p.home_item_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("home_likes").select("*", { count: "exact", head: true }).eq("owner_id", p.id),
  ]);
  const homeProduct = (home as { products: Product } | null)?.products;
  const homeLabel = homeProduct ? `${homeProduct.name} (${HOME_SIZES[homeOf(homeProduct).size].label})` : "Başlangıç stüdyosu";
  const seeHome = canSeeHome(p, isMe, rel.followsMe);
  const msgOk = !isMe && !rel.iBlocked && canMessage(p, rel.followsMe);
  const since = new Date(p.created_at).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#efe3ff] to-cream">
      <AppHeader me={me} />
      <main className="mx-auto max-w-4xl p-4 pb-16">
        <div className="game-panel flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-start">
          {avatar
            ? <AvatarStageLazy config={normalizeAvatar(avatar.config)} scale={heightScale(null)} interactive={false} className="h-72 w-52 shrink-0" />
            : <div className="grid h-40 w-40 shrink-0 place-items-center rounded-full bg-gradient-to-b from-crystal-light to-crystal font-display text-6xl text-white">{p.username[0].toUpperCase()}</div>}
          <div className="w-full flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-4xl font-bold">{p.display_name || p.username}</h1>
              {ROLE_BADGE[p.role] && <span className="chip !py-0.5 text-xs">{ROLE_BADGE[p.role]}</span>}
            </div>
            <p className="font-semibold text-ink/60">@{p.username} · 📍 {city?.name ?? "—"} · {since}'den beri</p>
            {rel.followsMe && <p className="mt-1 inline-block rounded-full bg-[#eef1f6] px-2 text-xs font-bold text-ink/60">Seni takip ediyor</p>}
            {p.bio && <p className="mt-3 whitespace-pre-wrap">{p.bio}</p>}

            <div className="mt-4 flex gap-6 text-center">
              <Link href={`/u/${p.username}/baglantilar?liste=takipci`}><b className="block font-display text-2xl">{followers ?? 0}</b><span className="text-xs font-bold text-ink/50">takipçi</span></Link>
              <Link href={`/u/${p.username}/baglantilar?liste=takip`}><b className="block font-display text-2xl">{following ?? 0}</b><span className="text-xs font-bold text-ink/50">takip</span></Link>
              <div><b className="block font-display text-2xl">{items ?? 0}</b><span className="text-xs font-bold text-ink/50">eşya</span></div>
              <div><b className="block font-display text-2xl">{cars ?? 0}</b><span className="text-xs font-bold text-ink/50">araba</span></div>
              <div><b className="block font-display text-2xl">{likes ?? 0}</b><span className="text-xs font-bold text-ink/50">ev ❤️</span></div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {isMe ? (
                <>
                  <Link href="/profil?tab=ayarlar" className="game-btn ghost !py-2">Profili düzenle</Link>
                  <Link href="/evim" className="game-btn !py-2">🏡 Evim</Link>
                </>
              ) : rel.iBlocked ? (
                <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">Bu kullanıcıyı engelledin.</p>
              ) : (
                <>
                  <FollowButton target={p.id} initial={rel.iFollow} followsMe={rel.followsMe} />
                  {msgOk && <Link href={`/mesajlar?k=${p.username}`} className="game-btn ghost !py-2">💬 Mesaj</Link>}
                  {seeHome && <Link href={`/u/${p.username}/ev`} className="game-btn mint !py-2">🏡 Evini ziyaret et</Link>}
                </>
              )}
              {!isMe && <MoreMenu target={p.id} username={p.username} blocked={rel.iBlocked} />}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="game-panel p-5">
            <p className="text-sm font-bold text-ink/50">🏡 Yaşadığı yer</p>
            <p className="font-display text-xl font-bold">{seeHome ? homeLabel : "Gizli"}</p>
            {seeHome && !isMe && <Link href={`/u/${p.username}/ev`} className="mt-2 inline-block text-sm font-bold text-crystal">İçeri gir →</Link>}
          </div>
          <div className="game-panel p-5">
            <p className="text-sm font-bold text-ink/50">💬 Mesaj ayarı</p>
            <p className="font-display text-xl font-bold">
              {p.dm_policy === "everyone" ? "Herkesten mesaj alıyor" : p.dm_policy === "followers" ? "Takip ettiklerinden mesaj alıyor" : "Mesaj kapalı"}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
