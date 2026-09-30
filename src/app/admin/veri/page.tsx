import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { PageTitle, Stat } from "../_ui";
import { BuyerActions } from "../AdminButtons";
import { replyTicket, saveMarketSettings, reviewReport, updateBuyerPlan } from "../actions";
import { CreateGiftForm } from "@/app/profil/Forms";

export default async function Page() {
  const { supabase } = await requireAdmin();

    const [{ data: buyers }, { data: queries }] = await Promise.all([
      supabase.from("data_buyers").select("id, company, tax_no, contact_email, sector, purpose, approved, created_at, plan_id, plan_until, report_credits").order("created_at", { ascending: false }),
      supabase.from("report_queries").select("id, kind, filters, rows, created_at, charged").order("created_at", { ascending: false }).limit(30),
    ]);
    
  return (
    <>
      <PageTitle icon="📈" title="Veri alıcıları" sub="Rapor paneli başvuruları ve sorgu denetim izi" />

      <>
        <section className="game-panel p-6">
          <h2 className="mb-3 font-display text-2xl font-bold">📊 Veri alıcısı başvuruları</h2>
          {!buyers?.length && <p className="font-semibold text-ink/50">Başvuru yok.</p>}
          <div className="divide-y divide-[#e6ecf7]">
            {(buyers ?? []).map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-60 flex-1">
                  <p className="font-bold">{b.company} {b.approved ? "✅" : "⏳"}</p>
                  <p className="text-xs font-semibold text-ink/50">{[b.sector, b.contact_email, b.tax_no && `VKN ${b.tax_no}`].filter(Boolean).join(" · ")}</p>
                  {b.purpose && <p className="mt-1 text-sm text-ink/70">“{b.purpose}”</p>}
                </div>
                <BuyerActions id={b.id} approved={b.approved} />
                <form action={updateBuyerPlan} className="flex w-full flex-wrap items-end gap-2 rounded-2xl bg-[#f7f9fd] p-2 text-xs font-bold">
                  <input type="hidden" name="id" value={b.id} />
                  <label>Paket<select name="plan_id" defaultValue={b.plan_id ?? ""} className="game-input mt-1 !w-36 !py-1 text-sm">
                    <option value="">Paketsiz</option><option value="baslangic">Başlangıç</option><option value="pro">Pro</option><option value="kurumsal">Kurumsal</option></select></label>
                  <label>Bitiş<input type="date" name="plan_until" defaultValue={b.plan_until ?? ""} className="game-input mt-1 !w-40 !py-1 text-sm" /></label>
                  <label>Kredi ekle (şu an {b.report_credits})<input type="number" name="add_credits" defaultValue={0} className="game-input mt-1 !w-28 !py-1 text-sm" /></label>
                  <button className="chip">Kaydet</button>
                </form>
              </div>
            ))}
          </div>
        </section>
        <section className="game-panel mt-4 p-6">
          <h2 className="mb-3 font-display text-2xl font-bold">Son rapor sorguları (denetim izi)</h2>
          <div className="divide-y divide-[#e6ecf7] text-sm">
            {(queries ?? []).map((q) => (
              <p key={q.id} className="flex gap-2 py-2"><b>{q.kind}</b><span className="text-xs text-ink/50">{(q as { charged?: string }).charged}</span><code className="flex-1 truncate text-xs text-ink/60">{JSON.stringify(q.filters)}</code>
                <span>{q.rows} satır</span><span className="text-ink/40">{new Date(q.created_at).toLocaleString("tr-TR")}</span></p>
            ))}
          </div>
        </section>
      </>
    </>
  );
}
