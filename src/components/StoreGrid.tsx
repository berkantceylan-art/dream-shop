import Link from "next/link";
import { placeMeta } from "@/lib/places";

export default function StoreGrid({ stores }: { stores: { id: string; name: string; slug: string; logo_url: string | null; place_type?: string | null; district?: string | null }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stores.map((s) => (
        <Link key={s.id} href={`/magaza/${s.slug}`} className="game-panel flex flex-col items-center gap-2 p-4 text-center transition hover:-translate-y-1">
          {s.logo_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={s.logo_url} alt="" className="h-16 w-16 rounded-2xl object-cover" />
            : <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white font-display text-2xl font-bold text-crystal">{placeMeta(s.place_type)?.icon ?? s.name[0]}</div>}
          <p className="font-display font-semibold leading-tight">{s.name}</p>
          {s.district !== undefined && <p className="-mt-1 text-xs font-bold text-ink/50">{s.district ?? "Merkez"}</p>}
        </Link>
      ))}
    </div>
  );
}
