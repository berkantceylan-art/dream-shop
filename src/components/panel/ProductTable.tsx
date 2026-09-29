"use client";
import { useState, useTransition } from "react";
import type { Product } from "@/lib/catalog";
import { KIND_META } from "@/lib/catalog";
import { ProductThumb } from "@/components/ProductCard";
import Credits from "@/components/Credits";
import ProductForm from "./ProductForm";
import { deleteProduct, setProductStatus } from "./productActions";

type Cat = { id: number; name: string; parent_id: number | null };

export default function ProductTable({ products, sales = {}, categories, userId }: {
  products: (Product & { store_name?: string })[]; sales?: Record<string, number>; categories: Cat[]; userId: string;
}) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [note, setNote] = useState("");
  if (!products.length) return <p className="p-6 text-center font-semibold text-ink/50">Henüz ürün yok.</p>;

  return (
    <div className="divide-y divide-[#e6ecf7]">
      {note && <p className="mb-2 rounded-xl bg-gold/20 p-3 text-sm font-bold">{note}</p>}
      {products.map((p) => {
        const live = p.status === "active";
        return (
          <div key={p.id} className="py-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className={`w-14 shrink-0 ${live ? "" : "opacity-50"}`}><ProductThumb p={p} className="!text-2xl !rounded-xl" /></div>
              <div className="min-w-40 flex-1">
                <p className="truncate font-bold">{p.name}</p>
                <p className="text-xs font-semibold text-ink/50">
                  {KIND_META[p.kind].label}{p.brand ? ` · ${p.brand}` : ""}{p.store_name ? ` · ${p.store_name}` : ""}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${live ? "bg-mint/20 text-[#16865a]" : "bg-[#eef1f6] text-ink/50"}`}>
                {live ? "● Yayında" : "○ Yayında değil"}
              </span>
              <Credits amount={p.credit_price} />
              <span className="w-14 text-right text-sm font-bold text-ink/60">{sales[p.id] ?? 0} satış</span>
              <div className="flex gap-1.5">
                <button disabled={pending} className="chip" onClick={() => start(async () => {
                  await setProductStatus(p.id, live ? "archived" : "active");
                })}>{live ? "Yayından kaldır" : "Yayına al"}</button>
                <button className="chip" data-on={editing === p.id} onClick={() => setEditing(editing === p.id ? null : p.id)}>✏️ Düzenle</button>
                <button disabled={pending} className="chip !border-red-200 !text-red-600" onClick={() => {
                  if (!confirm(`“${p.name}” silinsin mi?`)) return;
                  start(async () => {
                    const r = await deleteProduct(p.id);
                    if (r.error) setNote(r.error);
                    else if (r.archived) setNote(`“${p.name}” satıldığı için silinemedi; oyuncuların eşyalarında kalacak. Yayından kaldırıldı.`);
                    else setNote("");
                  });
                }}>🗑️ Sil</button>
              </div>
            </div>
            {editing === p.id && (
              <div className="mt-3 rounded-2xl bg-[#f7f9fd] p-4">
                <ProductForm initial={p} storeId={p.store_id} categories={categories} userId={userId} onDone={() => setEditing(null)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
