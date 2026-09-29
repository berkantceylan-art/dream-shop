const TITLES: Record<string, string> = {
  aydinlatma: "KVKK Aydınlatma Metni",
  kosullar: "Kullanım Koşulları",
  "acik-riza": "Açık Rıza Metni",
  magaza: "Mağaza Sözleşmesi",
};

export default async function YasalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">{TITLES[slug] ?? "Yasal metin"}</h1>
      <p className="mt-4 rounded-lg bg-yellow-50 p-4 text-yellow-800">
        Taslak — bu metin yayına çıkmadan önce hukuk danışmanı tarafından hazırlanacaktır.
      </p>
    </main>
  );
}
