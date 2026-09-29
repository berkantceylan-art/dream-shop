import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { PageTitle, Stat } from "../_ui";
import { BuyerActions } from "../AdminButtons";
import { replyTicket, saveMarketSettings, reviewReport } from "../actions";
import { CreateGiftForm } from "@/app/profil/Forms";

export default async function Page() {
  const { supabase } = await requireAdmin();

    const { data: tickets } = await supabase.from("support_tickets")
      .select("id, user_id, category, subject, message, page_url, status, admin_reply, created_at")
      .order("status").order("created_at", { ascending: false }).limit(200);
    const ids = Array.from(new Set((tickets ?? []).map((t) => t.user_id)));
    const { data: people } = ids.length ? await supabase.from("public_profiles").select("id, username").in("id", ids) : { data: [] };
    const uname = new Map((people ?? []).map((p) => [p.id, p.username]));
    const CAT: Record<string, string> = { hata: "🐞 Hata", oneri: "💡 Öneri", odeme: "💳 Ödeme", hesap: "👤 Hesap", hesap_silme: "🗑️ Hesap silme", diger: "💬 Diğer" };
    
  return (
    <>
      <PageTitle icon="🛟" title="Destek talepleri" sub="Kullanıcı talepleri — yanıtla veya kapat" />

      <section className="space-y-3">
        {!tickets?.length && <p className="game-panel p-6 font-semibold text-ink/50">Talep yok 🎉</p>}
        {(tickets ?? []).map((t) => (
          <div key={t.id} className={`game-panel p-5 ${t.status === "closed" ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip">{CAT[t.category] ?? t.category}</span>
              <b className="flex-1">{t.subject}</b>
              <span className="text-xs font-bold text-ink/50">@{uname.get(t.user_id)} · {new Date(t.created_at).toLocaleString("tr-TR")}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink/80">{t.message}</p>
            {t.page_url && <p className="mt-1 text-xs font-bold text-ink/50">Sayfa: {t.page_url}</p>}
            <form action={replyTicket} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="id" value={t.id} />
              <input name="reply" defaultValue={t.admin_reply ?? ""} placeholder="Yanıtın…" className="game-input" />
              <select name="status" defaultValue={t.status === "open" ? "answered" : t.status} className="game-input sm:!w-40">
                <option value="answered">Yanıtlandı</option><option value="closed">Kapat</option><option value="open">Açık kalsın</option>
              </select>
              <button className="game-btn !py-2">Kaydet</button>
            </form>
          </div>
        ))}
      </section>
    </>
  );
}
