import { requireAdmin } from "@/lib/session";
import { PageTitle, Section, fmt } from "../_ui";
import BroadcastForm from "./BroadcastForm";

export default async function Duyurular() {
  const { supabase } = await requireAdmin();
  const [{ data: cities }, { data: recent }] = await Promise.all([
    supabase.from("cities").select("id, name"),
    supabase.from("notifications").select("data, created_at").eq("type", "announcement").order("created_at", { ascending: false }).limit(200),
  ]);
  const seen = new Set<string>();
  const history = (recent ?? []).filter((n) => { const k = JSON.stringify(n.data); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 15);
  return (
    <>
      <PageTitle icon="📣" title="Duyurular" sub="Kullanıcıların bildirimlerine düşer (🔔)" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Yeni duyuru"><BroadcastForm cities={(cities ?? []).sort((a, b) => a.name.localeCompare(b.name, "tr"))} /></Section>
        <Section title="Son duyurular">
          {!history.length && <p className="text-sm text-ink/50">Henüz duyuru yok.</p>}
          {history.map((n, i) => {
            const d = n.data as { title?: string; body?: string };
            return <div key={i} className="border-b border-[#e6ecf7] py-2"><b>{d.title}</b><p className="text-sm text-ink/70">{d.body}</p><p className="text-xs text-ink/40">{fmt(n.created_at)}</p></div>;
          })}
        </Section>
      </div>
    </>
  );
}
