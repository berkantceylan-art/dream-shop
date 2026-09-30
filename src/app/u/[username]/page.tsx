import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe } from "@/lib/session";
import { getPublicProfile, relation, canSeeHome, canMessage } from "@/lib/social";
import { heightScale, normalizeAvatar } from "@/lib/avatar";
import { homeOf, HOME_SIZES, carOf, CAR_SHAPES } from "@/lib/home";
import { COVERS, hydratePosts, POST_COLS, type PostRow, type PostView } from "@/lib/posts";
import { KIND_META, type Product } from "@/lib/catalog";
import AppHeader from "@/components/AppHeader";
import { AvatarStageLazy } from "@/components/3d/Lazy";
import { ProductThumb } from "@/components/ProductCard";
import Credits from "@/components/Credits";
import PostCard from "@/components/social/PostCard";
import { FollowButton, MoreMenu } from "./SocialButtons";

const ROLE_BADGE: Record<string, string> = { store_owner: "🏪 Mağaza sahibi", admin: "🛠️ Dream Shop ekibi", data_buyer: "📊 Kurumsal" };

export default async function UserPage({ params, searchParams }: {
  params: Promise<{ username: string }>; searchParams: Promise<{ sekme?: string; gorunum?: string }>;
}) {
  const { username } = await params;
  const { sekme = "gonderiler", gorunum = "izgara" } = await searchParams;
  const { supabase, me } = await requireMe(`/u/${username}`);
  const p = await getPublicProfile(supabase, decodeURIComponent(username));
  if (!p) notFound();
  const isMe = p.id === me.id;
  const cover = p.cover_color ?? "crystal";
  const pinnedId = p.pinned_post_id ?? null;

  const [rel, { data: avatar }, { data: city }, { count: followers }, { count: following }, { count: postCount }, { count: likes }] = await Promise.all([
    isMe ? Promise.resolve({ iFollow: false, followsMe: false, iBlocked: false }) : relation(supabase, me.id, p.id),
    supabase.from("avatars").select("config").eq("user_id", p.id).maybeSingle(),
    supabase.from("cities").select("name").eq("id", p.city_id ?? 0).maybeSingle(),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", p.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", p.id),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", p.id).is("deleted_at", null),
    supabase.from("home_likes").select("*", { count: "exact", head: true }).eq("owner_id", p.id),
  ]);
  const seeHome = canSeeHome(p, isMe, rel.followsMe);
  const msgOk = !isMe && !rel.iBlocked && canMessage(p, rel.followsMe);
  const since = new Date(p.created_at).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

  const TABS = [
    { id: "gonderiler", label: "Gönderiler", icon: "▦" },
    { id: "vitrin", label: "Vitrin", icon: "✨" },
    ...(isMe ? [{ id: "kaydedilenler", label: "Kaydedilenler", icon: "🔖" }] : []),
    { id: "hakkinda", label: "Hakkında", icon: "ℹ️" },
  ];
  const tab = TABS.some((t) => t.id === sekme) ? sekme : "gonderiler";

  // ---- Sekme içeriği ----
  let content: React.ReactNode = null;
  if (tab === "gonderiler" || tab === "kaydedilenler") {
    let rows: PostRow[] = [];
    if (tab === "gonderiler") {
      const { data } = await supabase.from("posts").select(POST_COLS).eq("author_id", p.id).is("deleted_at", null).order("created_at", { ascending: false }).limit(60);
      rows = (data ?? []) as PostRow[];
      if (pinnedId) rows.sort((a, b) => Number(b.id === pinnedId) - Number(a.id === pinnedId));
    } else {
      const { data: saved } = await supabase.from("post_saves").select("post_id").eq("user_id", me.id).order("created_at", { ascending: false }).limit(60);
      const ids = (saved ?? []).map((s) => s.post_id);
      const { data } = ids.length ? await supabase.from("posts").select(POST_COLS).in("id", ids).is("deleted_at", null) : { data: [] };
      rows = ((data ?? []) as PostRow[]).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    }
    const posts = await hydratePosts(supabase, me.id, rows);
    content = !posts.length ? (
      <div className="game-panel !rounded-3xl p-10 text-center">
        <p className="text-5xl">{tab === "kaydedilenler" ? "🔖" : "📷"}</p>
        <p className="mt-2 font-display text-xl font-bold">{tab === "kaydedilenler" ? "Kaydettiğin gönderi yok" : isMe ? "İlk gönderini paylaş" : "Henüz gönderi yok"}</p>
        {isMe && tab === "gonderiler" && <Link href="/sosyal" className="game-btn mt-4">Paylaşım yap</Link>}
      </div>
    ) : (
      <>
        <div className="mb-3 flex justify-end gap-1">
          <Link href={`?sekme=${tab}&gorunum=izgara`} className="chip" data-on={gorunum !== "liste"}>▦ Izgara</Link>
          <Link href={`?sekme=${tab}&gorunum=liste`} className="chip" data-on={gorunum === "liste"}>☰ Liste</Link>
        </div>
        {gorunum === "liste"
          ? <div className="flex flex-col gap-4">{posts.map((x) => <PostCard key={x.id} p={x} isAdmin={me.role === "admin"} />)}</div>
          : <Grid posts={posts} pinnedId={tab === "gonderiler" ? pinnedId : null} />}
      </>
    );
  }

  if (tab === "vitrin") {
    const { data: inv } = await supabase.from("inventory_items")
      .select("id, paid_credits, products(id, name, brand, kind, thumbnail_url, attributes, credit_price)")
      .eq("owner_id", p.id).eq("status", "owned").order("paid_credits", { ascending: false }).limit(60);
    const items = ((inv ?? []) as unknown as { id: string; paid_credits: number; products: Product | null }[]).filter((i) => i.products);
    const home = items.find((i) => i.id === p.home_item_id) ?? items.find((i) => i.products!.kind === "house");
    const cars = items.filter((i) => i.products!.kind === "car");
    const rest = items.filter((i) => i.products!.kind !== "house" && i.products!.kind !== "car").slice(0, 12);
    const total = items.reduce((a, i) => a + Number(i.paid_credits), 0);
    content = (
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="game-panel !rounded-3xl p-5">
            <p className="text-sm font-bold text-ink/50">🏡 Yaşadığı yer</p>
            <p className="font-display text-2xl font-bold">{!seeHome ? "Gizli" : home ? home.products!.name : "Başlangıç stüdyosu"}</p>
            {seeHome && home && <p className="text-sm font-semibold text-ink/60">{HOME_SIZES[homeOf(home.products!).size].label}</p>}
            {seeHome && <Link href={isMe ? "/evim" : `/u/${p.username}/ev`} className="game-btn mint mt-3 !py-2">🏡 {isMe ? "Evime git" : "Evi ziyaret et"} · ❤️ {likes ?? 0}</Link>}
          </div>
          <div className="game-panel !rounded-3xl p-5">
            <p className="text-sm font-bold text-ink/50">💎 Koleksiyon değeri</p>
            <p className="font-display text-2xl font-bold"><Credits amount={total} /></p>
            <p className="text-sm font-semibold text-ink/60">{items.length} eşya · {cars.length} araba</p>
          </div>
        </div>
        {cars.length > 0 && (
          <section className="game-panel !rounded-3xl p-5">
            <h3 className="mb-3 font-display text-xl font-bold">🚗 Garaj</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {cars.map((c) => {
                const car = carOf(c.products!);
                return (
                  <div key={c.id} className="rounded-2xl bg-white p-3 text-center">
                    <div className="mx-auto mb-2 h-10 w-20 rounded-xl" style={{ background: car.color, boxShadow: "inset 0 -8px 0 #0002" }} />
                    <p className="truncate text-sm font-bold">{c.products!.name}</p>
                    <p className="text-xs font-semibold text-ink/50">{CAR_SHAPES[car.shape]}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        {rest.length > 0 && (
          <section className="game-panel !rounded-3xl p-5">
            <h3 className="mb-3 font-display text-xl font-bold">✨ Öne çıkan eşyalar</h3>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {rest.map((i) => (
                <div key={i.id} title={i.products!.name}>
                  <ProductThumb p={i.products!} className="!text-3xl" />
                  <p className="mt-1 truncate text-xs font-bold">{i.products!.name}</p>
                  <p className="text-[10px] font-semibold text-ink/50">{KIND_META[i.products!.kind].label}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  if (tab === "hakkinda") {
    content = (
      <div className="game-panel !rounded-3xl p-6">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="font-bold text-ink/50">📍 Şehir</dt><dd className="font-display text-lg font-bold">{city?.name ?? "—"}</dd></div>
          <div><dt className="font-bold text-ink/50">📅 Katılım</dt><dd className="font-display text-lg font-bold">{since}</dd></div>
          <div><dt className="font-bold text-ink/50">💬 Mesajlar</dt><dd className="font-display text-lg font-bold">
            {p.dm_policy === "everyone" ? "Herkese açık" : p.dm_policy === "followers" ? "Takip ettiklerine açık" : "Kapalı"}</dd></div>
          <div><dt className="font-bold text-ink/50">🏡 Ev ziyareti</dt><dd className="font-display text-lg font-bold">
            {p.home_visibility === "everyone" ? "Herkese açık" : p.home_visibility === "followers" ? "Takip ettiklerine açık" : "Kapalı"}</dd></div>
        </dl>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f1ff] to-cream">
      <AppHeader me={me} />
      <main className="mx-auto max-w-4xl pb-16">
        {/* Kapak (Facebook / X) */}
        <div className={`relative h-44 bg-gradient-to-br sm:h-56 sm:rounded-b-[40px] ${COVERS[cover] ?? COVERS.crystal}`}>
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:22px_22px] sm:rounded-b-[40px]" />
        </div>

        <div className="px-4">
          <div className="-mt-24 flex flex-col items-center gap-4 sm:-mt-28 sm:flex-row sm:items-end">
            <div className="relative h-56 w-44 shrink-0 overflow-hidden rounded-[32px] border-4 border-white bg-gradient-to-b from-white to-[#f3ecff] shadow-xl">
              {avatar
                ? <AvatarStageLazy config={normalizeAvatar(avatar.config)} scale={heightScale(null)} interactive={false} className="h-full w-full" />
                : <div className="grid h-full place-items-center font-display text-7xl font-bold text-crystal">{p.username[0].toUpperCase()}</div>}
            </div>
            <div className="flex-1 pb-2 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="font-display text-3xl font-bold sm:text-4xl">{p.display_name || p.username}</h1>
                {ROLE_BADGE[p.role] && <span className="chip !py-0.5 text-xs">{ROLE_BADGE[p.role]}</span>}
              </div>
              <p className="font-semibold text-ink/60">
                @{p.username}{city?.name && ` · 📍 ${city.name}`}
                {rel.followsMe && <span className="ml-2 rounded-full bg-[#eef1f6] px-2 text-xs font-bold">Seni takip ediyor</span>}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pb-2">
              {isMe ? (
                <>
                  <Link href="/profil?tab=ayarlar" className="game-btn ghost !py-2">Profili düzenle</Link>
                  <Link href="/sosyal" className="game-btn !py-2">+ Paylaş</Link>
                </>
              ) : rel.iBlocked ? (
                <span className="rounded-xl bg-red-50 p-2 text-sm font-bold text-red-600">Engelledin</span>
              ) : (
                <>
                  <FollowButton target={p.id} initial={rel.iFollow} followsMe={rel.followsMe} />
                  {msgOk && <Link href={`/mesajlar?k=${p.username}`} className="game-btn ghost !py-2">💬</Link>}
                </>
              )}
              {!isMe && <MoreMenu target={p.id} username={p.username} blocked={rel.iBlocked} />}
            </div>
          </div>

          {p.bio && <p className="mx-auto mt-3 max-w-2xl whitespace-pre-wrap text-center sm:mx-0 sm:text-left">{p.bio}</p>}

          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            <Stat n={postCount ?? 0} label="gönderi" href={`?sekme=gonderiler`} />
            <Stat n={followers ?? 0} label="takipçi" href={`/u/${p.username}/baglantilar?liste=takipci`} />
            <Stat n={following ?? 0} label="takip" href={`/u/${p.username}/baglantilar?liste=takip`} />
            <Stat n={likes ?? 0} label="ev ❤️" href={seeHome ? `/u/${p.username}/ev` : undefined} />
          </div>

          <nav className="sticky top-14 z-10 mt-5 flex gap-1 rounded-full bg-white/80 p-1 backdrop-blur">
            {TABS.map((t) => (
              <Link key={t.id} href={`?sekme=${t.id}`} className={`flex-1 rounded-full py-2 text-center text-sm font-bold ${tab === t.id ? "bg-crystal text-white" : "text-ink/60 hover:bg-white"}`}>
                {t.icon} <span className="hidden sm:inline">{t.label}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-4">{content}</div>
        </div>
      </main>
    </div>
  );
}

function Stat({ n, label, href }: { n: number; label: string; href?: string }) {
  const inner = <><b className="block font-display text-2xl">{n.toLocaleString("tr-TR")}</b><span className="text-xs font-bold text-ink/50">{label}</span></>;
  return href ? <Link href={href} className="game-panel !rounded-2xl p-2 hover:-translate-y-0.5">{inner}</Link> : <div className="game-panel !rounded-2xl p-2">{inner}</div>;
}

/** Instagram tarzı kare ızgara */
function Grid({ posts, pinnedId }: { posts: PostView[]; pinnedId: number | null }) {
  return (
    <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-3xl">
      {posts.map((x) => (
        <Link key={x.id} href={`/p/${x.id}`} className="group relative aspect-square overflow-hidden bg-white">
          {x.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={x.images[0]} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
          ) : x.product ? (
            <div className="h-full w-full p-3"><ProductThumb p={x.product} className="!h-full !text-5xl" /></div>
          ) : (
            <div className={`grid h-full w-full place-items-center bg-gradient-to-br p-3 text-center ${COVERS[x.author.cover_color] ?? COVERS.crystal}`}>
              <p className="line-clamp-5 font-display text-sm font-bold text-white drop-shadow sm:text-base">{x.body}</p>
            </div>
          )}
          {x.images.length > 1 && <span className="absolute right-2 top-2 text-sm text-white drop-shadow">❏</span>}
          {x.id === pinnedId && <span className="absolute left-2 top-2 text-sm drop-shadow">📌</span>}
          <div className="absolute inset-0 hidden items-center justify-center gap-4 bg-ink/45 font-bold text-white group-hover:flex">
            <span>❤️ {x.like_count}</span><span>💬 {x.comment_count}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
