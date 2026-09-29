// Ev, araba ve eşyaların 3D görünüm kuralları.
import type { Product } from "./catalog";

export type HomeSize = "studio" | "flat" | "house" | "villa";
export type CarShape = "hatchback" | "sedan" | "suv" | "coupe" | "pickup";
export type FurnitureType = "sofa" | "table" | "bed" | "tv" | "laptop" | "phone" | "lamp" | "plant" | "flower" | "books" | "gym" | "toy" | "petbed" | "box";

export const HOME_SIZES: Record<HomeSize, { label: string; w: number; d: number; garden: boolean; pool: boolean }> = {
  studio: { label: "Stüdyo", w: 6, d: 5, garden: false, pool: false },
  flat:   { label: "Daire", w: 8, d: 6.5, garden: false, pool: false },
  house:  { label: "Müstakil ev", w: 9, d: 7, garden: true, pool: false },
  villa:  { label: "Villa", w: 11, d: 8, garden: true, pool: true },
};
export const CAR_SHAPES: Record<CarShape, string> = {
  hatchback: "Hatchback", sedan: "Sedan", suv: "SUV", coupe: "Coupe", pickup: "Pikap",
};
export const STARTER_HOME = { size: "studio" as HomeSize, color: "#fff8ec", name: "Başlangıç stüdyosu (kiralık)" };

const PALETTE = ["#ff6b6b", "#4dabf7", "#ffd43b", "#3ddc97", "#c24dff", "#f8f9fa", "#343a40", "#ff922b"];
const hash = (s: string) => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);

type P = Pick<Product, "id" | "name" | "attributes" | "credit_price">;

export function homeOf(p: P): { size: HomeSize; color: string } {
  const h = (p.attributes?.home ?? {}) as { size?: HomeSize; color?: string };
  const size = h.size ?? (p.credit_price >= 100000 ? "villa" : p.credit_price >= 60000 ? "house" : p.credit_price >= 30000 ? "flat" : "studio");
  return { size, color: h.color ?? "#fff1c7" };
}

export function carOf(p: P): { shape: CarShape; color: string } {
  const c = (p.attributes?.car ?? {}) as { shape?: CarShape; color?: string };
  const n = p.name.toLocaleLowerCase("tr");
  const shape = c.shape ?? (/suv|jeep|arazi/.test(n) ? "suv" : /coupe|spor/.test(n) ? "coupe" : /pikap|pickup/.test(n) ? "pickup"
    : /sedan/.test(n) ? "sedan" : "hatchback");
  return { shape, color: c.color ?? PALETTE[hash(p.id) % PALETTE.length] };
}

export function furnitureOf(p: P): { type: FurnitureType; color: string } {
  const n = p.name.toLocaleLowerCase("tr");
  const color = ((p.attributes?.avatar ?? p.attributes?.furniture ?? {}) as { color?: string }).color ?? PALETTE[hash(p.id) % PALETTE.length];
  const type: FurnitureType =
    /koltuk|kanepe|sofa/.test(n) ? "sofa" : /yatak/.test(n) ? "bed" : /masa|sehpa/.test(n) ? "table"
    : /televizyon|tv/.test(n) ? "tv" : /bilgisayar|laptop|dizüstü/.test(n) ? "laptop" : /telefon|kulaklık|tablet/.test(n) ? "phone"
    : /lamba|avize/.test(n) ? "lamp" : /orkide|saksı|bitki/.test(n) ? "plant" : /buket|çiçek|gül/.test(n) ? "flower"
    : /kitap|roman|defter|sanat/.test(n) ? "books" : /dambıl|yoga|matı/.test(n) ? "gym" : /oyuncak|blok|peluş/.test(n) ? "toy"
    : /köpek|kedi|mama/.test(n) ? "petbed" : "box";
  return { type, color };
}

/** Yerleşimi olmayan eşyalar için duvar kenarlarına otomatik dizilim */
export function autoPlace(index: number, w: number, d: number) {
  const perimeter: [number, number, number][] = [];
  for (let x = -w / 2 + 1; x <= w / 2 - 1; x += 1.4) perimeter.push([x, -d / 2 + 0.9, 0]);
  for (let z = -d / 2 + 2.2; z <= d / 2 - 1; z += 1.4) perimeter.push([-w / 2 + 0.9, z, Math.PI / 2]);
  const [x, z, rot] = perimeter[index % perimeter.length];
  return { x, z, rot };
}
