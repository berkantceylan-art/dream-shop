import { supabase } from './supabaseClient';

export const revalidate = 0;

interface Product {
  id: number | string;
  name: string;
  price: string | number;
  tag?: string;
}

export default async function Page() {
  const { data: products, error } = await supabase
    .from('products')
    .select('*');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{ maxWidth: '900px', margin: '0 auto 30px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '38px', color: '#1e293b', marginBottom: '8px' }}>🛒 Dream Shop Vitrini</h1>
        <p style={{ color: '#64748b', fontSize: '16px' }}>Supabase Veritabanından Canlı Ürün Koleksiyonu</p>
      </header>

      {error && (
        <div style={{ maxWidth: '900px', margin: '0 auto 20px', padding: '12px 16px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', border: '1px solid #fecaca' }}>
          Veritabanı bağlantı notu: {error.message} (Ortam değişkenlerinizi kontrol edin)
        </div>
      )}

      <main style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        {products && products.length > 0 ? (
          products.map((item: Product) => (
            <div key={item.id} style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb', background: '#eff6ff', padding: '4px 8px', borderRadius: '4px' }}>
                {item.tag || 'Ürün'}
              </span>
              <h2 style={{ fontSize: '20px', color: '#0f172a', margin: '12px 0' }}>{item.name}</h2>
              <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#16a34a', margin: '0 0 16px 0' }}>
                {item.price} TL
              </p>
              <button style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                Sepete Ekle
              </button>
            </div>
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <p style={{ color: '#64748b' }}>Henüz listelenecek ürün bulunamadı veya tablo boş.</p>
          </div>
        )}
      </main>
    </div>
  );
}
