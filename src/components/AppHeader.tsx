import Link from "next/link";
import type { Me } from "@/lib/session";
import Crystal from "./Crystal";
import Credits from "./Credits";

const NAV = [
  { href: "/profil", label: "Profil", icon: "👤" },
  { href: "/sehir", label: "Şehir", icon: "🏙️" },
  { href: "/pazar", label: "Pazar", icon: "🤝" },
  { href: "/envanter", label: "Eşyalarım", icon: "🎒" },
  { href: "/evim", label: "Evim", icon: "🏡" },
  { href: "/garaj", label: "Garaj", icon: "🚗" },
  { href: "/karakter", label: "Karakter", icon: "🧍" },
];

export default function AppHeader({ me }: { me: Me }) {
  const extra = [
    ...(me.role === "store_owner" || me.role === "user" ? [{ href: "/panel", label: me.role === "store_owner" ? "Mağazam" : "Mağaza aç", icon: "🏪" }] : []),
    ...(me.role === "admin" ? [{ href: "/admin", label: "Admin", icon: "🛠️" }] : []),
  ];
  return (
    <header className="sticky top-0 z-30 border-b-2 border-white/80 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <Link href="/profil" className="flex items-center gap-2 font-display text-lg font-bold">
          <Crystal size={22} /> <span className="hidden sm:inline">Dream Shop</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {[...NAV, ...extra].map((n) => (
            <Link key={n.href} href={n.href}
              className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold text-ink/70 hover:bg-white">
              <span>{n.icon}</span><span className="hidden md:inline">{n.label}</span>
            </Link>
          ))}
        </nav>
        <Link href="/profil?tab=cuzdan" className="shrink-0 rounded-full bg-white px-3 py-1 shadow"><Credits amount={me.balance} /></Link>
        <Link href="/profil?tab=destek" title="Hata bildir / destek" className="shrink-0 text-lg">🛟</Link>
        <form action="/auth/cikis" method="post">
          <button className="shrink-0 text-xs font-bold text-ink/50 hover:underline">Çıkış</button>
        </form>
      </div>
    </header>
  );
}
