export default function LlevarLoading() {
  return (
    <div>
      <style>{`
        @keyframes sk{0%,100%{opacity:1}50%{opacity:.45}}
        .sk{animation:sk 1.5s ease-in-out infinite;background:var(--s3);border-radius:8px}
      `}</style>

      <div className="page-header" />

      <div className="content-top-row">
        <div className="sk" style={{ width: 32, height: 32, borderRadius: 8 }} />
        <div className="sk" style={{ width: 120, height: 20 }} />
        <div className="sk" style={{ width: 110, height: 32, borderRadius: 8, marginLeft: 'auto' }} />
      </div>

      <div className="llevar-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="sk" style={{ height: 160, borderRadius: 16, animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>
    </div>
  );
}
