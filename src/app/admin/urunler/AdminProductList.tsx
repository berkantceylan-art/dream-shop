"use client";
import { useState, useTransition } from "react";
import type { Product } from "@/lib/catalog";
import { KIND_META } from "@/lib/catalog";
import { ProductThumb } from "@/components/ProductCard";
import Credits from "@/components/Credits";
import ProductForm, { type StoreOption, type ChainOption } from "@/components/panel/ProductForm";
import { bulkProductsAction } from "../actions";

type Row = Product & { place: string; sales: number };
type Cat = { id: number; name: string; parent_id: number | null };

export default function AdminProductList({ rows, categories, userId, stores, chains }: {
  rows: Row[]; categories: Cat[]; userId: string; stores: StoreOption[]; chains: ChainOption[];
}) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const all = sel.size === rows.length && rows.length > 0;
  const bulk = (op: "active" | "archived" | "delete") => {
    if (op === "delete" && !confirm(`${sel.size} ürün silinsin mi?`)) return;
    start(async () => { const r = await bulkProductsAction([...sel], op); setNote(r.error ?? r.note ?? "İşlem tamam ✓"); setSel(new Set()); });
  };

  return (
    <div>
      <div className="sticky top-16 z-10 mb-2 flex flex-wrap items-center gap-2 rounded-2xl bg-white/90 p-2 backdrop-blur">
        <label className="flex items-center gap-2 px-2 text-sm font-bold">
          <input type="checkbox" checked={all} onChange={() => setSel(all ? new Set() : new Set(rows.map((r) => r.id)))} className="h-4 w-4 accent-[#c24dff]" />
          {sel.size ? `${sel.size} seçili` : "Tümünü seç"}
        </label>
        {sel.size > 0 && (
          <>
            <button className="chip" disabled={pending} onClick={() => bulk("active")}>● Yayına al</button>
            <button className="chip" disabled={pending} onClick={() => bulk("archived")}>○ Yayından kaldır</button>
            <button className="chip !border-red-200 !text-red-600" disabled={pending} onClick={() => bulk("delete")}>🗑️ Sil</button>
          </>
        )}
        {note && <span className="text-sm font-semibold text-ink/60">{note}</span>}
      </div>
      <div className="divide-y divide-[#e6ecf7]">
        {rows.map((p) => (
          <div key={p.id} className="py-2">
            <div className="flex flex-wrap items-center gap-3">
              <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 accent-[#c24dff]" />
              <div className={`w-12 shrink-0 ${p.status === "active" ? "" : "opacity-40"}`}><ProductThumb p={p} className="!rounded-xl !text-xl" /></div>
              <div className="min-w-48 flex-1">
                <p className="font-bold">{p.name}</p>
                <p className="text-xs font-semibold text-ink/50">{KIND_META[p.kind].icon} {KIND_META[p.kind].label}{p.brand ? ` · ${p.brand}` : ""} · 📍 {p.place}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${p.status === "active" ? "bg-mint/20 text-[#16865a]" : "bg-[#eef1f6] text-ink/50"}`}>
                {p.status === "active" ? "● Yayında" : "○ Kapalı"}
              </span>
              <Credits amount={p.credit_price} />
              <span className="w-16 text-right text-sm font-bold text-ink/60">{p.sales} satış</span>
              <button className="chip" data-on={editing === p.id} onClick={() => setEditing(editing === p.id ? null : p.id)}>✏️</button>
            </div>
            {editing === p.id && (
              <div className="mt-2 rounded-2xl bg-[#f7f9fd] p-4">
                <ProductForm initial={p} storeId={p.store_id} categories={categories} userId={userId} stores={stores} chains={chains} onDone={() => setEditing(null)} />
              </div>
            )}
          </div>
        ))}
        {!rows.length && <p className="p-6 text-center font-semibold text-ink/50">Ürün bulunamadı.</p>}
      </div>
    </div>
  );
}
