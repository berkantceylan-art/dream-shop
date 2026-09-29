"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import type { MarketListing } from "@/lib/catalog";
import { KIND_META } from "@/lib/catalog";
import { ProductThumb } from "@/components/ProductCard";
import Credits from "@/components/Credits";
import Crystal from "@/components/Crystal";
import { buyListingAction, cancelListingAction } from "./actions";

const ago = (d: string) => {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  return m < 60 ? `${Math.max(m, 1)} dk önce` : m < 1440 ? `${Math.floor(m / 60)} sa önce` : `${Math.floor(m / 1440)} gün önce`;
};

export default function Market({ listings, meId, balance }: { listings: MarketListing[]; meId: string; balance: number }) {
  const [open, setOpen] = useState<MarketListing | null>(null);
  if (!listings.length)
    return (
      <div className="game-panel p-10 text-center">
        <p className="text-5xl">🤝</p>
        <p className="mt-3 font-display text-2xl font-bold">Bu filtrelerde ilan yok</p>
        <p className="mt-1 font-semibold text-ink/60">Eşyalarından birini satışa çıkarıp ilk ilanı sen ver.</p>
        <Link href="/envanter" className="game-btn mt-6">Eşyalarım →</Link>
      </div>
    );
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {listings.map((l) => {
          const mine = l.seller_id === meId;
          const discount = l.store_price > 0 ? Math.round((1 - l.price / l.store_price) * 100) : 0;
          return (
            <button key={l.id} onClick={() => setOpen(l)} className="game-panel relative flex flex-col gap-2 p-3 text-left transition hover:-translate-y-1">
              <span className="absolute left-5 top-5 z-10 rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-white">2. el</span>
              {mine && <span className="absolute right-5 top-5 z-10 rounded-full bg-crystal px-2 py-0.5 text-xs font-bold text-white">Senin ilanın</span>}
              <ProductThumb p={l} />
              <div className="px-1">
                {l.brand && <p className="text-xs font-bold tracking-wide text-ink/50">{l.brand}</p>}
                <p className="font-display text-lg font-semibold leading-tight">{l.name}</p>
                <div className="mt-1 flex items-center justify-between">
                  <Credits amount={l.price} />
                  {discount > 0 && <span className="rounded-full bg-mint/20 px-2 text-xs font-bold text-[#16865a]">%{discount} ucuz</span>}
                </div>
                <p className="mt-1 text-xs font-semibold text-ink/50">@{l.seller_username} · {l.city_name ?? "—"} · {ago(l.created_at)}</p>
              </div>
            </button>
          );
        })}
      </div>
      {open && <ListingModal l={open} mine={open.seller_id === meId} balance={balance} onClose={() => setOpen(null)} />}
    </>
  );
}

function ListingModal({ l, mine, balance, onClose }: { l: MarketListing; mine: boolean; balance: number; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const [done, setDone] = useState<"bought" | "cancelled" | null>(null);
  const enough = balance >= l.price;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="game-panel animate-pop relative w-full max-w-lg !bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-3 text-2xl font-bold text-ink/40">×</button>
        {done ? (
          <div className="py-6 text-center">
            <Crystal size={64} className="animate-bob animate-glow mx-auto" />
            <h2 className="mt-3 font-display text-3xl font-bold">{done === "bought" ? "Hayırlı olsun! 🎉" : "İlan kaldırıldı"}</h2>
            <p className="mt-1 font-semibold text-ink/60">{done === "bought" ? `${l.name} artık senin.` : "Eşya tekrar envanterinde."}</p>
            <div className="mt-6 flex gap-3">
              <button className="game-btn ghost flex-1" onClick={onClose}>Pazara dön</button>
              <Link href="/envanter" className="game-btn mint flex-1">Eşyalarım →</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-[170px_1fr]">
              <ProductThumb p={l} />
              <div>
                <p className="text-xs font-bold text-ink/50">2. el · {KIND_META[l.kind].icon} {KIND_META[l.kind].label}</p>
                <h2 className="font-display text-2xl font-bold leading-tight">{l.name}</h2>
                <p className="text-sm font-semibold text-ink/60">Satıcı: @{l.seller_username} · {l.city_name ?? "—"}</p>
                {l.note && <p className="mt-2 rounded-xl bg-[#f7f9fd] p-2 text-sm">“{l.note}”</p>}
                <div className="mt-3"><Credits amount={l.price} big /></div>
                <p className="text-xs font-bold text-ink/40">Mağaza fiyatı: {l.store_price.toLocaleString("tr-TR")} kredi</p>
              </div>
            </div>
            {err && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{err}</p>}
            {!mine && !enough && <p className="mt-4 rounded-xl bg-gold/20 p-3 text-sm font-bold">{(l.price - balance).toLocaleString("tr-TR")} kredi daha lazım.</p>}
            <div className="mt-5">
              {mine ? (
                <button className="game-btn ghost w-full" disabled={pending} onClick={() => start(async () => {
                  const r = await cancelListingAction(l.id); if (r.error) setErr(r.error); else setDone("cancelled");
                })}>{pending ? "…" : "İlanı geri çek"}</button>
              ) : (
                <button className="game-btn mint w-full" disabled={pending || !enough} onClick={() => start(async () => {
                  const r = await buyListingAction(l.id); if (r.error) setErr(r.error); else setDone("bought");
                })}>{pending ? "Pazarlık yapılıyor…" : "Satın al"}</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
