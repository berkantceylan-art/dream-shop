"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import type { Field } from "@/lib/quests";
import { submitQuest } from "./actions";
import Crystal from "@/components/Crystal";

export default function QuestForm({ id, fields, initial }: { id: string; fields: Field[]; initial: Record<string, unknown> }) {
  const [v, setV] = useState<Record<string, unknown>>(() => {
    const o: Record<string, unknown> = {};
    for (const f of fields) {
      const x = initial[f.key];
      o[f.key] = f.type === "phone" && typeof x === "string" ? x.replace(/^\+90/, "")
        : f.type === "multi" ? (x ?? []) : x == null ? "" : String(x);
    }
    return o;
  });
  const [err, setErr] = useState("");
  const [reward, setReward] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const set = (k: string, x: unknown) => setV((s) => ({ ...s, [k]: x }));

  if (reward !== null)
    return (
      <div className="animate-pop py-6 text-center">
        <Crystal size={70} className="animate-bob animate-glow mx-auto" />
        <h2 className="mt-3 font-display text-3xl font-bold">{reward > 0 ? `+${reward} kredi!` : "Bilgilerin güncellendi"}</h2>
        <Link href="/hesap" className="game-btn mint mt-6 w-full">Hesabıma dön</Link>
      </div>
    );

  return (
    <form className="flex flex-col gap-5" onSubmit={(e) => {
      e.preventDefault(); setErr("");
      start(async () => {
        const r = await submitQuest(id, v);
        if (r.error) setErr(r.error); else setReward(r.reward ?? 0);
      });
    }}>
      {fields.map((f) => (
        <div key={f.key} className="flex flex-col gap-2">
          <label className="font-display text-lg font-semibold">{f.label}</label>
          {f.type === "number" && (
            <div className="flex items-center gap-2">
              <input className="game-input" type="number" inputMode="decimal" min={f.min} max={f.max} step={f.step ?? 1}
                value={String(v[f.key])} onChange={(e) => set(f.key, e.target.value)} required />
              {f.suffix && <span className="font-bold text-ink/50">{f.suffix}</span>}
            </div>
          )}
          {f.type === "text" && <input className="game-input" value={String(v[f.key])} onChange={(e) => set(f.key, e.target.value)} />}
          {f.type === "phone" && (
            <div className="flex items-center gap-2">
              <span className="rounded-2xl bg-white px-3 py-3 font-bold">+90</span>
              <input className="game-input" inputMode="tel" placeholder="5XX XXX XX XX" pattern="0?5[0-9 ]{9,13}"
                value={String(v[f.key])} onChange={(e) => set(f.key, e.target.value)} required />
            </div>
          )}
          {f.type === "chips" && (
            <div className="flex flex-wrap gap-2">
              {f.options.map(([val, l]) => (
                <button type="button" key={l} className="chip" data-on={v[f.key] === val} onClick={() => set(f.key, val)}>{l}</button>
              ))}
            </div>
          )}
          {f.type === "multi" && (
            <div className="flex flex-wrap gap-2">
              {f.options.map(([val, l]) => {
                const arr = v[f.key] as string[]; const on = arr.includes(val);
                return <button type="button" key={val} className="chip" data-on={on}
                  onClick={() => set(f.key, on ? arr.filter((a) => a !== val) : [...arr, val])}>{l}</button>;
              })}
            </div>
          )}
          {f.type === "bool" && (
            <div className="flex gap-2">
              {[["true", "Evet"], ["false", "Hayır"]].map(([val, l]) => (
                <button type="button" key={val} className="chip" data-on={v[f.key] === val} onClick={() => set(f.key, val)}>{l}</button>
              ))}
            </div>
          )}
        </div>
      ))}
      {err && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{err}</p>}
      <button className="game-btn" disabled={pending}>{pending ? "Kaydediliyor…" : "Kaydet ve ödülü al"}</button>
    </form>
  );
}
