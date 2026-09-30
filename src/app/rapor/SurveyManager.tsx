"use client";
import { useEffect, useState, useTransition } from "react";
import { createSurveyAction, listSurveysAction, surveyResultsAction, type Survey } from "./actions";
import { BarList, HUE } from "./Charts";

type Opt = { id: number | string; name: string };
type Results = { question: string; options: string[]; responses: number; status: string; totals: { option: number; n: number }[] | null;
  breakdown: { dim: string; value: string; option: number; n: number }[] };
const STATUS: Record<string, [string, string]> = { pending: ["Onay bekliyor", "bg-gold/30"], active: ["Yayında", "bg-mint/25 text-[#16865a]"],
  closed: ["Tamamlandı", "bg-[#e6ecf7]"], rejected: ["Reddedildi", "bg-red-100 text-red-600"] };
const DIM: Record<string, string> = { age: "Yaş", gender: "Cinsiyet", city: "Şehir" };
const G: Record<string, string> = { kadin: "Kadın", erkek: "Erkek", diger: "Diğer" };

export default function SurveyManager({ cities, allowed }: { cities: Opt[]; allowed: boolean }) {
  const [list, setList] = useState<Survey[]>([]);
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", ""]);
  const [t, setT] = useState<Record<string, string>>({});
  const [reward, setReward] = useState(200);
  const [max, setMax] = useState(500);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [open, setOpen] = useState<number | null>(null);
  const [res, setRes] = useState<Results | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => { listSurveysAction().then(setList); }, []);

  const create = () => start(async () => {
    setMsg({});
    const r = await createSurveyAction({ question: q, options: opts.filter((o) => o.trim()), target: t, reward, max });
    if (r.error) return setMsg({ err: r.error });
    setMsg({ ok: "Anket oluşturuldu. Admin onayından sonra hedef kitlene gösterilir." });
    setQ(""); setOpts(["", ""]); setList(await listSurveysAction());
  });
  const show = (id: number) => start(async () => {
    if (open === id) { setOpen(null); return; }
    setOpen(id); setRes(null);
    const r = await surveyResultsAction(id);
    if (r.data) setRes(r.data as Results);
  });

  return (
    <>
      <div className="game-panel !rounded-3xl p-5">
        <h2 className="font-display text-2xl font-bold">📋 Sponsorlu anket</h2>
        <p className="text-sm font-semibold text-ink/60">Hedef kitlene tek bir soru sor. Yanıt veren kullanıcılar kredi ödülü kazanır; sen anonim, toplu sonucu görürsün.</p>
        {!allowed && <p className="mt-3 rounded-2xl bg-gold/25 p-3 text-sm font-bold">🔒 Sponsorlu anket yalnızca Kurumsal pakette açıktır.</p>}
        <div className={`mt-4 grid gap-3 lg:grid-cols-2 ${allowed ? "" : "pointer-events-none opacity-50"}`}>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-ink/60">Soru
              <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={200} placeholder="Örn. Yeni sezon montunda hangi rengi tercih edersin?" className="game-input mt-1" />
            </label>
            <p className="text-xs font-bold text-ink/60">Seçenekler (2–6)</p>
            {opts.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input value={o} onChange={(e) => setOpts((s) => s.map((x, j) => (j === i ? e.target.value : x)))} maxLength={80} placeholder={`Seçenek ${i + 1}`} className="game-input !py-1.5" />
                {opts.length > 2 && <button onClick={() => setOpts((s) => s.filter((_, j) => j !== i))} className="px-2 text-ink/40 hover:text-red-500" aria-label="Kaldır">✕</button>}
              </div>
            ))}
            {opts.length < 6 && <button onClick={() => setOpts((s) => [...s, ""])} className="self-start text-sm font-bold text-crystal">+ Seçenek ekle</button>}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-ink/60">Hedef kitle</p>
            <div className="grid grid-cols-2 gap-2">
              <select value={t.city_id ?? ""} onChange={(e) => setT((s) => ({ ...s, city_id: e.target.value }))} className="game-input !py-1.5 text-sm">
                <option value="">Tüm Türkiye</option>{cities.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
              <select value={t.gender ?? ""} onChange={(e) => setT((s) => ({ ...s, gender: e.target.value }))} className="game-input !py-1.5 text-sm">
                <option value="">Tüm cinsiyetler</option><option value="kadin">Kadın</option><option value="erkek">Erkek</option>
              </select>
              <input type="number" min={18} max={99} placeholder="Yaş min" value={t.age_min ?? ""} onChange={(e) => setT((s) => ({ ...s, age_min: e.target.value }))} className="game-input !py-1.5 text-sm" />
              <input type="number" min={18} max={99} placeholder="Yaş max" value={t.age_max ?? ""} onChange={(e) => setT((s) => ({ ...s, age_max: e.target.value }))} className="game-input !py-1.5 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-bold text-ink/60">Yanıt başı ödül (kredi)<input type="number" min={10} max={5000} value={reward} onChange={(e) => setReward(Number(e.target.value))} className="game-input mt-1 !py-1.5" /></label>
              <label className="text-xs font-bold text-ink/60">En fazla yanıt<input type="number" min={10} max={100000} value={max} onChange={(e) => setMax(Number(e.target.value))} className="game-input mt-1 !py-1.5" /></label>
            </div>
            <p className="text-xs font-semibold text-ink/50">Toplam dağıtılacak ödül: en fazla <b>{(reward * max).toLocaleString("tr-TR")}</b> kredi (platform kredisi). Anket 14 gün yayında kalır.</p>
            <button className="game-btn mt-auto" onClick={create} disabled={pending || q.trim().length < 5 || opts.filter((o) => o.trim()).length < 2}>
              {pending ? "Gönderiliyor…" : "Anketi onaya gönder"}
            </button>
            {msg.err && <p className="text-sm font-bold text-red-600">{msg.err}</p>}
            {msg.ok && <p className="text-sm font-bold text-[#16865a]">{msg.ok}</p>}
          </div>
        </div>
      </div>

      <div className="game-panel !rounded-3xl p-5">
        <h3 className="mb-3 font-display text-lg font-bold">Anketlerim</h3>
        {!list.length && <p className="text-sm font-semibold text-ink/50">Henüz anket yok.</p>}
        <div className="flex flex-col gap-2">
          {list.map((s) => {
            const [sl, sc] = STATUS[s.status] ?? [s.status, ""];
            return (
              <div key={s.id} className="rounded-2xl bg-white p-3">
                <button onClick={() => show(s.id)} className="flex w-full flex-wrap items-center gap-2 text-left">
                  <b className="min-w-0 flex-1">{s.question}</b>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${sc}`}>{sl}</span>
                  <span className="text-sm font-bold text-ink/60">{s.responses}/{s.max_responses} yanıt</span>
                  <span className="text-ink/40">{open === s.id ? "▲" : "▼"}</span>
                </button>
                <div className="mt-2 h-1.5 rounded-full bg-[#f1ecf8]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (s.responses / s.max_responses) * 100)}%`, background: HUE }} /></div>
                {open === s.id && <SurveyResult r={res} loading={pending} />}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function SurveyResult({ r, loading }: { r: Results | null; loading: boolean }) {
  if (!r) return <p className="mt-3 text-sm font-semibold text-ink/50">{loading ? "Yükleniyor…" : "Sonuç alınamadı."}</p>;
  if (!r.totals) return <p className="mt-3 rounded-xl bg-gold/20 p-3 text-sm font-semibold">Sonuçlar en az 10 yanıt geldiğinde görünür ({r.responses}/10).</p>;
  const total = r.totals.reduce((a, x) => a + Number(x.n), 0);
  const dims = ["age", "gender", "city"].filter((d) => r.breakdown.some((b) => b.dim === d));
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
      <div>
        <p className="mb-2 text-sm font-bold text-ink/60">Toplam dağılım · {total} yanıt</p>
        <BarList suffix="yanıt" rows={r.options.map((o, i) => {
          const n = Number(r.totals!.find((x) => x.option === i)?.n ?? 0);
          return { label: o, value: n, sub: `%${total ? Math.round((n / total) * 100) : 0}` };
        })} />
      </div>
      <div className="flex flex-col gap-3">
        {!dims.length && <p className="text-sm font-semibold text-ink/50">Kırılımlar için her hücrede en az 10 analiz izinli yanıt gerekir.</p>}
        {dims.map((d) => {
          const vals = [...new Set(r.breakdown.filter((b) => b.dim === d).map((b) => b.value))];
          return (
            <div key={d} className="overflow-x-auto">
              <p className="mb-1 text-sm font-bold text-ink/60">{DIM[d]} kırılımı</p>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-ink/50"><th className="py-1"></th>{r.options.map((o) => <th key={o} className="px-2 text-right">{o}</th>)}</tr></thead>
                <tbody className="divide-y divide-[#eee8f6]">
                  {vals.map((v) => (
                    <tr key={v}><td className="py-1 font-bold">{G[v] ?? v}</td>
                      {r.options.map((_, i) => { const n = r.breakdown.find((b) => b.dim === d && b.value === v && b.option === i)?.n;
                        return <td key={i} className="px-2 text-right font-semibold">{n ?? <span className="text-ink/30">&lt;10</span>}</td>; })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
