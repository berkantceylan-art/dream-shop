export default function Page() {
  const products = [
    { id: 1, name: 'Minimalist Sırt Çantası', price: '1.250 TL', tag: 'Aksesuar' },
    { id: 2, name: 'Kablosuz Kulaklık', price: '2.400 TL', tag: 'Elektronik' },
    { id: 3, name: 'Seramik Tasarım Kupa', price: '320 TL', tag: 'Ev & Yaşam' }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{ maxWidth: '900px', margin: '0 auto 30px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '38px', color: '#1e293b', marginBottom: '8px' }}>🛒 Dream Shop Vitrini</h1>
        <p style={{ color: '#64748b', fontSize: '16px' }}>Mağaza başarıyla yayında! İlk ürün koleksiyonumuz:</p>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        {products.map((item) => (
          <div key={item.id} style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb', background: '#eff6ff', padding: '4px 8px', borderRadius: '4px' }}>{item.tag}</span>
            <h2 style={{ fontSize: '20px', color: '#0f172a', margin: '12px 0' }}>{item.name}</h2>
            <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#16a34a', margin: '0 0 16px 0' }}>{item.price}</p>
            <button style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Sepete Ekle</button>
          </div>
        ))}
      </main>
    </div>
  );
}
