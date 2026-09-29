"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: string; badge?: number };

export default function Sidebar({ groups }: { groups: { title: string; items: Item[] }[] }) {
  const path = usePathname();
  return (
    <nav className="game-panel h-fit p-3 lg:sticky lg:top-20">
      {groups.map((g) => (
        <div key={g.title} className="mb-3">
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-ink/40">{g.title}</p>
          {g.items.map((i) => {
            const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
            return (
              <Link key={i.href} href={i.href}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${active ? "bg-crystal text-white" : "text-ink/80 hover:bg-white"}`}>
                <span>{i.icon}</span><span className="flex-1">{i.label}</span>
                {!!i.badge && <span className={`rounded-full px-2 text-xs ${active ? "bg-white/30" : "bg-[#ff922b] text-white"}`}>{i.badge}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
