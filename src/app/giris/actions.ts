"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; info?: string };

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email")),
    password: String(form.get("password")),
  });
  if (error) return { error: "E-posta veya şifre hatalı." };
  redirect(String(form.get("next") || "/hesap"));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const username = String(form.get("username") || "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(username))
    return { error: "Kullanıcı adı 3-20 karakter olmalı (harf, rakam, _)." };
  const password = String(form.get("password"));
  if (password.length < 8) return { error: "Şifre en az 8 karakter olmalı." };

  const supabase = await createClient();
  const { data: taken } = await supabase.from("public_profiles").select("id").eq("username", username).maybeSingle();
  if (taken) return { error: "Bu kullanıcı adı alınmış." };

  const origin = (await headers()).get("origin");
  const { data, error } = await supabase.auth.signUp({
    email: String(form.get("email")),
    password,
    options: { data: { username }, emailRedirectTo: `${origin}/auth/callback?next=/kayit-tamamla` },
  });
  if (error) return { error: error.message };
  if (!data.session) return { info: "E-postana bir doğrulama bağlantısı gönderdik. Onayladıktan sonra giriş yapabilirsin." };
  redirect("/kayit-tamamla");
}
