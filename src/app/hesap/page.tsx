import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QUEST_ICONS } from "@/lib/quests";
import SkyScene from "@/components/SkyScene";
import Crystal from "@/components/Crystal";
import Credits from "@/components/Credits";
import { AvatarStageLazy } from "@/components/3d/Lazy";
import { heightScale, normalizeAvatar } from "@/lib/avatar";

export default async function HesapPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const { data: consent } = await supabase.from("consents").select("id")
    .eq("user_id", user.id).eq("type", "kvkk_terms").eq("granted", true).limit(1);
  if (!consent?.length) redirect("/kayit-tamamla");

  const [{ data: profile }, { data: wallet }, { data: quests }, { data: claims }, { data: avatar }] = await Promise.all([
    supabase.from("profiles").select("username, display_name, height_cm, cities(name)").eq("id", user.id).single(),
    supabase.from("wallets").select("balance").eq("user_id", user.id).single(),
    supabase.from("quests").select("id, title, description, reward").order("sort"),
    supabase.from("quest_claims").select("quest_id").eq("user_id", user.id),
    supabase.from("avatars").select("config").eq("user_id", user.id).maybeSingle(),
  ]);
  const city = (profile?.cities as unknown as { name: string } | null)?.name;
  const done = new Set((claims ?? []).map((c) => c.quest_id));
  const open = (quests ?? []).filter((q) => !done.has(q.id));

  return (
    <SkyScene>
      {/* üst bar */}
      <header className="mx-auto flex max-w-3xl items-center justify-between p-4">
        <Link href="/hesap" className="flex items-center gap-2 font-display text-xl font-bold">
          <Crystal size={26} /> Dream Shop
        </Link>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-white/80 px-4 py-1.5 shadow"><Credits amount={wallet?.balance ?? 0} /></span>
          <form action="/auth/cikis" method="post"><button className="text-sm font-bold text-ink/60 hover:underline">Çıkış</button></form>
        </div>
      </header>

      <main className="mx-auto max-w-3xl p-4 pb-72">
        <div className="game-panel animate-pop flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:text-left">
          {avatar ? (
            <AvatarStageLazy config={normalizeAvatar(avatar.config)} scale={heightScale(profile?.height_cm)}
              interactive={false} className="h-56 w-44 shrink-0" />
          ) : (
            <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full bg-gradient-to-b from-crystal-light to-crystal text-4xl text-white">
              <span className="absolute -top-9"><Crystal size={24} className="animate-bob" /></span>
              {(profile?.display_name || profile?.username || "?")[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold">Merhaba, {profile?.display_name || profile?.username}!</h1>
            <p className="font-semibold text-ink/60">@{profile?.username} · 📍 {city ?? "Şehir seçilmedi"}</p>
          </div>
          <Link href="/karakter" className="game-btn">{avatar ? "Karakterini düzenle ✏️" : "Karakterini oluştur 🧍"}</Link>
        </div>

        {open.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-display text-2xl font-bold">🎯 Görevler</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {open.map((q) => (
                <Link key={q.id} href={`/gorevler/${q.id}`}
                  className="game-panel flex items-center gap-4 p-5 transition hover:-translate-y-1">
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
