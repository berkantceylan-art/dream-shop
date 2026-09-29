import { requireAdmin } from "@/lib/session";
import AppHeader from "@/components/AppHeader";
import Sidebar from "./Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, me } = await requireAdmin();
  const { data } = await supabase.rpc("admin_stats");
  const s = (data ?? {}) as Record<string, number>;
  const groups = [
    { title: "Genel", items: [
      { href: "/admin", label: "Genel bakış", icon: "📊" },
      { href: "/admin/duyurular", label: "Duyurular", icon: "📣" },
    ] },
    { title: "İnsanlar", items: [
      { href: "/admin/kullanicilar", label: "Kullanıcılar", icon: "👥" },
      { href: "/admin/destek", label: "Destek", icon: "🛟", badge: s.tickets_open },
      { href: "/admin/sikayetler", label: "Şikâyetler", icon: "🚩", badge: s.reports_open },
      { href: "/admin/veri", label: "Veri alıcıları", icon: "📈", badge: s.buyers_pending },
    ] },
    { title: "Katalog", items: [
      { href: "/admin/urunler", label: "Ürünler", icon: "📦" },
      { href: "/admin/magazalar", label: "Mağazalar", icon: "🏪", badge: s.stores_pending },
      { href: "/admin/katalog", label: "AVM · Zincir · Kategori", icon: "🏬" },
    ] },
    { title: "Ekonomi", items: [
      { href: "/admin/islemler", label: "Kredi işlemleri", icon: "💎" },
      { href: "/admin/pazar", label: "2. El Pazarı", icon: "🤝" },
      { href: "/admin/kodlar", label: "Kampanya kodları", icon: "🎟️" },
      { href: "/admin/ayarlar", label: "Ayarlar", icon: "⚙️" },
    ] },
  ];
  return (
    <div className="min-h-screen bg-[#f3f5fb]">
      <AppHeader me={me} />
      <div className="mx-auto grid max-w-[1400px] gap-4 p-4 pb-16 lg:grid-cols-[240px_1fr]">
        <Sidebar groups={groups} />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
