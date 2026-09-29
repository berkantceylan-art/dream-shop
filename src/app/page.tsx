import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SkyScene from "@/components/SkyScene";
import Crystal from "@/components/Crystal";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/hesap");

  return (
    <SkyScene>
      <main className="flex min-h-screen flex-col items-center justify-center p-6 pb-72 text-center">
        <Crystal size={64} className="animate-bob animate-glow" />
        <h1 className="mt-4 font-display text-6xl font-bold text-ink drop-shadow-[0_4px_0_#ffffffaa] sm:text-7xl">
          Dream Shop
        </h1>
        <p className="mt-4 max-w-md text-lg font-semibold text-ink/80">
          Şehrini seç, mağazaları gez, hayalindeki hayatı kur. Evin, araban, gardırobun — hepsi senin.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/giris?mod=kayit" className="game-btn">Yeni hayatına başla ✨</Link>
          <Link href="/giris" className="game-btn ghost">Giriş yap</Link>
        </div>
        <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 font-bold">
          <Crystal size={16} /> Üye olana 1000 kredi hediye
        </p>
      </main>
    </SkyScene>
  );
}
