import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SkyScene from "@/components/SkyScene";
import OnboardWizard from "./OnboardWizard";

export default async function KayitTamamlaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const { data: done } = await supabase.from("consents").select("id")
    .eq("user_id", user.id).eq("type", "kvkk_terms").eq("granted", true).limit(1);
  if (done?.length) redirect("/hesap");

  const [{ data: cities }, { data: profile }] = await Promise.all([
    supabase.from("cities").select("id,name").order("name"),
    supabase.from("profiles").select("username").eq("id", user.id).single(),
  ]);
  return (
    <SkyScene>
      <main className="flex min-h-screen items-center justify-center p-4 pb-64">
        <OnboardWizard cities={(cities ?? []).sort((a, b) => a.name.localeCompare(b.name, "tr"))} username={profile?.username ?? ""} />
      </main>
    </SkyScene>
  );
}
