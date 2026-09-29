import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { heightScale, normalizeAvatar } from "@/lib/avatar";
import { AvatarStageLazy } from "@/components/3d/Lazy";
import { Section, fmt, ROLE_TR } from "../../_ui";
import { BanBox, CreditForm, EditUserForm, MessageForm, RemoveItemButton } from "../UserTools";

const TX: Record<string, string> = { signup_bonus: "Hoş geldin", product_purchase: "Ürün alımı", resale_purchase: "2. el", resale_fee: "Komisyon",
  quick_sell: "Hızlı satış", transfer: "Transfer", gift: "Hediye", admin_adjust: "Admin", refund: "İade", quest_reward: "Görev",
  gift_card_create: "Çek oluşturma", gift_card_redeem: "Çek kullanımı", topup: "Kredi alımı" };
const ST: Record<string, string> = { owned: "Sende", listed: "Satışta", sold: "Satıldı", gifted: "Hediye" };

export default async function AdminUser({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: p } = await supabase.from("profiles").select("*, cities(name)").eq("id", id).maybeSingle();
  if (!p) notFound();

  const [{ data: auth }, { data: wallet }, { data: items }, { data: txs }, { data: tickets }, { data: reports }, { data: consents },
    { count: followers }, { count: following }, { data: avatar }, { data: cities }, { data: store }] = await Promise.all([
    supabase.rpc("admin_user_auth", { p_user: id }),
    supabase.from("wallets").select("balance").eq("user_id", id).maybeSingle(),
    supabase.from("inventory_items").select("id, status, source, paid_credits, acquired_at, products(name, kind)").eq("owner_id", id).order("acquired_at", { ascending: false }).limit(200),
    supabase.from("credit_transactions").select("id, from_user, to_user, amount, type, note, created_at").or(`from_user.eq.${id},to_user.eq.${id}`).order("id", { ascending: false }).limit(100),
    supabase.from("support_tickets").select("id, subject, status, created_at").eq("user_id", id).order("created_at", { ascending: false }),
    supabase.from("user_reports").select("id, reason, details, status, created_at").eq("reported_id", id).order("created_at", { ascending: false }),
    supabase.from("consents").select("type, granted, version, created_at").eq("user_id", id).order("created_at", { ascending: false }),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", id),
    supabase.from("avatars").select("config").eq("user_id", id).maybeSingle(),
    supabase.from("cities").select("id, name"),
    supabase.from("stores").select("id, name, status, slug").eq("owner_id", id).maybeSingle(),
  ]);
  const a = (auth ?? [])[0] as { email: string; last_sign_in_at: string | null } | undefined;
  const latest = (t: string) => (consents ?? []).find((c) => c.type === t);
  const owned = (items ?? []).filter((i) => i.status === "owned" || i.status === "listed");

  const info: [string, React.ReactNode][] = [
    ["E-posta", a?.email ?? "—"], ["Telefon", p.phone ?? "—"], ["Şehir / ilçe", `${(p.cities as { name: string } | null)?.name ?? "—"} / ${p.district ?? "—"}`],
    ["Doğum yılı", p.birth_year ?? "—"], ["Cinsiyet", p.gender ?? "—"], ["Boy / ayakkabı", `${p.height_cm ?? "—"} cm / ${p.shoe_size ?? "—"}`],
    ["Beden (üst/alt)", `${p.top_size ?? "—"} / ${p.bottom_size ?? "—"}`], ["Meslek / eğitim", `${p.occupation ?? "—"} / ${p.education ?? "—"}`],
    ["Konut / araba", `${p.housing ?? "—"} / ${p.owns_car == null ? "—" : p.owns_car ? "var" : "yok"}`], ["Gelir", p.income_band ?? "—"],
    ["İlgi alanları", (p.interests ?? []).join(", ") || "—"], ["Kayıt", fmt(p.created_at)], ["Son giriş", fmt(a?.last_sign_in_at)],
    ["Takipçi / takip", `${followers ?? 0} / ${following ?? 0}`],
    ["KVKK / analiz / pazarlama", `${latest("kvkk_terms")?.granted ? "✓" : "✗"} / ${latest("aggregate_analytics")?.granted ? "✓" : "✗"} / ${latest("marketing")?.granted ? "✓" : "✗"}`],
  ];

  return (
    <>
      <Link href="/admin/kullanicilar" className="text-sm font-bold text-crystal">← Kullanıcılar</Link>
      <div className="mt-2 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-4">
          <Section>
            <div className="flex flex-col gap-4 sm:flex-row">
              {avatar && <AvatarStageLazy config={normalizeAvatar(avatar.config)} scale={heightScale(p.height_cm)} interactive={false} className="h-56 w-40 shrink-0" />}
              <div className="flex-1">
                <h1 className="font-display text-3xl font-bold">@{p.username} {p.banned_at && <span className="text-base text-red-600">⛔ askıda</span>}</h1>
                <p className="font-semibold text-ink/60">{p.display_name} · {ROLE_TR[p.role]} · Bakiye: <b>{Number(wallet?.balance ?? 0).toLocaleString("tr-TR")} kredi</b></p>
                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  <Link className="chip" href={`/u/${p.username}`}>Profili gör</Link>
                  <Link className="chip" href={`/u/${p.username}/ev`}>Evini gör</Link>
                  <Link className="chip" href={`/admin/islemler?kullanici=${p.username}`}>Tüm işlemleri</Link>
                  {store && <Link className="chip" href={`/admin/magazalar/${store.id}`}>🏪 {store.name}</Link>}
                </div>
                <dl className="mt-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  {info.map(([k, v]) => <div key={k} className="flex gap-2"><dt className="w-36 shrink-0 font-bold text-ink/50">{k}</dt><dd>{v}</dd></div>)}
                </dl>
              </div>
            </div>
          </Section>

          <Section title={`🎒 Eşyalar (${owned.length} aktif)`}>
            <div className="max-h-80 divide-y divide-[#e6ecf7] overflow-y-auto text-sm">
              {(items ?? []).map((i) => {
                const pr = i.products as unknown as { name: string; kind: string } | null;
                return (
                  <div key={i.id} className={`flex items-center gap-2 py-1.5 ${i.status === "sold" ? "opacity-40" : ""}`}>
                    <b className="flex-1 truncate">{pr?.name}</b><span className="text-xs text-ink/50">{ST[i.status]} · {i.source}</span>
                    <span className="w-20 text-right">{Number(i.paid_credits).toLocaleString("tr-TR")}</span>
                    {(i.status === "owned" || i.status === "listed") && <RemoveItemButton userId={id} itemId={i.id} name={pr?.name ?? "Eşya"} />}
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="💎 Son 100 kredi hareketi">
            <div className="max-h-80 divide-y divide-[#e6ecf7] overflow-y-auto text-sm">
              {(txs ?? []).map((t) => {
                const inc = t.to_user === id;
                return (
                  <div key={t.id} className="flex gap-2 py-1.5">
                    <span className="w-28 font-bold">{TX[t.type] ?? t.type}</span><span className="flex-1 truncate text-ink/50">{t.note}</span>
                    <b className={inc ? "text-[#16865a]" : "text-red-500"}>{inc ? "+" : "−"}{Number(t.amount).toLocaleString("tr-TR")}</b>
                    <span className="w-36 text-right text-xs text-ink/40">{fmt(t.created_at)}</span>
                  </div>
                );
              })}
            </div>
          </Section>

          <div className="grid gap-4 md:grid-cols-2">
            <Section title="🛟 Destek talepleri">
              {!tickets?.length ? <p className="text-sm text-ink/50">Yok</p> : tickets.map((t) => (
                <p key={t.id} className="flex gap-2 py-1 text-sm"><b className="flex-1 truncate">{t.subject}</b><span className="text-xs">{t.status}</span></p>))}
            </Section>
            <Section title="🚩 Hakkındaki şikâyetler">
              {!reports?.length ? <p className="text-sm text-ink/50">Yok</p> : reports.map((r) => (
                <p key={r.id} className="py-1 text-sm"><b>{r.reason}</b> <span className="text-ink/50">{r.details}</span> <span className="text-xs">({r.status})</span></p>))}
            </Section>
          </div>
        </div>

        <aside className="grid h-fit gap-4">
          <Section title="💎 Kredi ekle / düş"><CreditForm userId={id} /></Section>
          <Section title="💬 Mesaj gönder"><MessageForm userId={id} /></Section>
          <Section title="✏️ Profili düzenle">
            <EditUserForm userId={id} p={p} cities={(cities ?? []).sort((x, y) => x.name.localeCompare(y.name, "tr"))} />
          </Section>
          <Section title="⛔ Hesap durumu"><BanBox userId={id} banned={!!p.banned_at} reason={p.ban_reason} /></Section>
        </aside>
      </div>
    </>
  );
}
