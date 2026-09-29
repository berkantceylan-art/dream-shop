import Link from "next/link";
import { requireMe } from "@/lib/session";
import { QUEST_ICONS } from "@/lib/quests";
import { heightScale, normalizeAvatar } from "@/lib/avatar";
import SkyScene from "@/components/SkyScene";
import Crystal from "@/components/Crystal";
import Credits from "@/components/Credits";
import AppHeader from "@/components/AppHeader";
import { AvatarStageLazy } from "@/components/3d/Lazy";

export default async function HesapPage() {
  const { supabase, me } = await requireMe("/hesap");

  const [{ data: city }, { data: quests }, { data: claims }, { data: avatar }, { count: itemCount }] = await Promise.all([
    supabase.from("cities").select("name").eq("id", me.city_id ?? 0).maybeSingle(),
    supabase.from("quests").select("id, title, description, reward").order("sort"),
    supabase.from("quest_claims").select("quest_id").eq("user_id", me.id),
    supabase.from("avatars").select("config").eq("user_id", me.id).maybeSingle(),
    supabase.from("inventory_items").select("id", { count: "exact", head: true }).eq("owner_id", me.id).eq("status", "owned"),
  ]);
  const done = new Set((claims ?? []).map((c) => c.quest_id));
  const open = (quests ?? []).filter((q) => !done.has(q.id));

  return (
    <SkyScene>
      <AppHeader me={me} />
      <main className="mx-auto max-w-3xl p-4 pb-72">
        <div className="game-panel animate-pop flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:text-left">
          {avatar ? (
            <AvatarStageLazy config={normalizeAvatar(avatar.config)} scale={heightScale(me.height_cm)}
              interactive={false} className="h-56 w-44 shrink-0" />
          ) : (
            <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full bg-gradient-to-b from-crystal-light to-crystal text-4xl text-white">
              <span className="absolute -top-9"><Crystal size={24} className="animate-bob" /></span>
              {(me.display_name || me.username)[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold">Merhaba, {me.display_name || me.username}!</h1>
            <p className="font-semibold text-ink/60">@{me.username} · 📍 {city?.name ?? "Şehir seçilmedi"} · 🎒 {itemCount ?? 0} eşya</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Link href="/sehir" className="game-btn mint">Şehre çık 🏙️</Link>
              <Link href="/karakter" className="game-btn ghost">{avatar ? "Karakteri düzenle" : "Karakterini oluştur 🧍"}</Link>
            </div>
          </div>
        </div>

        {open.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-display text-2xl font-bold">🎯 Görevler</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {open.map((q) => (
                <Link key={q.id} href={`/gorevler/${q.id}`} className="game-panel flex items-center gap-4 p-5 transition hover:-translate-y-1">
                  <span className="text-3xl">{QUEST_ICONS[q.id] ?? "⭐"}</span>
                  <div className="flex-1">
                    <p className="font-display text-lg font-bold">{q.title}</p>
                    <p className="text-sm font-semibold text-ink/60">{q.description}</p>
                  </div>
                  <span className="rounded-full bg-gold/30 px-3 py-1 text-sm">+<Credits amount={q.reward} /></span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </SkyScene>
  );
}
