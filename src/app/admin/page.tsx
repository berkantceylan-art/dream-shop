import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { PRODUCT_COLS, type Product } from "@/lib/catalog";
import AppHeader from "@/components/AppHeader";
import ProductForm from "@/components/panel/ProductForm";
import ProductTable from "@/components/panel/ProductTable";
import { StoreActions, RoleSelect } from "./AdminButtons";
import { addMall, replyTicket } from "./actions";
import { CreateGiftForm } from "@/app/profil/Forms";
import AdminStoreForm from "./AdminStoreForm";
import type { StoreOption, ChainOption } from "@/components/panel/ProductForm";
import { placeMeta } from "@/lib/places";

const TABS = [
  { id: "genel", label: "Genel bakış", icon: "📊" },
  { id: "magazalar", label: "Mağazalar", icon: "🏪" },
  { id: "urunler", label: "Ürünler", icon: "📦" },
  { id: "kullanicilar", label: "Kullanıcılar", icon: "👥" },
  { id: "avm", label: "AVM'ler", icon: "🏬" },
  { id: "destek", label: "Destek", icon: "🛟" },
  { id: "kodlar", label: "Kampanya kodları", icon: "🎟️" },
];
const STATUS: Record<string, string> = { pending: "⏳ Bekliyor", approved: "✅ Onaylı", suspended: "⛔ Askıda" };
const ROLE_TR: Record<string, string> = { user: "Kullanıcı", store_owner: "Mağaza sahibi", admin: "Admin", data_buyer: "Veri alıcısı" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const { supabase, me } = await requireAdmin();
  const { tab = "genel", q = "" } = await searchParams;

  let content: React.ReactNode = null;

  if (tab === "genel") {
    const [{ data: s }, { data: pending }] = await Promise.all([
      supabase.rpc("admin_stats"),
      supabase.from("stores").select("id, name, created_at, status, cities(name), malls(name)").eq("status", "pending").order("created_at"),
    ]);
    const st = (s ?? {}) as Record<string, number>;
    content = (
      <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Kullanıcı" value={st.users} sub={`+${st.users_today ?? 0} bugün`} />
          <Stat label="Onaylı mağaza" value={st.stores} sub={`${st.stores_pending ?? 0} bekliyor`} />
          <Stat label="Aktif ürün" value={st.products} />
          <Stat label="Satın alma" value={st.purchases} sub={`${(st.credits_spent ?? 0).toLocaleString("tr-TR")} kredi`} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Analiz rızası" value={st.analytics_consent}
            sub={st.users ? `%${Math.round((st.analytics_consent / st.users) * 100)} oran` : ""} />
        </div>
        <section className="game-panel mt-6 p-6">
          <h2 className="mb-3 font-display text-2xl font-bold">⏳ Onay bekleyen mağazalar</h2>
          {pending?.length ? <StoreRows stores={pending} /> : <p className="font-semibold text-ink/50">Bekleyen başvuru yok 🎉</p>}
        </section>
      </>
    );
  }

  if (tab === "magazalar") {
    const [{ data: stores }, { data: cities }, { data: malls }] = await Promise.all([
      supabase.from("stores").select("id, name, created_at, status, cities(name), malls(name)").is("chain_id", null).order("created_at", { ascending: false }).limit(200),
      supabase.from("cities").select("id, name"),
      supabase.from("malls").select("id, name, city_id").order("name"),
    ]);
    const { data: districts } = await supabase.from("districts").select("city_id, name").order("name").limit(2000);
    content = (
      <>
        <section className="game-panel p-6">
          <h2 className="font-display text-2xl font-bold">➕ Yeni mağaza aç</h2>
          <p className="mb-4 text-sm font-semibold text-ink/50">Admin tarafından açılan mağazalar onaysız, doğrudan yayına girer.</p>
          <AdminStoreForm cities={(cities ?? []).sort((a, b) => a.name.localeCompare(b.name, "tr"))} malls={malls ?? []} districts={districts ?? []} />
        </section>
        <section className="game-panel mt-4 p-6">
          <p className="mb-2 text-sm font-semibold text-ink/50">Zincir şubeleri (81 ildeki otomatik dükkânlar) bu listede gösterilmez.</p>
          <StoreRows stores={stores ?? []} />
        </section>
      </>
    );
  }

  if (tab === "urunler") {
    const [{ data: products }, { data: categories }, { data: storeList }, { data: chainList }] = await Promise.all([
      supabase.from("products").select(`${PRODUCT_COLS}, stores(name, cities(name), malls(name)), chains(name)`).order("created_at", { ascending: false }).limit(300),
      supabase.from("categories").select("id, name, parent_id").order("id"),
      supabase.from("stores").select("id, name, cities(name), malls(name)").eq("status", "approved").is("chain_id", null).order("name"),
      supabase.from("chains").select("id, name, place_type").order("name"),
    ]);
    const chainOptions: ChainOption[] = (chainList ?? []).map((c) => ({ id: c.id, label: `${placeMeta(c.place_type)?.icon ?? "🏷️"} ${c.name}` }));
    type Loc = { name: string; cities: { name: string } | null; malls: { name: string } | null } | null;
    const where = (s: Loc) => s ? `${s.name} (${s.cities?.name} · ${s.malls?.name ?? "Cadde"})` : "Dream Outlet";
    const rows = (products ?? []).map((p) => {
      const chain = (p.chains as unknown as { name: string } | null)?.name;
      return { ...(p as unknown as Product), store_name: chain ? `${chain} (tüm şubeler)` : where(p.stores as unknown as Loc) };
    });
    const storeOptions: StoreOption[] = (storeList ?? []).map((st) => {
      const l = st as unknown as NonNullable<Loc> & { id: string };
      return { id: l.id, label: `${l.name} — ${l.malls?.name ?? "Cadde"}`, group: l.cities?.name ?? "" };
    }).sort((a, b) => a.group.localeCompare(b.group, "tr"));
    content = (
      <>
        <section className="game-panel p-6">
          <h2 className="font-display text-2xl font-bold">➕ Yeni ürün</h2>
          <p className="mb-4 text-sm font-semibold text-ink/50">
            Dream Outlet ve zincirler tüm şehirlerde görünür. Tek bir mağaza seçersen ürün yalnızca orada satılır.
          </p>
          <ProductForm storeId={null} categories={categories ?? []} userId={me.id} stores={storeOptions} chains={chainOptions} />
        </section>
        <section className="game-panel mt-4 p-6">
          <h2 className="mb-2 font-display text-2xl font-bold">Tüm ürünler</h2>
          <ProductTable products={rows} categories={categories ?? []} userId={me.id} stores={storeOptions} chains={chainOptions} />
        </section>
      </>
    );
  }

  if (tab === "kullanicilar") {
    let query = supabase.from("profiles").select("id, username, display_name, role, created_at, cities(name)")
      .order("created_at", { ascending: false }).limit(100);
    if (q) query = query.ilike("username", `%${q}%`);
    const { data: users } = await query;
    content = (
      <section className="game-panel p-6">
        <form className="mb-4 flex gap-2">
          <input type="hidden" name="tab" value="kullanicilar" />
          <input name="q" defaultValue={q} placeholder="Kullanıcı adı ara…" className="game-input" />
          <button className="game-btn ghost !py-2">Ara</button>
        </form>
        <div className="divide-y divide-[#e6ecf7]">
          {(users ?? []).map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-3">
              <div className="flex-1">
                <p className="font-bold">@{u.username} {u.display_name && <span className="font-semibold text-ink/50">· {u.display_name}</span>}</p>
                <p className="text-xs font-semibold text-ink/50">
                  {(u.cities as unknown as { name: string } | null)?.name ?? "—"} · {new Date(u.created_at).toLocaleDateString("tr-TR")}
                </p>
              </div>
              {u.id === me.id ? <span className="chip">{ROLE_TR[u.role]}</span> : <RoleSelect id={u.id} role={u.role} />}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (tab === "avm") {
    const [{ data: cities }, { data: malls }] = await Promise.all([
      supabase.from("cities").select("id, name"),
      supabase.from("malls").select("id, name, district, cities(name)").order("created_at", { ascending: false }).limit(200),
    ]);
    content = (
      <>
        <section className="game-panel p-6">
          <h2 className="mb-4 font-display text-2xl font-bold">➕ Yeni AVM</h2>
          <form action={addMall} className="grid gap-3 sm:grid-cols-4">
            <select name="city_id" className="game-input" required>
              {(cities ?? []).sort((a, b) => a.name.localeCompare(b.name, "tr")).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input name="name" className="game-input" placeholder="AVM adı" required />
            <input name="district" className="game-input" placeholder="İlçe" />
            <button className="game-btn">Ekle</button>
          </form>
        </section>
        <section className="game-panel mt-4 p-6">
          <div className="divide-y divide-[#e6ecf7]">
            {(malls ?? []).map((m) => (
              <p key={m.id} className="py-2 font-semibold">
                {m.name} <span className="text-ink/50">· {(m.cities as unknown as { name: string } | null)?.name} {m.district ? `/ ${m.district}` : ""}</span>
              </p>
            ))}
          </div>
        </section>
      </>
    );
  }

  if (tab === "destek") {
    const { data: tickets } = await supabase.from("support_tickets")
      .select("id, user_id, category, subject, message, page_url, status, admin_reply, created_at")
      .order("status").order("created_at", { ascending: false }).limit(200);
    const ids = Array.from(new Set((tickets ?? []).map((t) => t.user_id)));
    const { data: people } = ids.length ? await supabase.from("public_profiles").select("id, username").in("id", ids) : { data: [] };
    const uname = new Map((people ?? []).map((p) => [p.id, p.username]));
    const CAT: Record<string, string> = { hata: "🐞 Hata", oneri: "💡 Öneri", odeme: "💳 Ödeme", hesap: "👤 Hesap", hesap_silme: "🗑️ Hesap silme", diger: "💬 Diğer" };
    content = (
      <section className="space-y-3">
        {!tickets?.length && <p className="game-panel p-6 font-semibold text-ink/50">Talep yok 🎉</p>}
        {(tickets ?? []).map((t) => (
          <div key={t.id} className={`game-panel p-5 ${t.status === "closed" ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip">{CAT[t.category] ?? t.category}</span>
              <b className="flex-1">{t.subject}</b>
              <span className="text-xs font-bold text-ink/50">@{uname.get(t.user_id)} · {new Date(t.created_at).toLocaleString("tr-TR")}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink/80">{t.message}</p>
            {t.page_url && <p className="mt-1 text-xs font-bold text-ink/50">Sayfa: {t.page_url}</p>}
            <form action={replyTicket} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="id" value={t.id} />
              <input name="reply" defaultValue={t.admin_reply ?? ""} placeholder="Yanıtın…" className="game-input" />
              <select name="status" defaultValue={t.status === "open" ? "answered" : t.status} className="game-input sm:!w-40">
                <option value="answered">Yanıtlandı</option><option value="closed">Kapat</option><option value="open">Açık kalsın</option>
              </select>
              <button className="game-btn !py-2">Kaydet</button>
            </form>
          </div>
        ))}
      </section>
    );
  }

  if (tab === "kodlar") {
    const { data: codes } = await supabase.from("gift_cards").select("code, amount, message, uses, max_uses, is_promo, expires_at, created_at")
      .order("created_at", { ascending: false }).limit(100);
    content = (
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
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f5fb]">
      <AppHeader me={me} />
      <main className="mx-auto max-w-6xl p-4 pb-16">
        <h1 className="font-display text-4xl font-bold">🛠️ Yönetim paneli</h1>
        <nav className="my-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Link key={t.id} href={`/admin?tab=${t.id}`} className="chip" data-on={t.id === tab}>{t.icon} {t.label}</Link>
          ))}
        </nav>
        {content}
      </main>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value?: number; sub?: string }) {
  return (
    <div className="game-panel p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-ink/50">{label}</p>
      <p className="font-display text-4xl font-bold">{(value ?? 0).toLocaleString("tr-TR")}</p>
      {sub && <p className="text-sm font-semibold text-ink/50">{sub}</p>}
    </div>
  );
}

type StoreRow = { id: string; name: string; created_at: string; status: string; cities: unknown; malls: unknown };
function StoreRows({ stores }: { stores: StoreRow[] }) {
  return (
    <div className="divide-y divide-[#e6ecf7]">
      {stores.map((s) => (
        <div key={s.id} className="flex flex-wrap items-center gap-3 py-3">
          <div className="min-w-48 flex-1">
            <p className="font-bold">{s.name}</p>
            <p className="text-xs font-semibold text-ink/50">
              {(s.malls as { name: string } | null)?.name ?? "Cadde"} · {(s.cities as { name: string } | null)?.name} · {new Date(s.created_at).toLocaleDateString("tr-TR")}
            </p>
          </div>
          <span className="text-sm font-bold">{STATUS[s.status]}</span>
          <StoreActions id={s.id} status={s.status} />
        </div>
      ))}
    </div>
  );
}
