import Link from "next/link";
import { requireMe } from "@/lib/session";
import { fetchFeed } from "@/lib/feed";
import AppHeader from "@/components/AppHeader";
import Feed from "@/components/social/Feed";
import StoriesBar, { type StoryGroup } from "@/components/social/Stories";
import Avatar from "@/components/social/Avatar";
import UserRow from "@/components/UserRow";

const TABS = [
  { id: "takip", label: "Takip ettiklerin", icon: "👥" },
  { id: "kesfet", label: "Keşfet", icon: "🔥" },
  { id: "sehir", label: "Şehrim", icon: "📍" },
];

export default async function SosyalPage({ searchParams }: { searchParams: Promise<{ akis?: string; q?: string }> }) {
  const { supabase, me } = await requireMe("/sosyal");
  const { akis = "takip", q = "" } = await searchParams;
  const tab = TABS.some((t) => t.id === akis) ? akis : "takip";

  const [{ data: myProfile }, { data: follows }, { data: blocked }, { data: stories }, { data: trends }, { data: inv }, { data: city }] = await Promise.all([
    supabase.from("public_profiles").select("cover_color").eq("id", me.id).single(),
    supabase.from("follows").select("following_id").eq("follower_id", me.id),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", me.id),
    supabase.from("stories").select("id, author_id, text, image_url, bg, created_at").order("created_at"),
    supabase.rpc("trending_tags", { p_hours: 72 }),
    supabase.from("inventory_items").select("id, products(name, kind)").eq("owner_id", me.id).eq("status", "owned").order("acquired_at", { ascending: false }).limit(100),
    supabase.from("cities").select("name").eq("id", me.city_id ?? 34).maybeSingle(),
  ]);
  const cover = myProfile?.cover_color ?? "crystal";
  const iFollow = new Set((follows ?? []).map((f) => f.following_id));
  const hidden = new Set([me.id, ...(blocked ?? []).map((b) => b.blocked_id)]);

  // Hikâyeler: yazar bazında grupla + görüldü bilgisi
  const storyIds = (stories ?? []).map((s) => s.id);
  const authorIds = [...new Set((stories ?? []).map((s) => s.author_id))];
  const [{ data: views }, { data: storyAuthors }] = await Promise.all([
    storyIds.length ? supabase.from("story_views").select("story_id").eq("viewer_id", me.id).in("story_id", storyIds) : Promise.resolve({ data: [] }),
    authorIds.length ? supabase.from("public_profiles").select("id, username, display_name, cover_color").in("id", authorIds) : Promise.resolve({ data: [] }),
  ]);
  const seen = new Set((views ?? []).map((v) => v.story_id));
  const groups: StoryGroup[] = (storyAuthors ?? []).map((a) => ({
    author: a,
    stories: (stories ?? []).filter((s) => s.author_id === a.id).map((s) => ({ ...s, viewed: seen.has(s.id) || s.author_id === me.id })),
  }));

  // Öneriler: şehrimden, takip etmediklerim
  const { data: candidates } = await supabase.from("public_profiles").select("id, username, display_name, city_id")
    .eq("city_id", me.city_id ?? 34).order("created_at", { ascending: false }).limit(30);
  const suggestions = (candidates ?? []).filter((u) => !hidden.has(u.id) && !iFollow.has(u.id)).slice(0, 5);

  const term = q.replace(/[%,()@]/g, "").trim();
  const searchResults = term.length >= 2
    ? ((await supabase.from("public_profiles").select("id, username, display_name, city_id")
        .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`).limit(20)).data ?? []).filter((u) => !hidden.has(u.id))
    : null;

  const posts = await fetchFeed(supabase, me.id, tab, 0, me.city_id);
  const items = ((inv ?? []) as unknown as { id: string; products: { name: string; kind: string } | null }[])
    .filter((i) => i.products).map((i) => ({ id: i.id, name: i.products!.name, kind: i.products!.kind }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#efe3ff] via-[#f6f1ff] to-cream">
      <AppHeader me={me} />
      <div className="mx-auto grid max-w-6xl gap-5 p-4 pb-16 lg:grid-cols-[230px_1fr_300px]">
        {/* Sol: kısa profil + menü */}
        <aside className="hidden h-fit flex-col gap-3 lg:sticky lg:top-20 lg:flex">
          <Link href={`/u/${me.username}`} className="game-panel flex items-center gap-3 !rounded-3xl p-3">
            <Avatar username={me.username} cover={cover} link={false} />
            <span className="min-w-0"><b className="block truncate">{me.display_name || me.username}</b><span className="text-xs font-semibold text-ink/50">@{me.username}</span></span>
          </Link>
          <nav className="game-panel flex flex-col !rounded-3xl p-2 text-[15px] font-bold">
            {TABS.map((t) => (
              <Link key={t.id} href={`/sosyal?akis=${t.id}`} className={`rounded-2xl px-3 py-2.5 ${tab === t.id ? "bg-crystal text-white" : "hover:bg-white"}`}>{t.icon} {t.label}</Link>
            ))}
            <Link href="/mesajlar" className="rounded-2xl px-3 py-2.5 hover:bg-white">💬 Mesajlar {me.unread_messages > 0 && <span className="ml-1 rounded-full bg-red-500 px-1.5 text-xs text-white">{me.unread_messages}</span>}</Link>
            <Link href="/bildirimler" className="rounded-2xl px-3 py-2.5 hover:bg-white">🔔 Bildirimler {me.unread_notifications > 0 && <span className="ml-1 rounded-full bg-red-500 px-1.5 text-xs text-white">{me.unread_notifications}</span>}</Link>
            <Link href={`/u/${me.username}?sekme=kaydedilenler`} className="rounded-2xl px-3 py-2.5 hover:bg-white">🔖 Kaydedilenler</Link>
            <Link href={`/u/${me.username}`} className="rounded-2xl px-3 py-2.5 hover:bg-white">👤 Profilim</Link>
          </nav>
        </aside>

        {/* Orta: hikâyeler + akış */}
        <main className="flex min-w-0 flex-col gap-4">
          <StoriesBar groups={groups} meId={me.id} meUsername={me.username} meCover={cover} />
          <div className="game-panel flex gap-1 !rounded-full p-1 lg:hidden">
            {TABS.map((t) => (
              <Link key={t.id} href={`/sosyal?akis=${t.id}`} className={`flex-1 rounded-full py-2 text-center text-sm font-bold ${tab === t.id ? "bg-crystal text-white" : ""}`}>{t.icon} {t.label.split(" ")[0]}</Link>
            ))}
          </div>
          {tab === "sehir" && <p className="px-2 text-sm font-bold text-ink/60">📍 {city?.name} halkı neler paylaşıyor</p>}
          <Feed key={tab} initial={posts} tab={tab} cityId={me.city_id} isAdmin={me.role === "admin"}
            me={{ id: me.id, username: me.username, cover }} items={items} />
        </main>

        {/* Sağ: arama, gündem, öneriler */}
        <aside className="flex h-fit flex-col gap-4 lg:sticky lg:top-20">
          <form className="game-panel !rounded-full p-1">
            <input type="hidden" name="akis" value={tab} />
            <input name="q" defaultValue={q} placeholder="🔎 Kişi ara" className="w-full rounded-full bg-transparent px-4 py-2 font-semibold outline-none" />
          </form>
          {searchResults && (
            <section className="game-panel !rounded-3xl p-4">
              <h3 className="font-display text-lg font-bold">Sonuçlar</h3>
              {!searchResults.length && <p className="text-sm text-ink/50">Kimse bulunamadı.</p>}
              <div className="divide-y divide-[#e6ecf7]">{searchResults.map((u) => <UserRow key={u.id} user={u} meId={me.id} following={iFollow.has(u.id)} />)}</div>
            </section>
          )}
          <section className="game-panel !rounded-3xl p-4">
            <h3 className="mb-2 font-display text-lg font-bold">🔥 Gündem</h3>
            {!(trends ?? []).length && <p className="text-sm font-semibold text-ink/50">Henüz gündem yok. Gönderine #etiket ekle!</p>}
            {((trends ?? []) as { tag: string; posts: number }[]).map((t, i) => (
              <Link key={t.tag} href={`/etiket/${encodeURIComponent(t.tag)}`} className="block rounded-2xl px-2 py-1.5 hover:bg-white">
                <span className="text-xs font-bold text-ink/40">{i + 1} · Gündemde</span>
                <b className="block">#{t.tag}</b>
                <span className="text-xs text-ink/50">{Number(t.posts)} gönderi</span>
              </Link>
            ))}
          </section>
          <section className="game-panel !rounded-3xl p-4">
            <h3 className="font-display text-lg font-bold">✨ Kimi takip etmeli</h3>
            {!suggestions.length && <p className="text-sm font-semibold text-ink/50">Şimdilik öneri yok.</p>}
            <div className="divide-y divide-[#e6ecf7]">{suggestions.map((u) => <UserRow key={u.id} user={u} meId={me.id} following={false} sub={city?.name ?? undefined} />)}</div>
          </section>
        </aside>
      </div>
    </div>
  );
}
