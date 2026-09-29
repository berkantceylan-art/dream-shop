"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { KIND_META } from "@/lib/catalog";
import ProductCard, { ProductThumb } from "@/components/ProductCard";
import Credits from "@/components/Credits";
import Crystal from "@/components/Crystal";
import { buyProduct, toggleWishlist, viewProduct } from "./actions";

export default function Shop({ products, wished, balance }: { products: Product[]; wished: string[]; balance: number }) {
  const [open, setOpen] = useState<Product | null>(null);
  const [kind, setKind] = useState<string>("all");
  const [wish, setWish] = useState(new Set(wished));
  const kinds = Array.from(new Set(products.map((p) => p.kind)));
  const list = kind === "all" ? products : products.filter((p) => p.kind === kind);

  return (
    <>
      {kinds.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button className="chip" data-on={kind === "all"} onClick={() => setKind("all")}>Tümü</button>
          {kinds.map((k) => (
            <button key={k} className="chip" data-on={kind === k} onClick={() => setKind(k)}>
              {KIND_META[k].icon} {KIND_META[k].label}
            </button>
          ))}
        </div>
      )}
      {list.length === 0 ? (
        <div className="game-panel p-10 text-center font-display text-xl font-bold">Raflar henüz boş 🧺</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => (
            <button key={p.id} className="text-left" onClick={() => { setOpen(p); viewProduct(p.id); }}>
              <ProductCard p={p} />
            </button>
          ))}
        </div>
      )}
      {open && (
        <ProductModal p={open} balance={balance} wished={wish.has(open.id)} onClose={() => setOpen(null)}
          onWish={(on) => {
            const s = new Set(wish); if (on) s.add(open.id); else s.delete(open.id); setWish(s);
            toggleWishlist(open.id, on);
          }} />
      )}
    </>
  );
}

function ProductModal({ p, balance, wished, onClose, onWish }: {
  p: Product; balance: number; wished: boolean; onClose: () => void; onWish: (on: boolean) => void;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const enough = balance >= p.credit_price;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="game-panel animate-pop relative w-full max-w-lg overflow-hidden !bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-3 text-2xl font-bold text-ink/40">×</button>
        {done ? (
          <div className="py-6 text-center">
            <Crystal size={70} className="animate-bob animate-glow mx-auto" />
            <h2 className="mt-3 font-display text-3xl font-bold">Artık senin! 🎉</h2>
            <p className="mt-1 font-semibold text-ink/60">{p.name} eşyalarına eklendi.</p>
            <div className="mt-6 flex gap-3">
              <button className="game-btn ghost flex-1" onClick={onClose}>Alışverişe devam</button>
              <Link href="/envanter" className="game-btn mint flex-1">Eşyalarım →</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
              <ProductThumb p={p} />
              <div>
                {p.brand && <p className="text-xs font-bold tracking-wide text-ink/50">{p.brand}</p>}
                <h2 className="font-display text-2xl font-bold leading-tight">{p.name}</h2>
                <p className="mt-1 text-sm font-semibold text-ink/50">{KIND_META[p.kind].icon} {KIND_META[p.kind].label}</p>
                {p.description && <p className="mt-3 text-sm text-ink/80">{p.description}</p>}
                <div className="mt-4"><Credits amount={p.credit_price} big /></div>
                {p.real_price_try != null && (
                  <p className="text-xs font-bold text-ink/40">Gerçek fiyatı ≈ {Number(p.real_price_try).toLocaleString("tr-TR")} ₺</p>
                )}
              </div>
            </div>
            {err && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{err}</p>}
            {!enough && <p className="mt-4 rounded-xl bg-gold/20 p-3 text-sm font-bold">Bu ürün için {(p.credit_price - balance).toLocaleString("tr-TR")} kredi daha lazım.</p>}
            <div className="mt-5 flex gap-3">
              <button className="game-btn ghost" onClick={() => onWish(!wished)} title="İstek listesi">{wished ? "💖" : "🤍"}</button>
              <button className="game-btn mint flex-1" disabled={pending || !enough} onClick={() => start(async () => {
                setErr(""); const r = await buyProduct(p.id);
                if (r.error) setErr(r.error); else setDone(true);
              })}>
                {pending ? "Kasaya gidiliyor…" : "Satın al"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
