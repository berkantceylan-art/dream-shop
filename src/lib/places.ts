// İşletme türleri (veritabanındaki place_types ile aynı)
export const PLACE_TYPES = [
  { id: "market", name: "Süpermarket", icon: "🛒" },
  { id: "bakkal", name: "Bakkal", icon: "🏪" },
  { id: "manav", name: "Manav", icon: "🍎" },
  { id: "kasap", name: "Kasap", icon: "🥩" },
  { id: "firin", name: "Fırın", icon: "🥖" },
  { id: "kafe", name: "Kafe", icon: "☕" },
  { id: "restoran", name: "Restoran", icon: "🍽️" },
  { id: "giyim", name: "Giyim", icon: "👗" },
  { id: "ayakkabi", name: "Ayakkabı", icon: "👟" },
  { id: "spor", name: "Spor", icon: "🏋️" },
  { id: "kuyumcu", name: "Kuyumcu", icon: "💍" },
  { id: "optik", name: "Optik", icon: "👓" },
  { id: "kozmetik", name: "Kozmetik", icon: "💄" },
  { id: "elektronik", name: "Elektronik", icon: "📱" },
  { id: "mobilya", name: "Mobilya", icon: "🛋️" },
  { id: "yapi", name: "Yapı Market", icon: "🔨" },
  { id: "galeri", name: "Oto Galeri", icon: "🚗" },
  { id: "emlak", name: "Emlak Ofisi", icon: "🏡" },
  { id: "kirtasiye", name: "Kırtasiye", icon: "📚" },
  { id: "kitap", name: "Kitapçı", icon: "📖" },
  { id: "cicekci", name: "Çiçekçi", icon: "💐" },
  { id: "petshop", name: "Pet Shop", icon: "🐾" },
  { id: "oyuncak", name: "Oyuncakçı", icon: "🧸" }
] as const;
export const placeMeta = (id?: string | null) => PLACE_TYPES.find((p) => p.id === id);
