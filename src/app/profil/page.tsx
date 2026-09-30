import Link from "next/link";
import { requireMe } from "@/lib/session";
import { QUEST_ICONS } from "@/lib/quests";
import { heightScale, normalizeAvatar } from "@/lib/avatar";
import { PRODUCT_COLS, type Product } from "@/lib/catalog";
import AppHeader from "@/components/AppHeader";
import Credits from "@/components/Credits";
import Crystal from "@/components/Crystal";
import { ProductThumb } from "@/components/ProductCard";
import { AvatarStageLazy } from "@/components/3d/Lazy";
import { ConsentToggle, CreateGiftForm, ProfileForm, RedeemGiftForm, SendCreditsForm, TicketForm } from "./Forms";

const TABS = [
  { id: "genel", label: "Profilim", icon: "🏠" },
  { id: "siparisler", label: "Siparişlerim", icon: "🧾" },
  { id: "cuzdan", label: "Cüzdan", icon: "💎" },
  { id: "gonder", label: "Kredi gönder", icon: "🎁" },
  { id: "hediye", label: "Hediye çekleri", icon: "🎟️" },
  { id: "kredi", label: "Kredi al", icon: "🛒" },
  { id: "destek", label: "Destek", icon: "🛟" },
  { id: "ayarlar", label: "Ayarlar", icon: "⚙️" },
];

const TX: Record<string, { label: string; icon: string }> = {
  signup_bonus: { label: "Hoş geldin kredisi", icon: "🎉" }, topup: { label: "Kredi satın alma", icon: "💳" },
  product_purchase: { label: "Ürün satın alma", icon: "🛍️" }, resale_sale: { label: "2. el satış", icon: "🤝" },
  resale_purchase: { label: "2. el alım", icon: "🤝" }, transfer: { label: "Kredi transferi", icon: "↔️" },
  gift: { label: "Hediye kredi", icon: "🎁" }, admin_adjust: { label: "Düzeltme", icon: "🛠️" }, refund: { label: "İade", icon: "↩️" },
  quest_reward: { label: "Görev ödülü", icon: "🎯" }, gift_card_create: { label: "Hediye çeki oluşturma", icon: "🎟️" },
  gift_card_redeem: { label: "Hediye çeki kullanımı", icon: "🎟️" },
  resale_fee: { label: "Pazar komisyonu", icon: "🏷️" }, quick_sell: { label: "Hızlı satış", icon: "⚡" },
};
const TICKET_STATUS: Record<string, string> = { open: "🟡 Açık", answered: "🟢 Yanıtlandı", closed: "⚪ Kapandı" };
const fmtDate = (d: string) => new Date(d).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });

export default async function ProfilPage({ searchParams }: { searchParams: Promise<{ tab?: string; kategori?: string }> }) {
  const { supabase, me } = await requireMe("/profil");
  const { tab = "genel", kategori } = await searchParams;
  let body: React.ReactNode = null;

  if (tab === "genel") {
    const [{ data: avatar }, { data: city }, { data: quests }, { data: claims }, { count: items }, { data: spent }] = await Promise.all([
      supabase.from("avatars").select("config").eq("user_id", me.id).maybeSingle(),
      supabase.from("cities").select("name").eq("id", me.city_id ?? 0).maybeSingle(),
      supabase.from("quests").select("id, title, description, reward").order("sort"),
      supabase.from("quest_claims").select("quest_id").eq("user_id", me.id),
      supabase.from("inventory_items").select("id", { count: "exact", head: true }).eq("owner_id", me.id).eq("status", "owned"),
      supabase.from("credit_transactions").select("amount").eq("from_user", me.id).eq("type", "product_purchase"),
    ]);
    const done = new Set((claims ?? []).map((c) => c.quest_id));
    const open = (quests ?? []).filter((q) => !done.has(q.id));
    const totalSpent = (spent ?? []).reduce((a, b) => a + Number(b.amount), 0);
    body = (
      <>
        <div className="game-panel flex flex-col items-center gap-6 p-6 sm:flex-row">
          {avatar
            ? <AvatarStageLazy config={normalizeAvatar(avatar.config)} scale={heightScale(me.height_cm)} interactive={false} className="h-64 w-48 shrink-0" />
            : <Link href="/karakter" className="game-btn">Karakterini oluştur 🧍</Link>}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="font-display text-4xl font-bold">{me.display_name || me.username}</h1>
            <p className="font-semibold text-ink/60">@{me.username} · 📍 {city?.name ?? "—"}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Mini label="Kredi" value={<Credits amount={me.balance} />} />
              <Mini label="Eşya" value={items ?? 0} />
              <Mini label="Harcanan" value={totalSpent.toLocaleString("tr-TR")} />
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Link href="/sehir" className="game-btn mint !py-2">Şehre çık 🏙️</Link>
              <Link href="/karakter" className="game-btn ghost !py-2">Karakteri düzenle</Link>
              <Link href="/envanter" className="game-btn ghost !py-2">Eşyalarım</Link>
              <Link href={`/u/${me.username}`} className="game-btn ghost !py-2">👁️ Herkese açık profilim</Link>
              {me.role === "user" && <Link href="/rapor" className="game-btn ghost !py-2">📊 Şirketim için rapor al</Link>}
            </div>
          </div>
        </div>
        {open.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 font-display text-2xl font-bold">🎯 Görevler</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {open.map((q) => (
                <Link key={q.id} href={`/gorevler/${q.id}`} className="game-panel flex items-center gap-4 p-5 transition hover:-translate-y-1">
                  <span className="text-3xl">{QUEST_ICONS[q.id] ?? "⭐"}</span>
                  <div className="flex-1"><p className="font-display text-lg font-bold">{q.title}</p>
                    <p className="text-sm font-semibold text-ink/60">{q.description}</p></div>
                  <span className="rounded-full bg-gold/30 px-3 py-1 text-sm">+<Credits amount={q.reward} /></span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </>
    );
  }

  if (tab === "siparisler") {
    const { data } = await supabase.from("inventory_items")
      .select(`id, status, source, paid_credits, acquired_at, products(${PRODUCT_COLS}, stores(name), chains(name))`)
      .eq("owner_id", me.id).order("acquired_at", { ascending: false }).limit(200);
    const rows = (data ?? []) as unknown as { id: string; status: string; source: string; paid_credits: number; acquired_at: string;
      products: Product & { stores: { name: string } | null; chains: { name: string } | null } }[];
    const SRC: Record<string, string> = { store: "Mağaza", resale: "2. el", gift: "Hediye", signup: "Başlangıç" };
    const ST: Record<string, string> = { owned: "Sende", listed: "🤝 Satışta", sold: "Satıldı", gifted: "Hediye edildi" };
    body = (
      <Panel title="🧾 Siparişlerim">
        {!rows.length ? <EmptyRow text="Henüz bir şey satın almadın." cta={{ href: "/sehir", label: "Alışverişe çık 🛍️" }} /> : (
          <div className="divide-y divide-[#e6ecf7]">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-3">
                <div className="w-14 shrink-0"><ProductThumb p={r.products} className="!rounded-xl !text-2xl" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{r.products.name}</p>
                  <p className="text-xs font-semibold text-ink/50">
                    {r.products.chains?.name ?? r.products.stores?.name ?? "Dream Outlet"} · {SRC[r.source]} · {fmtDate(r.acquired_at)}
                  </p>
                </div>
                <span className="text-xs font-bold text-ink/60">{ST[r.status]}</span>
                <Credits amount={r.paid_credits} />
              </div>
            ))}
          </div>
        )}
      </Panel>
    );
  }

  if (tab === "cuzdan") {
    const { data: txs } = await supabase.from("credit_transactions").select("id, from_user, to_user, amount, type, note, created_at")
      .or(`from_user.eq.${me.id},to_user.eq.${me.id}`).order("id", { ascending: false }).limit(200);
    const others = Array.from(new Set((txs ?? []).flatMap((t) => [t.from_user, t.to_user]).filter((x) => x && x !== me.id))) as string[];
    const { data: people } = others.length ? await supabase.from("public_profiles").select("id, username").in("id", others) : { data: [] };
    const name = new Map((people ?? []).map((p) => [p.id, p.username]));
    const inSum = (txs ?? []).filter((t) => t.to_user === me.id).reduce((a, t) => a + Number(t.amount), 0);
    const outSum = (txs ?? []).filter((t) => t.from_user === me.id).reduce((a, t) => a + Number(t.amount), 0);
    body = (
      <>
        <div className="grid grid-cols-3 gap-3">
          <div className="game-panel col-span-3 bg-gradient-to-br from-crystal-light/40 to-crystal/20 p-6 sm:col-span-1">
            <p className="text-sm font-bold text-ink/60">Bakiyen</p><Credits amount={me.balance} big />
          </div>
          <Mini label="Toplam gelen" value={`+${inSum.toLocaleString("tr-TR")}`} />
          <Mini label="Toplam giden" value={`−${outSum.toLocaleString("tr-TR")}`} />
        </div>
        <Panel title="Hesap hareketleri" className="mt-4">
          <div className="divide-y divide-[#e6ecf7]">
            {(txs ?? []).map((t) => {
              const incoming = t.to_user === me.id;
              const other = incoming ? t.from_user : t.to_user;
              const meta = t.type === "resale_purchase" && incoming ? { label: "2. el satış", icon: "🤝" } : TX[t.type] ?? { label: t.type, icon: "•" };
              return (
                <div key={t.id} className="flex items-center gap-3 py-3">
                  <span className="text-2xl">{meta.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{meta.label}{other && name.get(other) ? <span className="text-ink/60"> {incoming ? "← " : "→ "}@{name.get(other)}</span> : null}</p>
                    <p className="truncate text-xs font-semibold text-ink/50">{fmtDate(t.created_at)}{t.note ? ` · “${t.note}”` : ""}</p>
                  </div>
                  <span className={`font-display text-lg font-bold ${incoming ? "text-[#16865a]" : "text-red-500"}`}>
                    {incoming ? "+" : "−"}{Number(t.amount).toLocaleString("tr-TR")}
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>
      </>
    );
  }

  if (tab === "gonder") {
    body = (
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="🎁 Kredi gönder">
          <p className="mb-4 text-sm font-semibold text-ink/60">Arkadaşının kullanıcı adını yaz, krediyi anında göndersin. Gönderilen kredi geri alınamaz.</p>
          <SendCreditsForm balance={me.balance} />
        </Panel>
        <Panel title="💡 Nasıl çalışır?">
          <ul className="space-y-2 text-sm font-semibold text-ink/70">
            <li>🎁 <b>Hediye</b> olarak gönderirsen arkadaşının cüzdanında “Hediye kredi” olarak görünür.</li>
            <li>🎟️ Kullanıcı adını bilmiyor musun? <Link className="text-crystal underline" href="/profil?tab=hediye">Hediye çeki</Link> oluşturup kodu paylaş.</li>
            <li>🔒 Krediler yalnızca Dream Shop içinde harcanabilir, paraya çevrilemez.</li>
          </ul>
        </Panel>
      </div>
    );
  }

  if (tab === "hediye") {
    const [{ data: mine }, { data: used }] = await Promise.all([
      supabase.from("gift_cards").select("code, amount, message, uses, max_uses, created_at, expires_at").eq("created_by", me.id).order("created_at", { ascending: false }),
      supabase.from("gift_card_redemptions").select("code, redeemed_at").eq("user_id", me.id).order("redeemed_at", { ascending: false }),
    ]);
    body = (
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="🎟️ Kod kullan"><RedeemGiftForm /></Panel>
        <Panel title="➕ Hediye çeki oluştur">
          <p className="mb-4 text-sm font-semibold text-ink/60">Tutar bakiyenden düşer, kodu kullanan kişinin hesabına geçer.</p>
          <CreateGiftForm />
        </Panel>
        <Panel title="Oluşturduğum çekler" className="md:col-span-2">
          {!mine?.length ? <p className="font-semibold text-ink/50">Henüz hediye çeki oluşturmadın.</p> : (
            <div className="divide-y divide-[#e6ecf7]">
              {mine.map((g) => (
                <div key={g.code} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="select-all font-display text-lg font-bold tracking-wider">{g.code}</span>
                  <span className="flex-1 truncate text-sm text-ink/60">{g.message}</span>
                  <span className={`chip ${g.uses >= g.max_uses ? "" : "!border-mint"}`}>{g.uses >= g.max_uses ? "Kullanıldı" : "Kullanılmadı"}</span>
                  <Credits amount={g.amount} />
                </div>
              ))}
            </div>
          )}
          {!!used?.length && <p className="mt-4 text-sm font-semibold text-ink/50">Kullandığın kodlar: {used.map((u) => u.code).join(", ")}</p>}
        </Panel>
      </div>
    );
  }

  if (tab === "kredi") {
    const { data: packs } = await supabase.from("credit_packages").select("id, name, credits, price_try").eq("active", true).order("credits");
    body = (
      <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {(packs ?? []).map((p, i) => (
            <div key={p.id} className={`game-panel relative flex flex-col items-center p-5 text-center ${i === 1 ? "ring-4 ring-crystal" : ""}`}>
              {i === 1 && <span className="absolute -top-3 rounded-full bg-crystal px-3 py-0.5 text-xs font-bold text-white">En popüler</span>}
              <Crystal size={28 + i * 6} className="animate-bob" />
              <p className="mt-2 font-display text-lg font-bold">{p.name}</p>
              <p className="font-display text-2xl font-bold">{Number(p.credits).toLocaleString("tr-TR")}</p>
              <p className="text-xs font-bold text-ink/50">kredi</p>
              <button disabled className="game-btn mt-3 w-full !py-2 !text-base">{Number(p.price_try).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</button>
            </div>
          ))}
        </div>
        <p className="game-panel mt-4 p-4 text-sm font-semibold text-ink/70">
          💳 Güvenli ödeme altyapısı (iyzico / PayTR) çok yakında. Krediler yalnızca Dream Shop içinde harcanabilir ve paraya çevrilemez.
        </p>
      </>
    );
  }

  if (tab === "destek") {
    const { data: tickets } = await supabase.from("support_tickets").select("id, category, subject, message, status, admin_reply, created_at")
      .eq("user_id", me.id).order("created_at", { ascending: false });
    body = (
      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <Panel title="🛟 Yeni talep"><TicketForm defaultCategory={kategori ?? "hata"} /></Panel>
        <Panel title="Taleplerim">
          {!tickets?.length ? <p className="font-semibold text-ink/50">Henüz talebin yok.</p> : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <details key={t.id} className="rounded-2xl bg-white p-4">
                  <summary className="flex cursor-pointer items-center gap-2 font-bold">
                    <span className="flex-1">{t.subject}</span><span className="text-xs">{TICKET_STATUS[t.status]}</span>
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-ink/70">{t.message}</p>
                  <p className="mt-1 text-xs text-ink/40">{fmtDate(t.created_at)}</p>
                  {t.admin_reply && <p className="mt-3 rounded-xl bg-mint/10 p-3 text-sm"><b>Dream Shop ekibi:</b> {t.admin_reply}</p>}
                </details>
              ))}
            </div>
          )}
        </Panel>
      </div>
    );
  }

  if (tab === "ayarlar") {
    const [{ data: p }, { data: cities }, { data: districts }, { data: consents }] = await Promise.all([
      supabase.from("profiles").select("display_name, city_id, district, bio, dm_policy, home_visibility, cover_color, share_activity").eq("id", me.id).single(),
      supabase.from("cities").select("id, name"),
      supabase.from("districts").select("city_id, name").order("name").limit(2000),
      supabase.from("consents").select("type, granted, created_at").eq("user_id", me.id).order("created_at", { ascending: false }),
    ]);
    const latest = (t: string) => (consents ?? []).find((c) => c.type === t)?.granted ?? false;
    body = (
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="👤 Profil ve gizlilik">
          <ProfileForm cities={(cities ?? []).sort((a, b) => a.name.localeCompare(b.name, "tr"))} districts={districts ?? []}
            initial={p ?? { display_name: null, city_id: null, district: null }} />
          <p className="mt-4 text-sm font-semibold text-ink/60">Beden, telefon ve yaşam tarzı bilgilerin için <Link href="/gorevler/beden" className="text-crystal underline">görevlere</Link> bak.</p>
        </Panel>
        <Panel title="🔐 Gizlilik ve izinler">
          <div className="space-y-3">
            <ConsentToggle type="aggregate_analytics" on={latest("aggregate_analytics")} label="Anonim ve toplu istatistikler"
              desc="Tercihlerim kimliğim ayırt edilemeyecek şekilde toplu raporlara dahil edilebilir. İstediğin zaman geri alabilirsin." />
            <ConsentToggle type="marketing" on={latest("marketing")} label="Kampanya e-postaları" desc="Yeni ürün ve kampanyalardan haberdar ol." />
          </div>
          <div className="mt-6 border-t-2 border-[#e6ecf7] pt-4">
            <p className="text-sm font-bold">KVKK haklarım</p>
            <p className="mt-1 text-sm text-ink/60">Verilerinin bir kopyasını istemek veya hesabını sildirmek için talep oluştur.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/profil?tab=destek&kategori=hesap" className="chip">📄 Verilerimi iste</Link>
              <Link href="/profil?tab=destek&kategori=hesap_silme" className="chip !border-red-200 !text-red-600">🗑️ Hesabımı sil</Link>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#efe3ff] to-cream">
      <AppHeader me={me} />
      <main className="mx-auto max-w-6xl p-4 pb-16">
        <nav className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <Link key={t.id} href={`/profil?tab=${t.id}`} className="chip shrink-0" data-on={t.id === tab}>{t.icon} {t.label}</Link>
          ))}
        </nav>
        {body}
      </main>
    </div>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return <section className={`game-panel p-6 ${className}`}><h2 className="mb-4 font-display text-2xl font-bold">{title}</h2>{children}</section>;
}
function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="game-panel p-3 text-center"><div className="font-display text-xl font-bold">{value}</div><p className="text-xs font-bold text-ink/50">{label}</p></div>;
}
function EmptyRow({ text, cta }: { text: string; cta: { href: string; label: string } }) {
  return <div className="p-6 text-center"><p className="font-semibold text-ink/60">{text}</p><Link href={cta.href} className="game-btn mt-4">{cta.label}</Link></div>;
}
