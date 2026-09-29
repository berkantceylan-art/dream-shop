import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/hesap");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-indigo-950 to-black p-6 text-center text-white">
      <h1 className="text-5xl font-extrabold tracking-tight">Dream Shop</h1>
      <p className="mt-4 max-w-md text-lg text-indigo-200">
        Şehrini seç, mağazaları gez, hayalindeki hayatı kur. Evin, arabanın, gardırobun — hepsi senin.
      </p>
      <p className="mt-2 text-indigo-300">Üye ol, <b>1000 kredi</b> hediye 💎</p>
      <div className="mt-8 flex gap-3">
        <Link href="/giris" className="rounded-xl bg-white px-6 py-3 font-semibold text-black">Hemen başla</Link>
      </div>
    </main>
  );
}
