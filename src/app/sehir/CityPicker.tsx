"use client";
import { useRouter } from "next/navigation";

export default function CityPicker({ cities, districts, cityId, district }: {
  cities: { id: number; name: string }[]; districts: string[]; cityId: number; district: string;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      <select className="game-input !w-auto" value={cityId} onChange={(e) => router.push(`/sehir?il=${e.target.value}`)}>
        {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select className="game-input !w-auto" value={district}
        onChange={(e) => router.push(`/sehir?il=${cityId}${e.target.value ? `&ilce=${encodeURIComponent(e.target.value)}` : ""}`)}>
        <option value="">Tüm ilçeler</option>
        {districts.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
    </div>
  );
}
