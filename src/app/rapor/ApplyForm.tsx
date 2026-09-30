"use client";
import { useActionState } from "react";
import { applyBuyerAction, type ApplyState } from "./actions";

export default function ApplyForm({ plans = [] }: { plans?: { id: string; name: string }[] }) {
  const [s, action, pending] = useActionState<ApplyState, FormData>(applyBuyerAction, {});
  if (s.ok) return <p className="rounded-xl bg-emerald-50 p-4 font-bold text-emerald-700">Başvurun alındı. Onaylandığında raporlara erişebileceksin.</p>;
  return (
    <form action={action} className="flex flex-col gap-3">
      <input name="company" className="game-input" placeholder="Şirket adı *" required />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="tax_no" className="game-input" placeholder="Vergi numarası" />
        <input name="email" type="email" className="game-input" placeholder="Kurumsal e-posta" />
      </div>
      <select name="sector" className="game-input" defaultValue="">
        <option value="">Sektör</option>
        {["Perakende", "Moda & Tekstil", "Otomotiv", "Gayrimenkul", "Mobilya & Ev", "Elektronik", "Gıda", "Kozmetik", "Ajans / Araştırma", "Diğer"].map((x) => <option key={x}>{x}</option>)}
      </select>
      <select name="plan" className="game-input" defaultValue="pro">
        <option value="">Rapor başına ödeme (paketsiz)</option>
        {plans.map((p) => <option key={p.id} value={p.id}>Paket: {p.name}</option>)}
      </select>
      <textarea name="purpose" className="game-input min-h-24" placeholder="Raporları hangi amaçla kullanacaksınız?" />
      <label className="flex gap-2 text-sm font-semibold">
        <input type="checkbox" name="terms" className="h-5 w-5 accent-[#c24dff]" />
        <span>Raporların yalnızca <b>anonim ve toplu</b> veriler içerdiğini; verileri kişileri yeniden tanımlamaya çalışmak için kullanmayacağımı ve üçüncü kişilerle paylaşmayacağımı kabul ediyorum.</span>
      </label>
      {s.error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{s.error}</p>}
      <button className="game-btn" disabled={pending}>{pending ? "Gönderiliyor…" : "Başvur"}</button>
    </form>
  );
}
