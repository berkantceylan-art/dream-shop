"use client";
import { useState } from "react";
import { PLACE_TYPES } from "@/lib/places";

type City = { id: number; name: string };
type Mall = { id: string; name: string; city_id: number };
type District = { city_id: number; name: string };

/** Mağaza açarken ortak alanlar: işletme türü, il, ilçe, AVM. */
export default function PlaceFields({ cities, malls, districts, defaultCity = 34 }: {
  cities: City[]; malls: Mall[]; districts: District[]; defaultCity?: number;
}) {
  const [city, setCity] = useState(defaultCity);
  const [mall, setMall] = useState("");
  return (
    <>
      <select name="place_type" className="game-input" defaultValue="giyim" required>
        {PLACE_TYPES.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
      </select>
      <select name="city_id" className="game-input" value={city} onChange={(e) => { setCity(Number(e.target.value)); setMall(""); }}>
        {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select name="mall_id" className="game-input" value={mall} onChange={(e) => setMall(e.target.value)}>
        <option value="">Cadde / sokak dükkânı</option>
        {malls.filter((m) => m.city_id === city).map((m) => <option key={m.id} value={m.id}>🏬 {m.name}</option>)}
      </select>
      <select name="district" className="game-input" defaultValue="" key={city}>
        <option value="">İlçe: Merkez</option>
        {districts.filter((d) => d.city_id === city).map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
      </select>
    </>
  );
}
