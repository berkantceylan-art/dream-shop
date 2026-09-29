import Link from "next/link";
import { requireMe } from "@/lib/session";
import { getPublicProfile, relation, canMessage } from "@/lib/social";
import AppHeader from "@/components/AppHeader";
import Chat from "./Chat";

type Conv = { other_id: string; username: string; display_name: string | null; last_body: string; last_at: string; last_from_me: boolean; unread: number };

export default async function MesajlarPage({ searchParams }: { searchParams: Promise<{ k?: string }> }) {
  const { supabase, me } = await requireMe("/mesajlar");
  const { k } = await searchParams;
  const { data: convs } = await supabase.rpc("my_conversations");
  const list = (convs ?? []) as Conv[];

  let chat: React.ReactNode = (
    <div className="grid h-full place-items-center p-10 text-center">
      <div><p className="text-6xl">💬</p><p className="mt-2 font-display text-xl font-bold">Bir sohbet seç</p>
        <Link href="/sosyal" className="mt-4 inline-block text-sm font-bold text-crystal">Yeni kişiler bul →</Link></div>
    </div>
  );
  if (k) {
    const other = await getPublicProfile(supabase, k);
    if (other && other.id !== me.id) {
      const rel = await relation(supabase, me.id, other.id);
      const { data: msgs } = await supabase.from("messages").select("*")
        .or(`and(sender_id.eq.${other.id},recipient_id.eq.${me.id}),and(sender_id.eq.${me.id},recipient_id.eq.${other.id})`)
        .order("id", { ascending: false }).limit(200);
      const started = (msgs ?? []).some((m) => m.sender_id === other.id);
      const blockedByMe = rel.iBlocked;
      const allowed = !blockedByMe && (started || canMessage(other, rel.followsMe));
      chat = (
        <div className="flex h-full flex-col">
          <Link href={`/u/${other.username}`} className="flex items-center gap-3 border-b-2 border-white p-4">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-b from-crystal-light to-crystal font-display font-bold text-white">{other.username[0].toUpperCase()}</span>
            <span><b className="block">{other.display_name || other.username}</b><span className="text-xs font-semibold text-ink/50">@{other.username} · profili gör</span></span>
          </Link>
          <div className="min-h-0 flex-1">
            <Chat meId={me.id} other={other} initial={(msgs ?? []).reverse()} canSend={allowed}
              reason={blockedByMe ? "Bu kullanıcıyı engelledin." : other.dm_policy === "none" ? "Bu kullanıcı mesaj kabul etmiyor." : "Bu kullanıcı yalnızca takip ettiklerinden mesaj kabul ediyor."} />
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#efe3ff] to-cream">
      <AppHeader me={me} />
      <main className="mx-auto max-w-6xl p-4">
        <div className="game-panel grid h-[80vh] overflow-hidden md:grid-cols-[320px_1fr]">
          <aside className={`overflow-y-auto border-r-2 border-white ${k ? "hidden md:block" : ""}`}>
            <h1 className="p-4 font-display text-2xl font-bold">💬 Mesajlar</h1>
            {!list.length && <p className="px-4 text-sm font-semibold text-ink/50">Henüz mesajın yok. Bir profile girip “Mesaj”a bas.</p>}
            {list.map((c) => (
              <Link key={c.other_id} href={`/mesajlar?k=${c.username}`}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-white/60 ${k === c.username ? "bg-white" : ""}`}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-b from-crystal-light to-crystal font-display font-bold text-white">{c.username[0].toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate">{c.display_name || c.username}</b>
                  <span className={`block truncate text-sm ${c.unread ? "font-bold text-ink" : "text-ink/50"}`}>{c.last_from_me ? "Sen: " : ""}{c.last_body}</span>
                </span>
                {c.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-crystal px-1.5 text-xs font-bold text-white">{c.unread}</span>}
              </Link>
            ))}
          </aside>
          <section className={`min-h-0 ${k ? "" : "hidden md:block"}`}>{chat}</section>
        </div>
      </main>
    </div>
  );
}
