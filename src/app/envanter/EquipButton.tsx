"use client";
import { useTransition } from "react";
import { equip } from "./actions";

export default function EquipButton({ id, equipped }: { id: string; equipped: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(async () => { const r = await equip(id, !equipped); if (r.error) alert(r.error); })}
      className={`game-btn !py-2 !text-sm ${equipped ? "ghost" : "mint"}`}>
      {pending ? "…" : equipped ? "Çıkar" : "Giy"}
    </button>
  );
}
