"use client";
import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

export default function AuthForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "in" ? signIn : signUp, {});

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
      <h1 className="mb-6 text-2xl font-bold">{mode === "in" ? "Giriş yap" : "Üye ol"}</h1>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        {mode === "up" && (
          <input name="username" placeholder="Kullanıcı adı" required className="rounded-lg border p-3" />
        )}
        <input name="email" type="email" placeholder="E-posta" required className="rounded-lg border p-3" />
        <input name="password" type="password" placeholder="Şifre" required className="rounded-lg border p-3" />
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.info && <p className="text-sm text-green-700">{state.info}</p>}
        <button disabled={pending} className="rounded-lg bg-black p-3 font-semibold text-white disabled:opacity-50">
          {pending ? "Bekle…" : mode === "in" ? "Giriş yap" : "Üye ol"}
        </button>
      </form>
      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-sm text-gray-600 underline">
        {mode === "in" ? "Hesabın yok mu? Üye ol" : "Zaten üye misin? Giriş yap"}
      </button>
    </div>
  );
}
