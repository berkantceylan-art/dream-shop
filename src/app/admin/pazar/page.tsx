import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { PageTitle, Stat } from "../_ui";
import { BuyerActions } from "../AdminButtons";
import { replyTicket, saveMarketSettings, reviewReport } from "../actions";
import { CreateGiftForm } from "@/app/profil/Forms";

export default async function Page() {
  const { supabase } = await requireAdmin();

    const [{ data: ms }, { data: active }, { data: sold }, { data: fees }] = await Promise.all([
      supabase.from("market_settings").select("fee_percent, quick_sell_pct").maybeSingle(),
      supabase.from("market_listings").select("id, name, price, seller_username, city_name, created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("resale_listings").select("id", { count: "exact", head: false }).eq("status", "sold"),
      supabase.from("credit_transactions").select("amount").eq("type", "resale_fee"),
    ]);
    const feeTotal = (fees ?? []).reduce((a, f) => a + Number(f.amount), 0);
    
  return (
    <>
      <PageTitle icon="🤝" title="2. El Pazarı" sub="İlanlar ve pazar istatistikleri" />

      <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Aktif ilan" value={active?.length ?? 0} />
          <Stat label="Tamamlanan satış" value={sold?.length ?? 0} />
          <Stat label="Toplanan komisyon" value={feeTotal} sub="kredi" />
        </div>
        <section className="game-panel mt-4 p-6">
          <h2 className="mb-3 font-display text-2xl font-bold">⚙️ Pazar ayarları</h2>
          <form action={saveMarketSettings} className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-bold">Komisyon (%)<input name="fee_percent" type="number" step="0.5" min={0} max={50} defaultValue={Number(ms?.fee_percent ?? 5)} className="game-input mt-1" /></label>
            <label className="text-sm font-bold">Hızlı satış oranı (%)<input name="quick_sell_pct" type="number" step="1" min={0} max={100} defaultValue={Number(ms?.quick_sell_pct ?? 50)} className="game-input mt-1" /></label>
            <button className="game-btn self-end">Kaydet</button>
          </form>
        </section>
        <section className="game-panel mt-4 p-6">
          <h2 className="mb-3 font-display text-2xl font-bold">Son ilanlar</h2>
          <div className="divide-y divide-[#e6ecf7]">
            {(active ?? []).map((l) => (
              <p key={l.id} className="flex gap-2 py-2 text-sm"><b className="flex-1">{l.name}</b>
                <span className="text-ink/50">@{l.seller_username} · {l.city_name}</span><b>{Number(l.price).toLocaleString("tr-TR")} kr</b></p>
            ))}
          </div>
        </section>
      </>
    </>
  );
}
