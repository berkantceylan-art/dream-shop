import { requireAdmin } from "@/lib/session";
import { PageTitle, Section } from "../_ui";
import { saveEconomy, savePackage, saveMarketSettings } from "../actions";

export default async function Ayarlar() {
  const { supabase } = await requireAdmin();
  const [{ data: app }, { data: quests }, { data: packs }, { data: ms }] = await Promise.all([
    supabase.from("app_settings").select("signup_bonus").maybeSingle(),
    supabase.from("quests").select("id, title, reward").order("sort"),
    supabase.from("credit_packages").select("id, name, credits, price_try, active").order("id"),
    supabase.from("market_settings").select("fee_percent, quick_sell_pct").maybeSingle(),
  ]);
  return (
    <>
      <PageTitle icon="⚙️" title="Ayarlar" sub="Ekonomi, kredi paketleri ve pazar oranları" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="💎 Başlangıç kredisi ve görev ödülleri">
          <form action={saveEconomy} className="grid gap-3">
            <label className="text-sm font-bold">Yeni üyeye verilen kredi
              <input name="signup_bonus" type="number" min={0} defaultValue={Number(app?.signup_bonus ?? 50000)} className="game-input mt-1" />
            </label>
            <p className="text-xs font-semibold text-ink/50">Referans: en ucuz ev 20.000, en ucuz araba 8.000 kredi.</p>
            {(quests ?? []).map((q) => (
              <label key={q.id} className="text-sm font-bold">🎯 {q.title}
                <input name={`quest_${q.id}`} type="number" min={1} defaultValue={Number(q.reward)} className="game-input mt-1" />
              </label>
            ))}
            <button className="game-btn">Kaydet</button>
          </form>
        </Section>
        <Section title="🤝 Pazar">
          <form action={saveMarketSettings} className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-bold">Komisyon (%)<input name="fee_percent" type="number" step="0.5" min={0} max={50} defaultValue={Number(ms?.fee_percent ?? 5)} className="game-input mt-1" /></label>
            <label className="text-sm font-bold">Hızlı satış (%)<input name="quick_sell_pct" type="number" min={0} max={100} defaultValue={Number(ms?.quick_sell_pct ?? 50)} className="game-input mt-1" /></label>
            <button className="game-btn self-end">Kaydet</button>
          </form>
        </Section>
        <Section title="🛒 Kredi paketleri" className="xl:col-span-2">
          <div className="grid gap-2">
            {[...(packs ?? []), { id: 0, name: "", credits: 0, price_try: 0, active: true }].map((p) => (
              <form key={p.id} action={savePackage} className="grid items-center gap-2 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
                <input type="hidden" name="id" value={p.id || ""} />
                <input name="name" defaultValue={p.name} placeholder={p.id ? "" : "Yeni paket adı"} className="game-input !py-2" required />
                <input name="credits" type="number" defaultValue={p.credits || ""} placeholder="Kredi" className="game-input !py-2" required />
                <input name="price_try" type="number" step="0.01" defaultValue={p.price_try || ""} placeholder="Fiyat ₺" className="game-input !py-2" required />
                <label className="flex items-center gap-1 text-sm font-bold"><input type="checkbox" name="active" defaultChecked={p.active} className="accent-[#c24dff]" /> Aktif</label>
                <button className="chip">{p.id ? "Kaydet" : "Ekle"}</button>
              </form>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}
