import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { Filters, PageTitle, Pager, Section, fmt, qs, Stat } from "../_ui";

const SIZE = 100;
const TX: Record<string, string> = { signup_bonus: "🎉 Hoş geldin", product_purchase: "🛍️ Ürün alımı", resale_purchase: "🤝 2. el", resale_fee: "🏷️ Komisyon",
  quick_sell: "⚡ Hızlı satış", transfer: "↔️ Transfer", gift: "🎁 Hediye", admin_adjust: "🛠️ Admin", refund: "↩️ İade", quest_reward: "🎯 Görev",
  gift_card_create: "🎟️ Çek oluşturma", gift_card_redeem: "🎟️ Çek kullanımı", topup: "💳 Kredi satın alma" };

export default async function Islemler({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const { tur = "", kullanici = "", from = "", to = "" } = sp;
  const page = Math.max(1, Number(sp.sayfa) || 1);

  let uid: string | null = null;
  if (kullanici) {
    const { data } = await supabase.from("profiles").select("id").eq("username", kullanici.replace(/^@/, "").toLowerCase()).maybeSingle();
    uid = data?.id ?? "00000000-0000-0000-0000-000000000000";
  }
  let query = supabase.from("credit_transactions").select("id, from_user, to_user, amount, type, note, created_at", { count: "exact" });
  if (tur) query = query.eq("type", tur);
  if (uid) query = query.or(`from_user.eq.${uid},to_user.eq.${uid}`);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lt("created_at", new Date(new Date(to).getTime() + 864e5).toISOString());
  const { data: txs, count } = await query.order("id", { ascending: false }).range((page - 1) * SIZE, page * SIZE - 1);
  const ids = Array.from(new Set((txs ?? []).flatMap((t) => [t.from_user, t.to_user]).filter(Boolean))) as string[];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, username").in("id", ids) : { data: [] };
  const u = new Map((people ?? []).map((p) => [p.id, p.username]));
  const sum = (txs ?? []).reduce((a, t) => a + Number(t.amount), 0);

  const who = (id: string | null) => id ? <Link href={`/admin/kullanicilar/${id}`} className="font-bold text-crystal">@{u.get(id) ?? "?"}</Link> : <span className="text-ink/40">sistem</span>;
  return (
    <>
      <PageTitle icon="💎" title="Kredi işlemleri" sub="Tüm kredi hareketleri — değiştirilemez kayıt defteri" />
      <Filters action="/admin/islemler">
        <select name="tur" defaultValue={tur} className="game-input !w-auto !py-2">
          <option value="">Tüm türler</option>{Object.entries(TX).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input name="kullanici" defaultValue={kullanici} placeholder="@kullanıcı" className="game-input !w-44 !py-2" />
        <input name="from" type="date" defaultValue={from} className="game-input !w-auto !py-2" />
        <input name="to" type="date" defaultValue={to} className="game-input !w-auto !py-2" />
      </Filters>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Kayıt" value={count ?? 0} /><Stat label="Bu sayfadaki toplam" value={sum} sub="kredi" />
      </div>
      <Section>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-ink/50"><th className="p-2">Tür</th><th>Kimden</th><th>Kime</th><th>Not</th><th className="text-right">Tutar</th><th className="text-right">Tarih</th></tr></thead>
          <tbody className="divide-y divide-[#e6ecf7]">
            {(txs ?? []).map((t) => (
              <tr key={t.id}><td className="p-2 font-bold">{TX[t.type] ?? t.type}</td><td>{who(t.from_user)}</td><td>{who(t.to_user)}</td>
                <td className="max-w-60 truncate text-ink/60">{t.note}</td><td className="text-right font-bold">{Number(t.amount).toLocaleString("tr-TR")}</td>
                <td className="text-right text-xs text-ink/50">{fmt(t.created_at)}</td></tr>
            ))}
          </tbody>
        </table>
        <Pager page={page} size={SIZE} total={count ?? 0} base={`/admin/islemler${qs({ tur, kullanici, from, to })}`} />
      </Section>
    </>
  );
}
