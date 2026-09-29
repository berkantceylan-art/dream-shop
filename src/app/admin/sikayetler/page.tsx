import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { PageTitle, Stat } from "../_ui";
import { BuyerActions } from "../AdminButtons";
import { replyTicket, saveMarketSettings, reviewReport } from "../actions";
import { CreateGiftForm } from "@/app/profil/Forms";

export default async function Page() {
  const { supabase } = await requireAdmin();

    const { data: reports } = await supabase.from("user_reports").select("id, reporter_id, reported_id, reason, details, status, created_at")
      .order("status").order("created_at", { ascending: false }).limit(200);
    const ids = Array.from(new Set((reports ?? []).flatMap((r) => [r.reporter_id, r.reported_id])));
    const { data: people } = ids.length ? await supabase.from("public_profiles").select("id, username").in("id", ids) : { data: [] };
    const u = new Map((people ?? []).map((p) => [p.id, p.username]));
    
  return (
    <>
      <PageTitle icon="🚩" title="Şikâyetler" sub="Kullanıcıların birbirini bildirdiği durumlar" />

      <section className="game-panel p-6">
        {!reports?.length && <p className="font-semibold text-ink/50">Şikâyet yok 🎉</p>}
        <div className="divide-y divide-[#e6ecf7]">
          {(reports ?? []).map((r) => (
            <div key={r.id} className={`flex flex-wrap items-center gap-3 py-3 ${r.status === "reviewed" ? "opacity-50" : ""}`}>
              <div className="flex-1">
                <p className="font-bold"><Link className="text-crystal" href={`/u/${u.get(r.reported_id)}`}>@{u.get(r.reported_id)}</Link> · {r.reason}</p>
                <p className="text-xs font-semibold text-ink/50">Bildiren @{u.get(r.reporter_id)} · {new Date(r.created_at).toLocaleString("tr-TR")}</p>
                {r.details && <p className="mt-1 text-sm">{r.details}</p>}
              </div>
              {r.status === "open" && (
                <form action={reviewReport}><input type="hidden" name="id" value={r.id} /><button className="chip">İncelendi</button></form>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
