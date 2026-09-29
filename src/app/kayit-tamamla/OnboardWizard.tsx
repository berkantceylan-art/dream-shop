"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "./actions";
import Crystal from "@/components/Crystal";

type City = { id: number; name: string };
const LOADING_TIPS = ["AVM kapıları açılıyor…", "Vitrinler parlatılıyor…", "Garaj temizleniyor…", "Kristaller şarj ediliyor…"];
const STEPS = ["Sen", "Şehrin", "Onaylar"];

export default function OnboardWizard({ cities, username, bonus }: { cities: City[]; username: string; bonus: number }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [tip, setTip] = useState(LOADING_TIPS[0]);
  const [f, setF] = useState({
    display_name: "", birth_year: "", gender: "", city_id: 0, district: "",
    kvkk_terms: false, aggregate_analytics: false, marketing: false,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  function nextStep() {
    setError("");
    if (step === 0) {
      const y = Number(f.birth_year), max = new Date().getFullYear() - 18;
      if (!y || y < 1920 || y > max) return setError("Platformu kullanmak için 18 yaşından büyük olmalısın.");
    }
    if (step === 1 && !f.city_id) return setError("Şehrini seç.");
    if (step < 2) return setStep(step + 1);

    if (!f.kvkk_terms) return setError("Devam etmek için zorunlu onayı vermelisin.");
    let i = 0;
    const timer = setInterval(() => setTip(LOADING_TIPS[++i % LOADING_TIPS.length]), 900);
    start(async () => {
      const res = await completeOnboarding({ ...f, birth_year: Number(f.birth_year) });
      clearInterval(timer);
      if (res.error) return setError(res.error);
      setStep(3);
    });
  }

  if (step === 3) return <Reward bonus={bonus} onDone={() => router.push("/karakter")} />;

  return (
    <div className="game-panel animate-pop w-full max-w-md p-8">
      {/* ilerleme */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`grid h-9 w-9 place-items-center rounded-full font-display font-bold transition
              ${i <= step ? "bg-crystal text-white shadow-[0_4px_0_#7a1fb8]" : "bg-white text-ink/40"}`}>{i + 1}</div>
            <span className={`text-sm font-bold ${i === step ? "text-ink" : "text-ink/40"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="h-1 w-6 rounded bg-white" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-bold">Merhaba @{username}! 👋</h2>
          <p className="text-sm font-semibold text-ink/60">Karakterini tanıyalım.</p>
          <input className="game-input" placeholder="Görünen ad (isteğe bağlı)" value={f.display_name}
            onChange={(e) => set("display_name", e.target.value)} />
          <input className="game-input" type="number" inputMode="numeric" placeholder="Doğum yılı" value={f.birth_year}
            onChange={(e) => set("birth_year", e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {[["kadin", "Kadın"], ["erkek", "Erkek"], ["diger", "Diğer"], ["", "Belirtmeyeyim"]].map(([v, l]) => (
              <button type="button" key={l} className="chip" data-on={f.gender === v} onClick={() => set("gender", v)}>{l}</button>
            ))}
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-bold">Hangi şehirde yaşayacaksın? 🏙️</h2>
          <p className="text-sm font-semibold text-ink/60">Mağazalar ve AVM'ler şehrine göre açılır.</p>
          <select className="game-input" value={f.city_id} onChange={(e) => set("city_id", Number(e.target.value))}>
            <option value={0} disabled>Şehrini seç</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="game-input" placeholder="İlçe (isteğe bağlı)" value={f.district}
            onChange={(e) => set("district", e.target.value)} />
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-3 text-sm">
          <h2 className="font-display text-2xl font-bold">Son bir adım 📜</h2>
          <Check on={f.kvkk_terms} set={(v) => set("kvkk_terms", v)} tag="Zorunlu">
            <a href="/yasal/aydinlatma" target="_blank" className="underline">KVKK Aydınlatma Metni</a>'ni okudum,{" "}
            <a href="/yasal/kosullar" target="_blank" className="underline">Kullanım Koşulları</a>'nı kabul ediyorum.
            Kredilerin yalnızca platform içinde kullanılabildiğini ve paraya çevrilemediğini biliyorum.
          </Check>
          <Check on={f.aggregate_analytics} set={(v) => set("aggregate_analytics", v)} tag="İsteğe bağlı">
            Tercihlerimin, kimliğim ayırt edilemeyecek şekilde <b>anonim ve toplu</b> istatistiklere dahil edilerek
            iş ortaklarıyla paylaşılmasına <a href="/yasal/acik-riza" target="_blank" className="underline">açık rıza</a> veriyorum.
          </Check>
          <Check on={f.marketing} set={(v) => set("marketing", v)} tag="İsteğe bağlı">
            Kampanya ve duyurulardan e-posta ile haberdar olmak istiyorum.
          </Check>
        </section>
      )}

      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p>}

      <div className="mt-6 flex gap-3">
        {step > 0 && <button type="button" className="game-btn ghost" onClick={() => setStep(step - 1)} disabled={pending}>←</button>}
        <button type="button" className="game-btn flex-1" onClick={nextStep} disabled={pending}>
          {pending ? tip : step < 2 ? "Devam" : "Hayatımı başlat ✨"}
        </button>
      </div>
    </div>
  );
}

function Check({ on, set, tag, children }: { on: boolean; set: (v: boolean) => void; tag: string; children: React.ReactNode }) {
  return (
    <label className={`flex cursor-pointer gap-3 rounded-2xl border-2 p-3 transition ${on ? "border-crystal bg-crystal/5" : "border-[#dbe4f5] bg-white"}`}>
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="mt-1 h-5 w-5 accent-[#c24dff]" />
      <span><b className="text-crystal">({tag})</b> {children}</span>
    </label>
  );
}

function Reward({ onDone, bonus }: { onDone: () => void; bonus: number }) {
  return (
    <div className="game-panel animate-pop relative w-full max-w-md overflow-hidden p-10 text-center">
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} className="animate-rise absolute bottom-10" style={{ left: `${8 + i * 9}%`, animationDelay: `${i * 0.12}s` }}>
          <Crystal size={14 + (i % 3) * 6} />
        </span>
      ))}
      <Crystal size={90} className="animate-bob animate-glow mx-auto" />
      <h2 className="mt-4 font-display text-4xl font-bold">+{bonus.toLocaleString("tr-TR")} kredi!</h2>
      <p className="mt-2 font-semibold text-ink/70">Hayatın başladı. Şimdi karakterini oluşturalım.</p>
      <button className="game-btn mint mt-8 w-full" onClick={onDone}>Hadi başlayalım →</button>
    </div>
  );
}
