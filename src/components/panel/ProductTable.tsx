"use client";
import { useTransition } from "react";
import type { Product } from "@/lib/catalog";
import { KIND_META } from "@/lib/catalog";
import { ProductThumb } from "@/components/ProductCard";
import Credits from "@/components/Credits";
import { setProductStatus } from "./productActions";

export default function ProductTable({ products, sales = {} }: { products: (Product & { store_name?: string })[]; sales?: Record<string, number> }) {
  const [pending, start] = useTransition();
  if (!products.length) return <p className="p-6 text-center font-semibold text-ink/50">Henüz ürün yok.</p>;
  return (
    <div className="divide-y divide-[#e6ecf7]">
      {products.map((p) => (
        <div key={p.id} className={`flex items-center gap-3 py-3 ${p.status !== "active" ? "opacity-50" : ""}`}>
          <div className="w-14 shrink-0"><ProductThumb p={p} className="!text-2xl !rounded-xl" /></div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{p.name}</p>
            <p className="text-xs font-semibold text-ink/50">
              {KIND_META[p.kind].label}{p.brand ? ` · ${p.brand}` : ""}{p.store_name ? ` · ${p.store_name}` : ""}
            </p>
          </div>
          <Credits amount={p.credit_price} />
          <span className="w-16 text-right text-sm font-bold text-ink/60">{sales[p.id] ?? 0} satış</span>
          <button disabled={pending} className="chip" onClick={() => start(async () => {
            await setProductStatus(p.id, p.status === "active" ? "archived" : "active");
          })}>{p.status === "active" ? "Kaldır" : "Yayına al"}</button>
        </div>
      ))}
    </div>
  );
}
