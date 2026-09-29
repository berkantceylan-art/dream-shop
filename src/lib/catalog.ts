export type Product = {
  id: string; name: string; brand: string | null; description: string | null;
  kind: "house" | "car" | "clothing" | "accessory" | "furniture" | "other";
  wear_slot: string | null; credit_price: number; real_price_try: number | null;
  thumbnail_url: string | null; attributes: Record<string, unknown>; store_id: string | null; status: string;
  category_id: number; chain_id: string | null;
};

export const PRODUCT_COLS =
  "id, name, brand, description, kind, wear_slot, credit_price, real_price_try, thumbnail_url, attributes, store_id, status, category_id, chain_id";

export const KIND_META: Record<Product["kind"], { icon: string; label: string; bg: string }> = {
  clothing:  { icon: "👕", label: "Giyim",    bg: "#ffe3f1" },
  accessory: { icon: "👜", label: "Aksesuar", bg: "#fff1c7" },
  car:       { icon: "🚗", label: "Otomobil", bg: "#d8ecff" },
  house:     { icon: "🏡", label: "Konut",    bg: "#d9f7e8" },
  furniture: { icon: "🛋️", label: "Mobilya",  bg: "#efe3ff" },
  other:     { icon: "📦", label: "Diğer",    bg: "#eef1f6" },
};

/** Admin ürünlerinin satıldığı, her şehirde bulunan resmi mağaza. */
export const OUTLET_SLUG = "dream-outlet";

export const STORE_CATEGORIES = ["Giyim", "Ayakkabı", "Aksesuar", "Otomobil", "Emlak", "Mobilya", "Elektronik", "Kozmetik", "Diğer"];
