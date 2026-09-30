import { requireAdmin } from "@/lib/session";
import { PageTitle } from "../_ui";
import { setSurveyStatus } from "../actions";

const STATUS: Record<string, string> = { pending: "⏳ Onay bekliyor", active: "🟢 Yayında", closed: "✔️ Tamamlandı", rejected: "⛔ Reddedildi" };

export default async function Page() {
  const { supabase } = await requireAdmin();
  const [{ data: surveys }, { data: buyers }, { data: cities }] = await Promise.all([
    supabase.from("surveys").select("id, buyer_id, question, options, target, reward, max_responses, responses, status, created_at, ends_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("data_buyers").select("id, company"),
    supabase.from("cities").select("id, name"),
  ]);
  const company = new Map((buyers ?? []).map((b) => [b.id, b.company]));
  const city = new Map((cities ?? []).map((c) => [String(c.id), c.name]));
  const order = ["pending", "active", "closed", "rejected"];
  const list = [...(surveys ?? [])].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

  return (
    <>
      <PageTitle icon="📋" title="Sponsorlu anketler" sub="Kurumsal veri alıcılarının anketlerini yayına almadan önce incele" />
      <section className="game-panel p-5">
        {!list.length && <p className="font-semibold text-ink/50">Henüz anket yok.</p>}
        <div className="divide-y divide-[#e6ecf7]">
          {list.map((s) => {
            const t = (s.target ?? {}) as Record<string, string>;
            const target = [t.city_id ? city.get(String(t.city_id)) : "Tüm Türkiye", t.gender, (t.age_min || t.age_max) && `${t.age_min || 18}–${t.age_max || 99} yaş`].filter(Boolean).join(" · ");
            return (
              <div key={s.id} className="flex flex-wrap items-start gap-3 py-4">
                <div className="min-w-64 flex-1">
                  <p className="text-xs font-bold text-ink/50">{STATUS[s.status] ?? s.status} · {s.buyer_id ? company.get(s.buyer_id) ?? "—" : "Admin"} · {new Date(s.created_at).toLocaleDateString("tr-TR")}</p>
                  <p className="mt-1 text-lg font-bold">{s.question}</p>
                  <div className="mt-1 flex flex-wrap gap-1">{(s.options as string[]).map((o) => <span key={o} className="chip !text-xs">{o}</span>)}</div>
                  <p className="mt-2 text-sm font-semibold text-ink/60">🎯 {target} · 💎 {s.reward} kredi/yanıt · {s.responses}/{s.max_responses} yanıt · toplam en fazla {(s.reward * s.max_responses).toLocaleString("tr-TR")} kredi</p>
                </div>
                <div className="flex gap-2">
                  {s.status !== "active" && s.status !== "closed" && (
                    <form action={setSurveyStatus}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="status" value="active" /><button className="game-btn !py-1.5 text-sm">Onayla</button></form>
                  )}
                  {s.status === "pending" && (
                    <form action={setSurveyStatus}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="status" value="rejected" /><button className="chip">Reddet</button></form>
                  )}
                  {s.status === "active" && (
                    <form action={setSurveyStatus}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="status" value="closed" /><button className="chip">Kapat</button></form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
