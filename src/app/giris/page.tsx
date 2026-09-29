import AuthForm from "./AuthForm";
import SkyScene from "@/components/SkyScene";
import { createClient } from "@/lib/supabase/server";
import { getSignupBonus } from "@/lib/settings";

export default async function GirisPage({ searchParams }: { searchParams: Promise<{ next?: string; mod?: string }> }) {
  const { next, mod } = await searchParams;
  const bonus = await getSignupBonus(await createClient());
  return (
    <SkyScene>
      <main className="flex min-h-screen items-center justify-center p-4 pb-64">
        <AuthForm next={next?.startsWith("/") ? next : "/hesap"} initialMode={mod === "kayit" ? "up" : "in"} bonus={bonus} />
      </main>
    </SkyScene>
  );
}
