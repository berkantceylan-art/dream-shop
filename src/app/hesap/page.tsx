import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HesapPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const { data: consent } = await supabase.from("consents").select("id")
    .eq("user_id", user.id).eq("type", "kvkk_terms").eq("granted", true).limit(1);
  if (!consent?.length) redirect("/kayit-tamamla");

  const [{ data: profile }, { data: wallet }] = await Promise.all([
    supabase.from("profiles").select("username, display_name, role, cities(name)").eq("id", user.id).single(),
    supabase.from("wallets").select("balance").eq("user_id", user.id).single(),
  ]);
  const city = (profile?.cities as unknown as { name: string } | null)?.name;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Merhaba, {profile?.display_name || profile?.username}</h1>
        <form action="/auth/cikis" method="post">
          <button className="text-sm text-gray-600 underline">Çıkış</button>
        </form>
      </div>
      <p className="mt-1 text-gray-600">@{profile?.username} · {city ?? "Şehir seçilmedi"} · {profile?.role}</p>
      <div className="mt-8 rounded-2xl bg-black p-6 text-white">
        <p className="text-sm opacity-70">Kredi bakiyen</p>
        <p className="text-4xl font-bold">{(wallet?.balance ?? 0).toLocaleString("tr-TR")} 💎</p>
      </div>
      <p className="mt-8 text-gray-500">Sıradaki: avatar oluşturma →</p>
    </main>
  );
}
