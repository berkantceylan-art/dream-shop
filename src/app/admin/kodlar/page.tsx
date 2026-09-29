import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { PageTitle, Stat } from "../_ui";
import { BuyerActions } from "../AdminButtons";
import { replyTicket, saveMarketSettings, reviewReport } from "../actions";
import { CreateGiftForm } from "@/app/profil/Forms";

export default async function Page() {
  const { supabase } = await requireAdmin();

    const { data: codes } = await supabase.from("gift_cards").select("code, amount, message, uses, max_uses, is_promo, expires_at, created_at")
      .order("created_at", { ascending: false }).limit(100);
    
  return (
    <>
      <PageTitle icon="🎟️" title="Kampanya kodları" sub="Toplu hediye kodları" />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="game-panel p-6">
          <h2 className="font-display text-2xl font-bold">🎟️ Kampanya kodu</h2>
          <p className="mb-4 text-sm font-semibold text-ink/50">Admin kodları bakiyeden düşmez. Örn. 100 kişilik, 30 gün geçerli 250 kredilik kod.</p>
          <CreateGiftForm admin />
        </section>
        <section className="game-panel p-6">
          <h2 className="mb-3 font-display text-2xl font-bold">Tüm kodlar</h2>
          <div className="divide-y divide-[#e6ecf7]">
            {(codes ?? []).map((g) => (
              <div key={g.code} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <b className="select-all tracking-wider">{g.code}</b>
                <span className="flex-1 text-ink/50">{g.is_promo ? "Kampanya" : "Kullanıcı çeki"}</span>
                <span className="font-bold">{g.uses}/{g.max_uses}</span>
                <span className="font-bold">{Number(g.amount).toLocaleString("tr-TR")} kr</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
