import Link from "next/link";

export function Stat({ label, value, sub, href, tone }: { label: string; value?: number | string; sub?: string; href?: string; tone?: "warn" }) {
  const inner = (
    <>
      <p className="text-xs font-bold uppercase tracking-wide text-ink/50">{label}</p>
      <p className={`font-display text-3xl font-bold ${tone === "warn" && Number(value) > 0 ? "text-[#e8590c]" : ""}`}>
        {typeof value === "number" ? value.toLocaleString("tr-TR") : value ?? 0}
      </p>
      {sub && <p className="text-xs font-semibold text-ink/50">{sub}</p>}
    </>
  );
  return href
    ? <Link href={href} className="game-panel block p-4 transition hover:-translate-y-0.5">{inner}</Link>
    : <div className="game-panel p-4">{inner}</div>;
}

export function Section({ title, children, right, className = "" }: { title?: string; children: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <section className={`game-panel p-5 ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="font-display text-xl font-bold">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageTitle({ icon, title, sub, right }: { icon: string; title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-bold">{icon} {title}</h1>
        {sub && <p className="text-sm font-semibold text-ink/60">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** GET form ile arama + filtreler (sayfa yenilemeli, paylaşılabilir URL) */
export function Filters({ children, action }: { children: React.ReactNode; action: string }) {
  return (
    <form action={action} className="game-panel mb-4 flex flex-wrap items-center gap-2 p-3">
      {children}
      <button className="game-btn !py-2">Filtrele</button>
      <a href={action} className="text-sm font-bold text-ink/50 hover:underline">Temizle</a>
    </form>
  );
}

export function Pager({ page, size, total, base }: { page: number; size: number; total: number; base: string }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return <p className="mt-3 text-sm font-semibold text-ink/50">{total.toLocaleString("tr-TR")} kayıt</p>;
  const link = (p: number) => `${base}${base.includes("?") ? "&" : "?"}sayfa=${p}`;
  return (
    <div className="mt-4 flex items-center gap-2 text-sm font-bold">
      <span className="text-ink/50">{total.toLocaleString("tr-TR")} kayıt · sayfa {page}/{pages}</span>
      <span className="flex-1" />
      {page > 1 && <Link className="chip" href={link(page - 1)}>← Önceki</Link>}
      {page < pages && <Link className="chip" href={link(page + 1)}>Sonraki →</Link>}
    </div>
  );
}

export function qs(params: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const fmt = (d: string | null | undefined) => d ? new Date(d).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) : "—";
export const ROLE_TR: Record<string, string> = { user: "Kullanıcı", store_owner: "Mağaza sahibi", admin: "Admin", data_buyer: "Veri alıcısı" };
export const STORE_STATUS: Record<string, string> = { pending: "⏳ Bekliyor", approved: "✅ Onaylı", suspended: "⛔ Askıda" };
