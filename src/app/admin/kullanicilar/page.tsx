import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { Filters, PageTitle, Pager, Section, fmt, ROLE_TR, qs } from "../_ui";

const SIZE = 50;

export default async function Kullanicilar({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const { q = "", rol = "", il = "", durum = "", sirala = "yeni" } = sp;
  const page = Math.max(1, Number(sp.sayfa) || 1);

  let emailIds: string[] = [];
  if (q.includes("@") && q.length > 2) {
    const { data } = await supabase.rpc("admin_find_by_email", { p_q: q.trim() });
    emailIds = (data ?? []) as string[];
  }
  let query = supabase.from("profiles")
    .select("id, username, display_name, role, created_at, banned_at, city_id, cities(name), wallets(balance)", { count: "exact" });
  if (q && emailIds.length) query = query.in("id", emailIds);
  else if (q) query = query.or(`username.ilike.%${q.replace(/[%,()]/g, "")}%,display_name.ilike.%${q.replace(/[%,()]/g, "")}%`);
  if (rol) query = query.eq("role", rol);
  if (il) query = query.eq("city_id", Number(il));
  if (durum === "askida") query = query.not("banned_at", "is", null);
  query = sirala === "eski" ? query.order("created_at") : query.order("created_at", { ascending: false });
  const [{ data: users, count }, { data: cities }] = await Promise.all([
    query.range((page - 1) * SIZE, page * SIZE - 1),
    supabase.from("cities").select("id, name"),
  ]);

  return (
    <>
      <PageTitle icon="👥" title="Kullanıcılar" sub="Ara, filtrele, detaya girip düzenle" />
      <Filters action="/admin/kullanicilar">
        <input name="q" defaultValue={q} placeholder="Kullanıcı adı, ad veya e-posta…" className="game-input !w-72 !py-2" />
        <select name="rol" defaultValue={rol} className="game-input !w-auto !py-2">
          <option value="">Tüm roller</option>{Object.entries(ROLE_TR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="il" defaultValue={il} className="game-input !w-auto !py-2">
          <option value="">Tüm şehirler</option>
          {(cities ?? []).sort((a, b) => a.name.localeCompare(b.name, "tr")).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="durum" defaultValue={durum} className="game-input !w-auto !py-2"><option value="">Tüm hesaplar</option><option value="askida">Askıdakiler</option></select>
        <select name="sirala" defaultValue={sirala} className="game-input !w-auto !py-2"><option value="yeni">En yeni</option><option value="eski">En eski</option></select>
      </Filters>
      <Section>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-ink/50"><th className="p-2">Kullanıcı</th><th>Rol</th><th>Şehir</th><th className="text-right">Bakiye</th><th className="text-right">Kayıt</th></tr></thead>
            <tbody className="divide-y divide-[#e6ecf7]">
              {(users ?? []).map((u) => (
                <tr key={u.id} className={`hover:bg-white ${u.banned_at ? "opacity-60" : ""}`}>
                  <td className="p-2"><Link href={`/admin/kullanicilar/${u.id}`} className="font-bold text-crystal">@{u.username}</Link>
                    <span className="ml-1 text-ink/50">{u.display_name}</span>{u.banned_at && <span className="ml-2 text-xs font-bold text-red-600">⛔ askıda</span>}</td>
                  <td>{ROLE_TR[u.role]}</td>
                  <td>{(u.cities as unknown as { name: string } | null)?.name ?? "—"}</td>
                  <td className="text-right font-bold">{Number((u.wallets as unknown as { balance: number } | null)?.balance ?? 0).toLocaleString("tr-TR")}</td>
                  <td className="text-right text-xs text-ink/50">{fmt(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} size={SIZE} total={count ?? 0} base={`/admin/kullanicilar${qs({ q, rol, il, durum, sirala })}`} />
      </Section>
    </>
  );
}
