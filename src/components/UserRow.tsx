"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { FollowButton } from "@/app/u/[username]/SocialButtons";
import { removeFollowerAction } from "@/app/u/[username]/actions";

export default function UserRow({ user, meId, following, removable, sub }: {
  user: { id: string; username: string; display_name: string | null }; meId: string; following: boolean; removable?: boolean; sub?: string;
}) {
  const [gone, setGone] = useState(false);
  const [pending, start] = useTransition();
  if (gone) return null;
  return (
    <div className="flex items-center gap-3 py-3">
      <Link href={`/u/${user.username}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-b from-crystal-light to-crystal font-display text-lg font-bold text-white">
        {user.username[0].toUpperCase()}
      </Link>
      <Link href={`/u/${user.username}`} className="min-w-0 flex-1">
        <p className="truncate font-bold">{user.display_name || user.username}</p>
        <p className="truncate text-xs font-semibold text-ink/50">@{user.username}{sub ? ` · ${sub}` : ""}</p>
      </Link>
      {removable && (
        <button className="chip" disabled={pending} onClick={() => start(async () => { await removeFollowerAction(user.id); setGone(true); })}>Çıkar</button>
      )}
      {user.id !== meId && <FollowButton target={user.id} initial={following} />}
    </div>
  );
}
