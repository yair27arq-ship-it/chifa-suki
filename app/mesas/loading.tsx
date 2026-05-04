export default function MesasLoading() {
  return (
    <div>
      <style>{`
        @keyframes sk{0%,100%{opacity:1}50%{opacity:.45}}
        .sk{animation:sk 1.5s ease-in-out infinite;background:var(--s3);border-radius:8px}
      `}</style>

      <div className="page-header" />

      {/* Stats bar */}
      <div className="mesas-stats">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="mesas-stat">
            <div className="sk" style={{ width: 36, height: 22, animationDelay: `${i * 0.1}s` }} />
            <div className="sk" style={{ width: 44, height: 10, marginTop: 4, animationDelay: `${i * 0.1 + 0.05}s` }} />
          </div>
        ))}
      </div>

      {/* Mesa cards grid */}
      <div className="mesas-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="sk" style={{ height: 152, borderRadius: 16, animationDelay: `${i * 0.06}s` }} />
        ))}
      </div>
    </div>
  );
}
