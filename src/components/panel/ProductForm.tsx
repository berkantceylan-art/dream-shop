"use client";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { CLOTH_COLORS, TOP_LABELS, BOTTOM_LABELS } from "@/lib/avatar";
import { CAR_SHAPES, HOME_SIZES } from "@/lib/home";
import { saveProduct } from "./productActions";
import type { Product } from "@/lib/catalog";

type Cat = { id: number; name: string; parent_id: number | null };

export type StoreOption = { id: string; label: string; group: string };
export type ChainOption = { id: string; label: string };

export default function ProductForm({ storeId, categories, userId, onDone, initial, stores, chains }: {
  storeId: string | null; categories: Cat[]; userId: string; onDone?: () => void; initial?: Product;
  /** Verilirse (admin) ürünün satılacağı yer seçilebilir. */
  stores?: StoreOption[];
  chains?: ChainOption[];
}) {
  const [place, setPlace] = useState<string>(
    initial?.chain_id ? `c:${initial.chain_id}` : initial?.store_id ? `s:${initial.store_id}` : storeId ? `s:${storeId}` : "");
  const at = initial?.attributes ?? {};
  const avRaw = (at.avatar ?? at.car ?? at.home ?? at.furniture ?? {}) as { style?: string; shape?: string; size?: string; color?: string };
  const av = { style: avRaw.style ?? avRaw.shape ?? avRaw.size, color: avRaw.color };
  const [f, setF] = useState({
    name: initial?.name ?? "", brand: initial?.brand ?? "", description: initial?.description ?? "",
    category_id: initial?.category_id ?? 0,
    credit_price: initial ? String(initial.credit_price) : "",
    real_price_try: initial?.real_price_try != null ? String(initial.real_price_try) : "",
    avatar_style: av.style ?? "", avatar_color: av.color ?? "",
  });
  const [img, setImg] = useState<string | null>(initial?.thumbnail_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f, v: string | number) => setF((s) => ({ ...s, [k]: v }));

  const top = [1, 2, 5].includes(f.category_id), bottom = f.category_id === 3, shoes = f.category_id === 4;
  const wearable = top || bottom || shoes;
  const isCar = f.category_id === 7, isHouse = f.category_id === 8, isFurniture = f.category_id === 9;
  const HOME_COLORS = ["#fff1c7", "#ffe3f1", "#d8ecff", "#d9f7e8", "#efe3ff", "#ffffff", "#ffe0cc"];

  async function upload(file: File) {
    if (file.size > 3 * 1024 * 1024) return setMsg({ err: "Görsel en fazla 3 MB olabilir." });
    setUploading(true); setMsg({});
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return setMsg({ err: "Yükleme başarısız: " + error.message });
    setImg(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg({});
    if (wearable && !f.avatar_color) return setMsg({ err: "Giyilebilir ürünlerde karakterdeki rengi seçmelisin." });
    if ((top || bottom) && !f.avatar_style) return setMsg({ err: "Karakterde görünecek modeli seç (ör. Tişört, Kot pantolon)." });
    start(async () => {
      const r = await saveProduct({
        id: initial?.id,
        store_id: stores ? (place.startsWith("s:") ? place.slice(2) : null) : initial ? initial.store_id : storeId,
        chain_id: stores ? (place.startsWith("c:") ? place.slice(2) : null) : initial?.chain_id ?? null, category_id: f.category_id, name: f.name, brand: f.brand, description: f.description,
        credit_price: Number(f.credit_price), real_price_try: f.real_price_try ? Number(f.real_price_try) : null,
        thumbnail_url: img, avatar_style: f.avatar_style || null, avatar_color: f.avatar_color || null,
      });
      if (r.error) return setMsg({ err: r.error });
      if (initial) { onDone?.(); return; }
      setMsg({ ok: `“${f.name}” rafa kondu ✅` });
      setF({ name: "", brand: "", description: "", category_id: f.category_id, credit_price: "", real_price_try: "", avatar_style: "", avatar_color: "" });
      setImg(null); onDone?.();
    });
  }

  const parents = categories.filter((c) => !c.parent_id);
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[160px_1fr]">
      <label className="grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-[#c9d3ea] bg-white text-center text-sm font-bold text-ink/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : uploading ? "Yükleniyor…" : <>📷<br />Görsel ekle</>}
        <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </label>
      <div className="grid gap-3">
        {stores && (
          <div>
            <p className="mb-1 text-sm font-bold">📍 Nerede satılsın?</p>
            <select className="game-input" value={place} onChange={(e) => setPlace(e.target.value)}>
              <option value="">🛍️ Dream Outlet — tüm şehirlerde</option>
              {!!chains?.length && (
                <optgroup label="Zincirler — 81 ildeki tüm şubelerde">
                  {chains.map((c) => <option key={c.id} value={`c:${c.id}`}>{c.label}</option>)}
                </optgroup>
              )}
              {Array.from(new Set(stores.map((s) => s.group))).map((g) => (
                <optgroup key={g} label={`${g} — tek mağaza`}>
                  {stores.filter((s) => s.group === g).map((s) => <option key={s.id} value={`s:${s.id}`}>{s.label}</option>)}
                </optgroup>
              ))}
            </select>
            {!stores.length && <p className="mt-1 text-xs font-semibold text-ink/50">AVM'de satmak için önce Mağazalar sekmesinden bir mağaza aç.</p>}
          </div>
        )}
        <input className="game-input" placeholder="Ürün adı *" value={f.name} onChange={(e) => set("name", e.target.value)} required />
        <div className="grid grid-cols-2 gap-3">
          <input className="game-input" placeholder="Marka" value={f.brand} onChange={(e) => set("brand", e.target.value)} />
          <select className="game-input" value={f.category_id} onChange={(e) => set("category_id", Number(e.target.value))} required>
            <option value={0} disabled>Kategori *</option>
            {parents.map((p) => {
              const kids = categories.filter((c) => c.parent_id === p.id);
              return kids.length ? (
                <optgroup key={p.id} label={p.name}>{kids.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</optgroup>
              ) : <option key={p.id} value={p.id}>{p.name}</option>;
            })}
          </select>
        </div>
        <textarea className="game-input min-h-20" placeholder="Açıklama" value={f.description} onChange={(e) => set("description", e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <input className="game-input" type="number" min={0} placeholder="Kredi fiyatı *" value={f.credit_price} onChange={(e) => set("credit_price", e.target.value)} required />
          <input className="game-input" type="number" min={0} step="0.01" placeholder="Gerçek fiyat (₺)" value={f.real_price_try} onChange={(e) => set("real_price_try", e.target.value)} />
        </div>

        {wearable && (
          <div className="rounded-2xl bg-crystal/5 p-3">
            <p className="mb-2 text-sm font-bold">🧍 Karakterde nasıl görünsün? *</p>
            {(top || bottom) && (
              <div className="mb-2 flex flex-wrap gap-2">
                {Object.entries(top ? TOP_LABELS : BOTTOM_LABELS).map(([k, l]) => (
                  <button type="button" key={k} className="chip" data-on={f.avatar_style === k} onClick={() => set("avatar_style", k)}>{l}</button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {CLOTH_COLORS.map((c) => (
                <button type="button" key={c} onClick={() => set("avatar_color", c)} aria-label={c}
                  className={`h-8 w-8 rounded-full border-4 ${f.avatar_color === c ? "border-crystal" : "border-white"}`} style={{ background: c }} />
              ))}
              <input type="color" value={f.avatar_color || "#ffffff"} onChange={(e) => set("avatar_color", e.target.value)} className="h-8 w-10" />
            </div>
          </div>
        )}

        {(isCar || isHouse || isFurniture) && (
          <div className="rounded-2xl bg-[#d8ecff]/60 p-3">
            <p className="mb-2 text-sm font-bold">{isCar ? "🚗 Garajda nasıl görünsün?" : isHouse ? "🏡 Ev tipi ve duvar rengi" : "🛋️ Evde hangi renkte görünsün?"}</p>
            {!isFurniture && (
              <div className="mb-2 flex flex-wrap gap-2">
                {Object.entries(isCar ? CAR_SHAPES : Object.fromEntries(Object.entries(HOME_SIZES).map(([k, v]) => [k, v.label]))).map(([k, l]) => (
                  <button type="button" key={k} className="chip" data-on={f.avatar_style === k} onClick={() => set("avatar_style", k)}>{l}</button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {(isHouse ? HOME_COLORS : CLOTH_COLORS).map((c) => (
                <button type="button" key={c} onClick={() => set("avatar_color", c)} aria-label={c}
                  className={`h-8 w-8 rounded-full border-4 ${f.avatar_color === c ? "border-crystal" : "border-white"}`} style={{ background: c }} />
              ))}
            </div>
          </div>
        )}

        {msg.err && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{msg.err}</p>}
        {msg.ok && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{msg.ok}</p>}
        <button className="game-btn" disabled={pending || uploading}>{pending ? "Kaydediliyor…" : initial ? "Değişiklikleri kaydet" : "Ürünü ekle"}</button>
      </div>
    </form>
  );
}
