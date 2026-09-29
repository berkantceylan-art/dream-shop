// Görev formlarının alan tanımları. Doğrulama kuralları veritabanındaki claim_quest ile aynıdır.
export type Field =
  | { key: string; label: string; type: "number"; min: number; max: number; step?: number; suffix?: string }
  | { key: string; label: string; type: "text"; placeholder?: string }
  | { key: string; label: string; type: "phone" }
  | { key: string; label: string; type: "chips"; options: [string, string][] }
  | { key: string; label: string; type: "multi"; options: [string, string][] }
  | { key: string; label: string; type: "bool" };

export const QUEST_FIELDS: Record<string, Field[]> = {
  beden: [
    { key: "height_cm", label: "Boy", type: "number", min: 100, max: 250, suffix: "cm" },
    { key: "shoe_size", label: "Ayakkabı numarası", type: "number", min: 30, max: 50, step: 0.5 },
    { key: "top_size", label: "Üst beden", type: "chips", options: ["XS","S","M","L","XL","2XL","3XL"].map((s) => [s, s]) },
    { key: "bottom_size", label: "Alt beden (bel)", type: "number", min: 24, max: 48, suffix: "inç" },
  ],
  telefon: [{ key: "phone", label: "Cep telefonu", type: "phone" }],
  demografi: [
    { key: "occupation", label: "Meslek grubu", type: "chips", options: [
      ["ogrenci","Öğrenci"],["ozel","Özel sektör"],["kamu","Kamu"],["serbest","Serbest meslek"],
      ["isveren","İşveren"],["ev","Ev hanımı/erkeği"],["emekli","Emekli"],["issiz","Çalışmıyor"]] },
    { key: "education", label: "Eğitim", type: "chips", options: [
      ["ilk","İlköğretim"],["lise","Lise"],["onlisans","Ön lisans"],["lisans","Lisans"],["yuksek","Yüksek lisans+"]] },
    { key: "marital_status", label: "Medeni durum", type: "chips", options: [
      ["bekar","Bekâr"],["iliski","İlişkisi var"],["evli","Evli"],["bosanmis","Boşanmış"]] },
    { key: "children_count", label: "Çocuk sayısı", type: "chips", options: [
      ["0","Yok"],["1","1"],["2","2"],["3","3"],["4","4+"]] },
  ],
  yasam: [
    { key: "owns_car", label: "Gerçek hayatta araban var mı?", type: "bool" },
    { key: "housing", label: "Evin", type: "chips", options: [["owner","Ev sahibiyim"],["tenant","Kiracıyım"],["family","Ailemle"]] },
    { key: "income_band", label: "Aylık hane geliri (isteğe bağlı)", type: "chips", options: [
      ["0-25","25 bin ₺ altı"],["25-50","25–50 bin ₺"],["50-100","50–100 bin ₺"],["100+","100 bin ₺ üstü"],["","Söylemeyeyim"]] },
    { key: "interests", label: "İlgi alanların", type: "multi", options: [
      ["moda","Moda"],["otomobil","Otomobil"],["teknoloji","Teknoloji"],["dekorasyon","Dekorasyon"],["spor","Spor"],
      ["kozmetik","Kozmetik"],["oyun","Oyun"],["seyahat","Seyahat"],["yemek","Yemek"],["muzik","Müzik"]] },
  ],
};

export const QUEST_ICONS: Record<string, string> = { beden: "👟", telefon: "📱", demografi: "🧑‍💼", yasam: "🏡" };
