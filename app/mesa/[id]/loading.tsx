export default function MesaLoading() {
  return (
    <>
      <style>{`
        @keyframes sk{0%,100%{opacity:1}50%{opacity:.45}}
        .sk{animation:sk 1.5s ease-in-out infinite;background:var(--s3);border-radius:8px}
      `}</style>

      <div className="page-header" />

      {/* Top row: back + title */}
      <div className="content-top-row">
        <div className="sk" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
        <div className="sk" style={{ width: 100, height: 20 }} />
        <div className="sk" style={{ width: 32, height: 32, borderRadius: 8, marginLeft: 'auto' }} />
      </div>

      {/* Category tabs */}
      <div className="category-tabs">
        {[80, 72, 100, 64, 88].map((w, i) => (
          <div key={i} className="sk" style={{ width: w, height: 30, borderRadius: 99, flexShrink: 0, animationDelay: `${i * 0.07}s` }} />
        ))}
      </div>

      {/* Platos grid */}
      <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="sk" style={{ height: 72, borderRadius: 12, animationDelay: `${i * 0.05}s` }} />
        ))}
      </div>

      {/* Pedido panel placeholder */}
      <div style={{ position: 'fixed', bottom: 60, left: 0, right: 0, height: 64, background: 'var(--s1)', borderTop: '1px solid var(--bd)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10 }}>
        <div className="sk" style={{ flex: 1, height: 40, borderRadius: 10 }} />
        <div className="sk" style={{ width: 80, height: 40, borderRadius: 10, animationDelay: '0.1s' }} />
      </div>
    </>
  );
}
