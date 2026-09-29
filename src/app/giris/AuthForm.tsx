"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "./actions";
import Crystal from "@/components/Crystal";

export default function AuthForm({ next, initialMode, bonus }: { next: string; initialMode: "in" | "up"; bonus: number }) {
  const [mode, setMode] = useState(initialMode);
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "in" ? signIn : signUp, {});
  const isUp = mode === "up";

  return (
    <div className="game-panel animate-pop w-full max-w-sm p-8">
      <Link href="/" className="flex flex-col items-center">
        <Crystal size={40} className="animate-bob" />
        <span className="mt-1 font-display text-xl font-bold">Dream Shop</span>
      </Link>

      <h1 className="mt-5 text-center font-display text-3xl font-bold">
        {isUp ? "Yeni hayatına başla" : "Tekrar hoş geldin!"}
      </h1>
      <p className="mb-6 text-center text-sm font-semibold text-ink/60">
        {isUp ? `Karakterini oluştur, ${bonus.toLocaleString("tr-TR")} kredi kazan.` : "Şehrin seni bekliyor."}
      </p>

      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        {isUp && <input name="username" placeholder="Kullanıcı adı" required className="game-input" autoComplete="username" />}
        <input name="email" type="email" placeholder="E-posta" required className="game-input" autoComplete="email" />
        <input name="password" type="password" placeholder="Şifre" required className="game-input"
          autoComplete={isUp ? "new-password" : "current-password"} />
        {state.error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{state.error}</p>}
        {state.info && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{state.info}</p>}
        <button disabled={pending} className={`game-btn mt-2 ${isUp ? "" : "mint"}`}>
          {pending ? "Kapılar açılıyor…" : isUp ? "Hayatımı kur ✨" : "Şehre gir"}
        </button>
      </form>

      <button onClick={() => setMode(isUp ? "in" : "up")} className="mt-5 w-full text-sm font-bold text-crystal hover:underline">
        {isUp ? "Zaten bir hayatın var mı? Giriş yap" : "Hesabın yok mu? Yeni hayatına başla"}
      </button>
    </div>
  );
}
