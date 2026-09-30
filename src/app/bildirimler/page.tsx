import Link from "next/link";
import { requireMe } from "@/lib/session";
import AppHeader from "@/components/AppHeader";

const TEXT: Record<string, (d: Record<string, unknown>) => string> = {
  follow: () => "seni takip etmeye başladı",
  home_like: () => "evini beğendi ❤️",
  message: (d) => `sana mesaj gönderdi: “${d.preview ?? ""}”`,
  gift: (d) => `sana ${Number(d.amount).toLocaleString("tr-TR")} kredi hediye etti 🎁${d.note ? ` — “${d.note}”` : ""}`,
  ticket: (d) => `Destek talebin yanıtlandı: “${d.subject ?? ""}”`,
  mention: () => "bir gönderide senden bahsetti",
  post_like: () => "gönderini beğendi ❤️",
  comment: (d) => `gönderine yorum yaptı: “${d.preview ?? ""}”`,
  announcement: (d) => `📣 ${d.title ?? "Duyuru"} — ${d.body ?? ""}`,
  admin_credit: (d) => `Dream Shop ekibi hesabına ${Number(d.amount) > 0 ? "+" : ""}${Number(d.amount).toLocaleString("tr-TR")} kredi işledi${d.note ? ` — “${d.note}”` : ""}`,
};
const ICON: Record<string, string> = { follow: "👤", home_like: "❤️", message: "💬", gift: "🎁", ticket: "🛟", announcement: "📣", admin_credit: "💎", mention: "📣", post_like: "❤️", comment: "💬" };

export default async function BildirimlerPage() {
  const { supabase, me } = await requireMe("/bildirimler");
  const { data } = await supabase.from("notifications").select("id, type, actor_id, data, read_at, created_at")
    .eq("user_id", me.id).order("created_at", { ascending: false }).limit(100);
  const ids = Array.from(new Set((data ?? []).map((n) => n.actor_id).filter(Boolean))) as string[];
  const { data: people } = ids.length ? await supabase.from("public_profiles").select("id, username").in("id", ids) : { data: [] };
  const uname = new Map((people ?? []).map((p) => [p.id, p.username]));
  // Sayfaya girince hepsi okundu say
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", me.id).is("read_at", null).neq("type", "message");

  const href = (n: { type: string; actor_id: string | null; data: unknown }) => {
    const u = n.actor_id ? uname.get(n.actor_id) : null;
    const pid = (n.data as { post_id?: number })?.post_id;
    if (pid && ["mention", "post_like", "comment"].includes(n.type)) return `/p/${pid}`;
    return n.type === "message" && u ? `/mesajlar?k=${u}` : n.type === "gift" || n.type === "admin_credit" ? "/profil?tab=cuzdan" : n.type === "ticket" ? "/profil?tab=destek" : u ? `/u/${u}` : "#";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#efe3ff] to-cream">
      <AppHeader me={{ ...me, unread_notifications: 0 }} />
      <main className="mx-auto max-w-2xl p-4 pb-16">
        <h1 className="mb-4 font-display text-4xl font-bold">🔔 Bildirimler</h1>
        <div className="game-panel divide-y divide-[#e6ecf7] p-2">
          {!data?.length && <p className="p-8 text-center font-semibold text-ink/50">Henüz bildirimin yok.</p>}
          {(data ?? []).map((n) => (
            <Link key={n.id} href={href(n)} className={`flex items-center gap-3 rounded-2xl p-3 hover:bg-white ${n.read_at ? "" : "bg-crystal/5"}`}>
              <span className="text-2xl">{ICON[n.type] ?? "•"}</span>
              <span className="flex-1 text-sm">
                {n.actor_id && n.type !== "announcement" && <b>@{uname.get(n.actor_id) ?? "biri"} </b>}{(TEXT[n.type] ?? (() => n.type))(n.data as Record<string, unknown>)}
                <span className="block text-xs text-ink/40">{new Date(n.created_at).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}</span>
              </span>
              {!n.read_at && <span className="h-2.5 w-2.5 rounded-full bg-crystal" />}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
