"use client";
import { useState, useTransition } from "react";
import { answerFeedbackAction, answerSurveyAction } from "@/app/profil/actions";
import Credits from "./Credits";

const REASONS: [string, string][] = [["pahali", "💸 Pahalı"], ["renk", "🎨 Rengi"], ["beden", "📏 Beden/ölçü"], ["model", "👀 Modeli"],
  ["baska_marka", "🏷️ Başka marka aldım"], ["ihtiyac_yok", "🤷 İhtiyacım kalmadı"], ["sonra", "⏳ Sonra alacağım"], ["diger", "💬 Diğer"]];

type Q = { product_id: string; name: string; brand: string | null };
type S = { id: number; question: string; options: string[]; reward: number };

/** "Neden almadın?" ve sponsorlu anketler — cevaplayana kredi */
export default function QuestionsCard({ questions, surveys }: { questions: Q[]; surveys: S[] }) {
  const [qs, setQs] = useState(questions);
  const [ss, setSs] = useState(surveys);
  const [toast, setToast] = useState("");
  const [pending, start] = useTransition();
  if (!qs.length && !ss.length) return null;
  const reward = (n?: number) => { if (n) { setToast(`+${n} kredi kazandın 🎉`); setTimeout(() => setToast(""), 2500); } };

  return (
    <section className="game-panel relative mt-6 p-5">
      <h2 className="font-display text-2xl font-bold">📋 Fikrin önemli</h2>
      <p className="text-sm font-semibold text-ink/60">Kısa soruları cevapla, kredi kazan. Cevapların anonim istatistiklere katılır.</p>
      {toast && <p className="animate-pop absolute right-4 top-4 rounded-full bg-mint px-3 py-1 text-sm font-bold text-white">{toast}</p>}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {ss.map((s) => (
          <div key={`s${s.id}`} className="rounded-2xl bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold">{s.question}</p>
              <span className="shrink-0 rounded-full bg-gold/30 px-2 py-0.5 text-xs">+<Credits amount={s.reward} /></span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {s.options.map((o, i) => (
                <button key={i} disabled={pending} className="chip" onClick={() => start(async () => {
                  const r = await answerSurveyAction(s.id, i); if (!r.error) { setSs((x) => x.filter((y) => y.id !== s.id)); reward(r.reward); }
                })}>{o}</button>
              ))}
            </div>
            <p className="mt-2 text-[11px] font-semibold text-ink/40">Sponsorlu anket</p>
          </div>
        ))}
        {qs.map((q) => (
          <div key={q.product_id} className="rounded-2xl bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold">“{q.name}” ürününü neden henüz almadın?</p>
              <span className="shrink-0 rounded-full bg-gold/30 px-2 py-0.5 text-xs">+<Credits amount={100} /></span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {REASONS.map(([v, l]) => (
                <button key={v} disabled={pending} className="chip !py-1 text-xs" onClick={() => start(async () => {
                  const r = await answerFeedbackAction(q.product_id, v); if (!r.error) { setQs((x) => x.filter((y) => y.product_id !== q.product_id)); reward(r.reward); }
                })}>{l}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
