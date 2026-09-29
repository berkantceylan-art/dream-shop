import { connection } from "next/server";
import { Suspense } from "react";
import { supabase } from "@/lib/supabase";

async function Status() {
  await connection();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return <p style={{ color: "crimson" }}>❌ Ortam değişkenleri eksik (URL veya ANON_KEY).</p>;
  }

  // Auth sunucusuna erişim + anahtar kontrolü
  let health = "";
  try {
    const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } });
    health = res.ok ? "✅ Supabase sunucusuna ulaşıldı, anahtar geçerli" : `❌ HTTP ${res.status}`;
  } catch (e) {
    health = `❌ Sunucuya ulaşılamadı: ${(e as Error).message}`;
  }

  // İstemci kütüphanesi üzerinden basit bir çağrı
  const { error } = await supabase.auth.getSession();

  return (
    <ul>
      <li>{health}</li>
      <li>{error ? `❌ supabase-js: ${error.message}` : "✅ supabase-js istemcisi çalışıyor"}</li>
    </ul>
  );
}

export default function SupabaseTestPage() {
  return (
    <main style={{ padding: 32, fontFamily: "sans-serif" }}>
      <h1>Supabase bağlantı testi</h1>
      <Suspense fallback={<p>Kontrol ediliyor…</p>}>
        <Status />
      </Suspense>
    </main>
  );
}
