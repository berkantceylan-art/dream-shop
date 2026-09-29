import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { Stat, Section, PageTitle, fmt } from "./_ui";

export default async function AdminHome() {
  const { supabase } = await requireAdmin();
  const [{ data: st }, { data: newUsers }, { data: buys }, { data: tickets }, { data: pendingStores }] = await Promise.all([
    supabase.rpc("admin_stats"),
    supabase.from("profiles").select("id, username, display_name, created_at, cities(name)").order("created_at", { ascending: false }).limit(8),
    supabase.from("credit_transactions").select("id, from_user, amount, created_at, ref_id").eq("type", "product_purchase").order("id", { ascending: false }).limit(8),
    supabase.from("support_tickets").select("id, subject, category, created_at").eq("status", "open").order("created_at").limit(6),
    supabase.from("stores").select("id, name, created_at, cities(name)").eq("status", "pending").order("created_at").limit(6),
  ]);
  const s = (st ?? {}) as Record<string, number>;
  const buyerIds = Array.from(new Set((buys ?? []).map((b) => b.from_user).filter(Boolean))) as string[];
  const productIds = Array.from(new Set((buys ?? []).map((b) => b.ref_id).filter(Boolean))) as string[];
  const [{ data: people }, { data: prods }] = await Promise.all([
    buyerIds.length ? supabase.from("profiles").select("id, username").in("id", buyerIds) : Promise.resolve({ data: [] }),
    productIds.length ? supabase.from("products").select("id, name").in("id", productIds) : Promise.resolve({ data: [] }),
  ]);
  const uname = new Map((people ?? []).map((p) => [p.id, p.username]));
  const pname = new Map((prods ?? []).map((p) => [p.id, p.name]));

  return (
    <>
      <PageTitle icon="📊" title="Genel bakış" sub="Dream Shop'un anlık durumu" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Stat label="Kullanıcı" value={s.users} sub={`+${s.users_today ?? 0} bugün · +${s.users_week ?? 0} hafta`} href="/admin/kullanicilar" />
        <Stat label="Satın alma" value={s.purchases} sub={`+${s.purchases_today ?? 0} bugün`} href="/admin/islemler?tur=product_purchase" />
        <Stat label="Harcanan kredi" value={s.credits_spent} />
        <Stat label="Cüzdanlardaki kredi" value={s.credits_in_wallets} />
        <Stat label="Aktif ürün" value={s.products} href="/admin/urunler" />
        <Stat label="Bağımsız mağaza" value={s.stores} href="/admin/magazalar" />
        <Stat label="Onay bekleyen mağaza" value={s.stores_pending} tone="warn" href="/admin/magazalar?durum=pending" />
        <Stat label="Açık destek" value={s.tickets_open} tone="warn" href="/admin/destek" />
        <Stat label="Açık şikâyet" value={s.reports_open} tone="warn" href="/admin/sikayetler" />
        <Stat label="Veri alıcısı başvurusu" value={s.buyers_pending} tone="warn" href="/admin/veri" />
        <Stat label="Pazardaki ilan" value={s.listings} href="/admin/pazar" />
        <Stat label="Analiz rızası" value={s.analytics_consent} sub={s.users ? `%${Math.round((s.analytics_consent / s.users) * 100)}` : ""} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Section title="🆕 Yeni üyeler" right={<Link href="/admin/kullanicilar" className="text-sm font-bold text-crystal">Tümü →</Link>}>
          <div className="divide-y divide-[#e6ecf7]">
            {(newUsers ?? []).map((u) => (
              <Link key={u.id} href={`/admin/kullanicilar/${u.id}`} className="flex items-center gap-2 py-2 text-sm hover:bg-white">
                <b className="flex-1">@{u.username} <span className="font-semibold text-ink/50">{u.display_name}</span></b>
                <span className="text-ink/50">{(u.cities as unknown as { name: string } | null)?.name ?? "—"}</span>
                <span className="w-36 text-right text-xs text-ink/40">{fmt(u.created_at)}</span>
              </Link>
            ))}
          </div>
        </Section>
        <Section title="🛍️ Son satın almalar" right={<Link href="/admin/islemler" className="text-sm font-bold text-crystal">Tümü →</Link>}>
          <div className="divide-y divide-[#e6ecf7]">
            {(buys ?? []).map((b) => (
              <div key={b.id} className="flex items-center gap-2 py-2 text-sm">
                <Link href={`/admin/kullanicilar/${b.from_user}`} className="font-bold text-crystal">@{uname.get(b.from_user!) ?? "?"}</Link>
                <span className="flex-1 truncate">{pname.get(b.ref_id!) ?? "Ürün"}</span>
                <b>{Number(b.amount).toLocaleString("tr-TR")} kr</b>
                <span className="w-36 text-right text-xs text-ink/40">{fmt(b.created_at)}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="🛟 Bekleyen destek talepleri" right={<Link href="/admin/destek" className="text-sm font-bold text-crystal">Yanıtla →</Link>}>
          {!tickets?.length ? <p className="text-sm font-semibold text-ink/50">Bekleyen talep yok 🎉</p> : tickets.map((t) => (
            <p key={t.id} className="flex gap-2 py-1.5 text-sm"><span className="chip !py-0 text-xs">{t.category}</span><b className="flex-1 truncate">{t.subject}</b><span className="text-xs text-ink/40">{fmt(t.created_at)}</span></p>
          ))}
        </Section>
        <Section title="⏳ Onay bekleyen mağazalar" right={<Link href="/admin/magazalar?durum=pending" className="text-sm font-bold text-crystal">İncele →</Link>}>
          {!pendingStores?.length ? <p className="text-sm font-semibold text-ink/50">Bekleyen başvuru yok 🎉</p> : pendingStores.map((t) => (
            <p key={t.id} className="flex gap-2 py-1.5 text-sm"><b className="flex-1">{t.name}</b><span className="text-ink/50">{(t.cities as unknown as { name: string } | null)?.name}</span><span className="text-xs text-ink/40">{fmt(t.created_at)}</span></p>
          ))}
        </Section>
      </div>
    </>
  );
}
