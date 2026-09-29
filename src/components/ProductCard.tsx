import type { Product } from "@/lib/catalog";
import { KIND_META } from "@/lib/catalog";
import Credits from "./Credits";

export function ProductThumb({ p, className = "" }: { p: Pick<Product, "thumbnail_url" | "kind" | "attributes">; className?: string }) {
  const meta = KIND_META[p.kind];
  const color = (p.attributes?.avatar as { color?: string } | undefined)?.color;
  return p.thumbnail_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.thumbnail_url} alt="" className={`aspect-square w-full rounded-2xl object-cover ${className}`} />
  ) : (
    <div className={`grid aspect-square w-full place-items-center rounded-2xl text-6xl ${className}`}
      style={{ background: color ? `radial-gradient(circle at 50% 40%, ${color}66, ${meta.bg})` : meta.bg }}>
      {meta.icon}
    </div>
  );
}

export default function ProductCard({ p, children }: { p: Product; children?: React.ReactNode }) {
  return (
    <div className="game-panel flex flex-col gap-2 p-3 transition hover:-translate-y-1">
      <ProductThumb p={p} />
      <div className="px-1">
        {p.brand && <p className="text-xs font-bold tracking-wide text-ink/50">{p.brand}</p>}
        <p className="font-display text-lg font-semibold leading-tight">{p.name}</p>
        <div className="mt-1 flex items-center justify-between">
          <Credits amount={p.credit_price} />
          {p.real_price_try != null && (
            <span className="text-xs font-bold text-ink/40">≈ {Number(p.real_price_try).toLocaleString("tr-TR")} ₺</span>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
