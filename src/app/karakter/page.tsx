import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { heightScale, normalizeAvatar } from "@/lib/avatar";
import Crystal from "@/components/Crystal";
import AvatarEditor from "./AvatarEditor";

export default async function KarakterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris?next=/karakter");

  const [{ data: avatar }, { data: profile }] = await Promise.all([
    supabase.from("avatars").select("config").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("height_cm").eq("id", user.id).single(),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-top via-sky-bottom to-cream">
      <header className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <Link href="/hesap" className="flex items-center gap-2 font-display text-xl font-bold">
          <Crystal size={26} /> Dream Shop
        </Link>
        <Link href="/hesap" className="text-sm font-bold text-ink/60 hover:underline">Vazgeç</Link>
      </header>
      <AvatarEditor initial={normalizeAvatar(avatar?.config)} scale={heightScale(profile?.height_cm)} isNew={!avatar} />
    </div>
  );
}
