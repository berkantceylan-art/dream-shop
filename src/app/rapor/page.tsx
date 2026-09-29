import { requireMe } from "@/lib/session";
import AppHeader from "@/components/AppHeader";
import ReportPanel from "./ReportPanel";
import ApplyForm from "./ApplyForm";

export default async function RaporPage() {
  const { supabase, me } = await requireMe("/rapor");
  const { data: allowed } = await supabase.rpc("can_read_reports");

  let body: React.ReactNode;
  if (allowed) {
    const [{ data: cities }, { data: categories }] = await Promise.all([
      supabase.from("cities").select("id, name"),
      supabase.from("categories").select("id, name").order("id"),
    ]);
    body = <ReportPanel cities={(cities ?? []).sort((a, b) => a.name.localeCompare(b.name, "tr"))} categories={categories ?? []} />;
  } else {
    const { data: mine } = await supabase.from("data_buyers").select("company, approved, created_at").eq("created_by", me.id).maybeSingle();
    body = (
      <div className="game-panel mx-auto max-w-xl p-8">
        <h2 className="font-display text-3xl font-bold">📊 Dream Shop Insights</h2>
        <p className="mb-6 mt-1 font-semibold text-ink/60">
          Türkiye genelinde oyuncuların hangi ürünlere, markalara ve fiyat aralıklarına ilgi gösterdiğini şehir, yaş ve cinsiyet kırılımlarıyla
          görün. Tüm raporlar anonim ve topludur.
        </p>
        {mine ? (
          <p className="rounded-xl bg-gold/20 p-4 font-bold">⏳ “{mine.company}” başvurun inceleniyor.</p>
        ) : <ApplyForm />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f5fb]">
      <AppHeader me={me} />
      <main className="mx-auto max-w-7xl p-4 pb-16">
        <h1 className="mb-4 font-display text-4xl font-bold">📊 Rapor paneli</h1>
        {body}
      </main>
    </div>
  );
}
