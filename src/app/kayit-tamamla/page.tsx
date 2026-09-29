import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardForm from "./OnboardForm";

export default async function KayitTamamlaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const { data: done } = await supabase.from("consents").select("id")
    .eq("user_id", user.id).eq("type", "kvkk_terms").eq("granted", true).limit(1);
  if (done?.length) redirect("/hesap");

  const { data: cities } = await supabase.from("cities").select("id,name").order("name");
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold">Hoş geldin! 🎉</h1>
        <p className="mb-6 text-gray-600">Hesabına <b>1000 kredi</b> tanımlandı. Birkaç bilgiyle hesabını tamamla.</p>
        <OnboardForm cities={cities ?? []} />
      </div>
    </main>
  );
}
