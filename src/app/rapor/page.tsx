import { requireMe } from "@/lib/session";
import AppHeader from "@/components/AppHeader";
import ReportApp from "./ReportApp";
import ApplyForm from "./ApplyForm";

const FEATURES: Record<string, string[]> = {
  baslangic: ["Genel bakış", "İlgi ve profil kırılımları", "Dönüşüm hunisi", "Persona kartı", "Ayda 50 sorgu"],
  pro: ["Başlangıç'taki her şey", "💰 Fiyat & talep (bu fiyata alırım)", "Marka & pazar payı", "Beden & renk talebi", "Zaman analizi", "Ayda 500 sorgu"],
  kurumsal: ["Pro'daki her şey", "Sınırsız sorgu", "Sponsorlu anket (yakında)", "API erişimi (yakında)", "Özel rapor desteği"],
};

export default async function RaporPage() {
  const { supabase, me } = await requireMe("/rapor");
  const { data: allowed } = await supabase.rpc("can_read_reports");
  let body: React.ReactNode;

  if (allowed) {
    const [{ data: cities }, { data: categories }, { data: prods }, { data: account }] = await Promise.all([
      supabase.from("cities").select("id, name"),
      supabase.from("categories").select("id, name").order("id"),
      supabase.from("products").select("id, name, brand").eq("status", "active").order("name").limit(1000),
      supabase.rpc("my_report_account"),
    ]);
    const brands = [...new Set((prods ?? []).map((p) => p.brand).filter(Boolean))].sort((a, b) => a!.localeCompare(b!, "tr")) as string[];
    body = <ReportApp cities={(cities ?? []).sort((a, b) => a.name.localeCompare(b.name, "tr"))} categories={categories ?? []}
      brands={brands} products={prods ?? []} initialAccount={account} />;
  } else {
    const [{ data: mine }, { data: plans }] = await Promise.all([
      supabase.from("data_buyers").select("company, approved").eq("created_by", me.id).maybeSingle(),
      supabase.from("report_plans").select("id, name, monthly_price_try, monthly_queries").order("sort"),
    ]);
    body = (
      <div className="flex flex-col gap-6">
        <div className="rounded-[32px] bg-gradient-to-br from-ink to-[#3b2a6b] p-8 text-white">
          <p className="text-sm font-bold uppercase tracking-widest text-white/60">Dream Shop Insights</p>
          <h2 className="mt-1 max-w-2xl font-display text-4xl font-bold">Türkiye&apos;nin ne almak istediğini, hangi fiyata alacağını bilin.</h2>
          <p className="mt-3 max-w-2xl text-white/80">Oyuncuların ürün, marka ve fiyat tercihlerini şehir, yaş, cinsiyet, gelir ve beden kırılımlarıyla görün.
            “Bu fiyata olsa alırım” verisiyle hangi ürüne ne kadar indirim yapacağınızı hesaplayın. Tüm raporlar anonim ve topludur.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {(plans ?? []).map((p, i) => (
            <div key={p.id} className={`game-panel !rounded-3xl p-6 ${i === 1 ? "ring-4 ring-crystal" : ""}`}>
              {i === 1 && <span className="rounded-full bg-crystal px-3 py-0.5 text-xs font-bold text-white">En çok tercih edilen</span>}
              <h3 className="mt-2 font-display text-2xl font-bold">{p.name}</h3>
              <p className="font-display text-3xl font-bold">{Number(p.monthly_price_try).toLocaleString("tr-TR")} ₺<span className="text-base text-ink/50"> /ay</span></p>
              <ul className="mt-3 space-y-1 text-sm font-semibold">{(FEATURES[p.id] ?? []).map((x) => <li key={x}>✓ {x}</li>)}</ul>
            </div>
          ))}
        </div>
        <p className="text-center text-sm font-semibold text-ink/60">Paket almadan <b>rapor başına ödeme</b> de yapabilirsiniz: satın alınan her rapor kredisi 1 raporluk erişim sağlar.</p>
        <div className="game-panel mx-auto w-full max-w-xl !rounded-3xl p-8">
          <h3 className="mb-4 font-display text-2xl font-bold">Şirket başvurusu</h3>
          {mine ? <p className="rounded-xl bg-gold/20 p-4 font-bold">⏳ “{mine.company}” başvurun inceleniyor. Onaylanınca ekibimiz paket ve faturalandırma için iletişime geçecek.</p>
            : <ApplyForm plans={(plans ?? []).map((p) => ({ id: p.id, name: p.name }))} />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f5fb]">
      <AppHeader me={me} />
      <main className="mx-auto max-w-[1400px] p-4 pb-16">
        <h1 className="mb-4 font-display text-4xl font-bold">📊 Rapor paneli</h1>
        {body}
      </main>
    </div>
  );
}
