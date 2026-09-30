import Link from "next/link";
import { COVERS } from "@/lib/posts";

export default function Avatar({ username, cover = "crystal", size = 44, ring = false, link = true }: {
  username: string; cover?: string; size?: number; ring?: boolean; link?: boolean;
}) {
  const el = (
    <span className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-display font-bold text-white ${COVERS[cover] ?? COVERS.crystal}
      ${ring ? "ring-[3px] ring-offset-2 ring-crystal" : ""}`} style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {username[0]?.toUpperCase()}
    </span>
  );
  return link ? <Link href={`/u/${username}`}>{el}</Link> : el;
}
