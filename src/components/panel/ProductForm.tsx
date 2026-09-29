"use client";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { CLOTH_COLORS, TOP_LABELS, BOTTOM_LABELS } from "@/lib/avatar";
import { saveProduct } from "./productActions";

type Cat = { id: number; name: string; parent_id: number | null };

export default function ProductForm({ storeId, categories, userId, onDone }: {
  storeId: string | null; categories: Cat[]; userId: string; onDone?: () => void;
}) {
  const [f, setF] = useState({
    name: "", brand: "", description: "", category_id: 0, credit_price: "", real_price_try: "",
    avatar_style: "", avatar_color: "",
  });
  const [img, setImg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f, v: string | number) => setF((s) => ({ ...s, [k]: v }));

  const top = [1, 2, 5].includes(f.category_id), bottom = f.category_id === 3, shoes = f.category_id === 4;
  const wearable = top || bottom || shoes;

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
    start(async () => {
      const r = await saveProduct({
        store_id: storeId, category_id: f.category_id, name: f.name, brand: f.brand, description: f.description,
        credit_price: Number(f.credit_price), real_price_try: f.real_price_try ? Number(f.real_price_try) : null,
        thumbnail_url: img, avatar_style: f.avatar_style || null, avatar_color: f.avatar_color || null,
      });
      if (r.error) return setMsg({ err: r.error });
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
            <p className="mb-2 text-sm font-bold">🧍 Karakterde nasıl görünsün?</p>
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

        {msg.err && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{msg.err}</p>}
        {msg.ok && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{msg.ok}</p>}
        <button className="game-btn" disabled={pending || uploading}>{pending ? "Rafa diziliyor…" : "Ürünü ekle"}</button>
      </div>
    </form>
  );
}
