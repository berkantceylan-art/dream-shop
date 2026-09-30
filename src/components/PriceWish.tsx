"use client";
import { useState, useTransition } from "react";
import { removePriceWishAction, setPriceWishAction } from "@/app/magaza/[slug]/actions";
import Crystal from "./Crystal";

/** "Bu fiyata olsa alırım" — kullanıcının kabul edeceği fiyatı toplar, isterse fiyat düşünce haber verir. */
export default function PriceWish({ productId, listPrice, initial, onSaved }: {
  productId: string; listPrice: number; initial?: { price: number; notify: boolean } | null; onSaved?: (w: { price: number; notify: boolean } | null) => void;
}) {
  const [open, setOpen] = useState(!!initial);
  const [price, setPrice] = useState(initial ? String(initial.price) : String(Math.round(listPrice * 0.8)));
  const [notify, setNotify] = useState(initial?.notify ?? true);
  const [saved, setSaved] = useState(initial ?? null);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const n = Number(price) || 0;
  const pct = listPrice ? Math.round((1 - n / listPrice) * 100) : 0;

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="mt-3 w-full rounded-2xl border-2 border-dashed border-crystal/40 bg-crystal/5 p-3 text-left text-sm font-bold text-crystal hover:bg-crystal/10">
        💰 Bu fiyata olsa alırım… <span className="font-semibold text-ink/50">— kendi fiyatını söyle</span>
      </button>
    );

  return (
    <div className="mt-3 rounded-2xl bg-crystal/5 p-3">
      <p className="text-sm font-bold">💰 Bu fiyata olsa alırım</p>
      <div className="mt-2 flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2"><Crystal size={16} /></span>
          <input type="number" min={1} max={listPrice - 1} value={price} onChange={(e) => { setPrice(e.target.value); setErr(""); }}
            className="game-input !py-2 !pl-9" />
        </div>
        {n > 0 && n < listPrice && <span className="shrink-0 rounded-full bg-mint/20 px-2 py-1 text-xs font-bold text-[#16865a]">%{pct} indirim</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[10, 20, 30].map((d) => (
          <button key={d} type="button" className="chip !py-0.5 text-xs" onClick={() => setPrice(String(Math.round(listPrice * (1 - d / 100))))}>%{d} ucuz</button>
        ))}
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 accent-[#c24dff]" />
        🔔 Fiyat bu seviyeye inince bana haber ver
      </label>
      {err && <p className="mt-2 rounded-xl bg-red-50 p-2 text-xs font-semibold text-red-600">{err}</p>}
      <div className="mt-2 flex gap-2">
        <button className="game-btn flex-1 !py-2 !text-sm" disabled={pending || n < 1 || n >= listPrice} onClick={() => start(async () => {
          const r = await setPriceWishAction(productId, n, notify);
          if (r.error) setErr(r.error); else { setSaved({ price: n, notify }); onSaved?.({ price: n, notify }); }
        })}>{pending ? "…" : saved ? "Güncelle" : "Teklifimi kaydet"}</button>
        {saved && (
          <button className="game-btn ghost !py-2 !text-sm" disabled={pending} onClick={() => start(async () => {
            await removePriceWishAction(productId); setSaved(null); onSaved?.(null); setOpen(false);
          })}>Kaldır</button>
        )}
      </div>
      {saved && <p className="mt-2 text-xs font-bold text-[#16865a]">✓ {saved.price.toLocaleString("tr-TR")} kredi teklifin kayıtlı{saved.notify ? " · fiyat düşünce haber vereceğiz" : ""}.</p>}
      <p className="mt-1 text-[11px] font-semibold text-ink/40">Teklifin mağazaya kimliğin olmadan, toplu istatistik olarak iletilir.</p>
    </div>
  );
}
