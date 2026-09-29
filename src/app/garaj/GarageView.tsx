"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { GarageSceneLazy } from "@/components/3d/Lazy";
import { CAR_SHAPES, type CarShape } from "@/lib/home";
import type { MarketSettings } from "@/lib/catalog";
import Credits from "@/components/Credits";
import SellButton from "@/app/envanter/SellButton";
import { setActiveAction } from "@/app/evim/actions";

type Car = { id: string; name: string; brand: string | null; shape: CarShape; color: string; paid: number; price: number };

export default function GarageView({ cars, favorite, settings }: { cars: Car[]; favorite: string | null; settings: MarketSettings }) {
  const [active, setActive] = useState<string | null>(favorite ?? cars[0]?.id ?? null);
  const [fav, setFav] = useState(favorite);
  const [pending, start] = useTransition();
  const car = cars.find((c) => c.id === active);

  if (!cars.length)
    return (
      <div className="game-panel p-10 text-center">
        <p className="text-6xl">🚗</p>
        <p className="mt-3 font-display text-2xl font-bold">Garajın boş</p>
        <p className="mt-1 font-semibold text-ink/60">Oto galeriden sıfır ya da pazardan 2. el bir araba al.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/sehir?tur=galeri" className="game-btn">Oto galeri</Link>
          <Link href="/pazar?tur=car" className="game-btn ghost">2. el arabalar</Link>
        </div>
      </div>
    );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="game-panel h-[55vh] overflow-hidden lg:h-[70vh]">
        <GarageSceneLazy cars={cars} active={active} onPick={setActive} className="h-full w-full" />
      </div>
      {car && (
        <aside className="game-panel flex h-fit flex-col gap-3 p-5">
          {car.brand && <p className="text-sm font-bold text-ink/50">{car.brand}</p>}
          <h2 className="font-display text-3xl font-bold leading-tight">{car.name}</h2>
          <p className="font-semibold text-ink/60">{CAR_SHAPES[car.shape]} · <span className="inline-block h-3 w-3 rounded-full align-middle" style={{ background: car.color }} /></p>
          <p className="text-sm font-semibold text-ink/60">Alış fiyatın: <Credits amount={car.paid} /></p>
          {fav === car.id ? (
            <p className="rounded-xl bg-mint/15 p-3 text-sm font-bold text-[#16865a]">⭐ Evinin önünde park halinde</p>
          ) : (
            <button className="game-btn mint !py-2" disabled={pending} onClick={() => start(async () => {
              const r = await setActiveAction(car.id, "car"); if (!r.error) setFav(car.id);
            })}>⭐ Evimin önüne park et</button>
          )}
          <SellButton itemId={car.id} name={car.name} paid={car.paid} storePrice={car.price} settings={settings} />
          <div className="mt-2 border-t-2 border-[#e6ecf7] pt-3 text-sm font-semibold text-ink/60">
            {cars.length} araba · Arabaya tıklayarak seç
          </div>
        </aside>
      )}
    </div>
  );
}
