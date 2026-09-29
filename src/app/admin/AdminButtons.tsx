"use client";
import { useTransition } from "react";
import { approveBuyer, setRole, setStoreStatus } from "./actions";

export function StoreActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const go = (s: "approved" | "suspended" | "pending") => start(async () => { const r = await setStoreStatus(id, s); if (r.error) alert(r.error); });
  return (
    <div className="flex gap-2">
      {status !== "approved" && <button disabled={pending} className="chip !border-mint !text-[#16865a]" onClick={() => go("approved")}>✓ Onayla</button>}
      {status !== "suspended" && <button disabled={pending} className="chip !border-red-300 !text-red-600" onClick={() => go("suspended")}>Askıya al</button>}
    </div>
  );
}

export function RoleSelect({ id, role }: { id: string; role: string }) {
  const [pending, start] = useTransition();
  return (
    <select disabled={pending} defaultValue={role} className="rounded-xl border-2 border-[#dbe4f5] bg-white px-2 py-1 text-sm font-bold"
      onChange={(e) => { const v = e.target.value; start(async () => { const r = await setRole(id, v); if (r.error) alert(r.error); }); }}>
      <option value="user">Kullanıcı</option>
      <option value="store_owner">Mağaza sahibi</option>
      <option value="data_buyer">Veri alıcısı</option>
      <option value="admin">Admin</option>
    </select>
  );
}

export function BuyerActions({ id, approved }: { id: string; approved: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} className={`chip ${approved ? "!border-red-300 !text-red-600" : "!border-mint !text-[#16865a]"}`}
      onClick={() => start(() => approveBuyer(id, !approved))}>{approved ? "Erişimi kaldır" : "✓ Onayla"}</button>
  );
}
