import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QUEST_FIELDS, QUEST_ICONS } from "@/lib/quests";
import SkyScene from "@/components/SkyScene";
import Credits from "@/components/Credits";
import QuestForm from "./QuestForm";

export default async function GorevPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fields = QUEST_FIELDS[id];
  if (!fields) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const [{ data: quest }, { data: profile }] = await Promise.all([
    supabase.from("quests").select("title, description, reward").eq("id", id).single(),
    supabase.from("profiles").select(fields.map((f) => f.key).join(",")).eq("id", user.id).single(),
  ]);

  return (
    <SkyScene>
      <main className="flex min-h-screen items-start justify-center p-4 pt-10 pb-64">
        <div className="game-panel animate-pop w-full max-w-md p-8">
          <Link href="/hesap" className="text-sm font-bold text-crystal">← Geri</Link>
          <div className="mt-3 flex items-center justify-between">
            <h1 className="font-display text-3xl font-bold">{QUEST_ICONS[id]} {quest?.title}</h1>
            <span className="rounded-full bg-gold/30 px-3 py-1">+<Credits amount={quest?.reward ?? 0} /></span>
          </div>
          <p className="mb-6 mt-1 text-sm font-semibold text-ink/60">{quest?.description}</p>
          <QuestForm id={id} fields={fields} initial={(profile ?? {}) as unknown as Record<string, unknown>} />
        </div>
      </main>
    </SkyScene>
  );
}
