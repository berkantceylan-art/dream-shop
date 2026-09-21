export const revalidate = 0;

export default function HomePage() {
  const products = [
    { id: '1', title: 'Minimalist Sırt Çantası', price: 1250, category: 'Aksesuar', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500', desc: 'Su geçirmez dayanıklı kumaş, günlük kullanım için ideal.' },
    { id: '2', title: 'Kablosuz Kulaklık', price: 2400, category: 'Elektronik', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', desc: 'Aktif gürültü engelleme özellikli yüksek ses performansı.' },
    { id: '3', title: 'Seramik Kupa', price: 320, category: 'Ev & Yaşam', image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500', desc: 'El yapımı özel tasarım mat seramik kahve kupası.' }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{ maxWidth: '1100px', margin: '0 auto 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '42px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px 0' }}>Dream Shop</h1>
        <p style={{ fontSize: '18px', color: '#64748b' }}>Özenle seçilmiş ürün koleksiyonunu keşfedin.</p>
      </header>

      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {products.map((p) => (
          <div key={p.id} style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <img src={p.image} alt={p.title} style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
              <div style={{ padding: '20px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', background: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: '6px' }}>{p.category}</span>
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '12px 0 8px 0' }}>{p.title}</h3>
                <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>{p.desc}</p>
              </div>
            </div>
            <div style={{ padding: '20px', paddingTop: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{p.price} TL</span>
              <button style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Sepete Ekle</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
