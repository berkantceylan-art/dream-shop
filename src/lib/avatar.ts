// Avatar yapılandırması. Veritabanında avatars.config (jsonb) olarak saklanır.
// İleride sanatçı modelleri (.glb) geldiğinde aynı alanlar model parçalarını seçmek için kullanılacak.

export type BodyType = "ince" | "normal" | "dolgun" | "atletik";
export type HairStyle = "kisa" | "uzun" | "topuz" | "kivircik" | "atkuyrugu" | "kel";
export type TopStyle = "tisort" | "kapusonlu" | "gomlek";
export type BottomStyle = "kot" | "sort" | "etek";

export type AvatarConfig = {
  skin: string;
  body: BodyType;
  hair: HairStyle;
  hairColor: string;
  eyes: string;
  top: { style: TopStyle; color: string };
  bottom: { style: BottomStyle; color: string };
  shoes: string;
};

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: "#e8b48f",
  body: "normal",
  hair: "kisa",
  hairColor: "#3b2417",
  eyes: "#3b2a1a",
  top: { style: "tisort", color: "#c24dff" },
  bottom: { style: "kot", color: "#3a5a9c" },
  shoes: "#ffffff",
};

export const SKIN_TONES = ["#fde0c8", "#f1c6a1", "#e8b48f", "#c98d64", "#a86b45", "#7a4a2c", "#4f2f1c"];
export const HAIR_COLORS = ["#111111", "#3b2417", "#6b3f22", "#b5793f", "#e6c27a", "#b8b8b8", "#d6336c", "#4263eb"];
export const EYE_COLORS = ["#3b2a1a", "#1c7ed6", "#2b8a3e", "#6b6b6b", "#111111"];
export const CLOTH_COLORS = ["#ffffff", "#111111", "#c24dff", "#ff6b9d", "#ff922b", "#ffd43b", "#3ddc97", "#4dabf7", "#3a5a9c", "#8d6e63"];

export const BODY_LABELS: Record<BodyType, string> = { ince: "İnce", normal: "Normal", dolgun: "Dolgun", atletik: "Atletik" };
export const HAIR_LABELS: Record<HairStyle, string> = {
  kisa: "Kısa", uzun: "Uzun", topuz: "Topuz", kivircik: "Kıvırcık", atkuyrugu: "At kuyruğu", kel: "Kel",
};
export const TOP_LABELS: Record<TopStyle, string> = { tisort: "Tişört", kapusonlu: "Kapüşonlu", gomlek: "Gömlek" };
export const BOTTOM_LABELS: Record<BottomStyle, string> = { kot: "Kot pantolon", sort: "Şort", etek: "Etek" };

/** Veritabanından gelen eksik/bozuk yapılandırmayı güvenli hale getirir. */
export function normalizeAvatar(raw: unknown): AvatarConfig {
  const r = (raw ?? {}) as Partial<AvatarConfig>;
  return {
    ...DEFAULT_AVATAR,
    ...r,
    top: { ...DEFAULT_AVATAR.top, ...(r.top ?? {}) },
    bottom: { ...DEFAULT_AVATAR.bottom, ...(r.bottom ?? {}) },
  };
}

/** Kullanıcının gerçek boyundan (cm) avatar ölçeği. 170 cm = 1.0 */
export function heightScale(heightCm?: number | null) {
  if (!heightCm) return 1;
  return Math.min(1.12, Math.max(0.9, 1 + (heightCm - 170) / 300));
}
