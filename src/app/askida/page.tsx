import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SkyScene from "@/components/SkyScene";

export default async function AskidaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");
  const { data: p } = await supabase.from("profiles").select("banned_at, ban_reason").eq("id", user.id).single();
  if (!p?.banned_at) redirect("/profil");
  return (
    <SkyScene>
      <main className="flex min-h-screen items-center justify-center p-4 pb-64">
        <div className="game-panel max-w-md p-8 text-center">
          <p className="text-6xl">⛔</p>
          <h1 className="mt-3 font-display text-3xl font-bold">Hesabın askıya alındı</h1>
          {p.ban_reason && <p className="mt-2 font-semibold text-ink/70">Neden: {p.ban_reason}</p>}
          <p className="mt-3 text-sm text-ink/60">Bunun bir hata olduğunu düşünüyorsan Dream Shop destek ekibiyle iletişime geçebilirsin.</p>
          <form action="/auth/cikis" method="post" className="mt-6"><button className="game-btn ghost">Çıkış yap</button></form>
        </div>
      </main>
    </SkyScene>
  );
}
