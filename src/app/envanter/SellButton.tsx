"use client";
import { useState, useTransition } from "react";
import type { MarketSettings } from "@/lib/catalog";
import Credits from "@/components/Credits";
import { createListingAction, quickSellAction, cancelListingAction } from "@/app/pazar/actions";

export default function SellButton({ itemId, name, paid, storePrice, settings }: {
  itemId: string; name: string; paid: number; storePrice: number; settings: MarketSettings;
}) {
  const [open, setOpen] = useState(false);
  const base = paid || storePrice;
  const [price, setPrice] = useState(String(base));
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const p = Number(price) || 0;
  const fee = Math.ceil((p * settings.fee_percent) / 100);
  const quick = Math.floor((base * settings.quick_sell_pct) / 100);

  return (
    <>
      <button className="game-btn ghost !py-2 !text-sm" onClick={() => setOpen(true)}>Sat</button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onClick={() => !pending && setOpen(false)}>
          <div className="game-panel animate-pop relative w-full max-w-md !bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} className="absolute right-4 top-3 text-2xl font-bold text-ink/40">×</button>
            <h2 className="font-display text-2xl font-bold">“{name}” sat</h2>
            {msg ? (
              <div className="py-6 text-center">
                <p className="text-5xl">🎉</p>
                <p className="mt-2 font-display text-xl font-bold">{msg}</p>
                <button className="game-btn mint mt-6 w-full" onClick={() => setOpen(false)}>Tamam</button>
              </div>
            ) : (
              <>
                <section className="mt-4 rounded-2xl bg-[#f7f9fd] p-4">
                  <p className="font-display text-lg font-bold">🤝 Pazara ilan ver</p>
                  <p className="text-xs font-semibold text-ink/50">Başka oyuncular satın aldığında krediler hesabına geçer. Aldığın fiyat: {base.toLocaleString("tr-TR")}</p>
                  <input className="game-input mt-3" type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Satış fiyatı" />
                  <div className="mt-2 flex gap-2">
                    {[0.8, 1, 1.2].map((m) => (
                      <button key={m} type="button" className="chip" onClick={() => setPrice(String(Math.max(1, Math.round(base * m))))}>
                        {m === 1 ? "Aldığım fiyat" : m < 1 ? "%20 ucuz" : "%20 kârlı"}
                      </button>
                    ))}
                  </div>
                  <input className="game-input mt-2" maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Not (ör. az kullanıldı)" />
                  <p className="mt-2 text-sm font-semibold text-ink/70">
                    Eline geçecek: <b><Credits amount={Math.max(0, p - fee)} /></b> <span className="text-xs">(%{settings.fee_percent} komisyon: {fee})</span>
                  </p>
                  <button className="game-btn mt-3 w-full" disabled={pending || p < 1} onClick={() => start(async () => {
                    setErr(""); const r = await createListingAction(itemId, p, note);
                    if (r.error) setErr(r.error); else setMsg("İlanın pazarda yayında!");
                  })}>{pending ? "…" : "İlana koy"}</button>
                </section>
                <section className="mt-3 rounded-2xl bg-gold/15 p-4">
                  <p className="font-display text-lg font-bold">⚡ Hızlı sat</p>
                  <p className="text-xs font-semibold text-ink/60">Beklemeden Dream Shop&apos;a sat, anında <b>{quick.toLocaleString("tr-TR")} kredi</b> al (%{settings.quick_sell_pct}).</p>
                  <button className="game-btn ghost mt-3 w-full" disabled={pending} onClick={() => {
                    if (!confirm(`“${name}” ${quick} krediye satılsın mı? Bu işlem geri alınamaz.`)) return;
                    start(async () => { const r = await quickSellAction(itemId); if (r.error) setErr(r.error); else setMsg(`+${r.amount} kredi hesabında!`); });
                  }}>{pending ? "…" : `Hemen sat (${quick.toLocaleString("tr-TR")})`}</button>
                </section>
                {err && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{err}</p>}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function CancelListingButton({ listingId }: { listingId: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="game-btn ghost !py-2 !text-sm" disabled={pending}
      onClick={() => start(async () => { const r = await cancelListingAction(listingId); if (r.error) alert(r.error); })}>
      {pending ? "…" : "İlanı geri çek"}
    </button>
  );
}
