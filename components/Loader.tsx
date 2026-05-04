function BowlSvg({ size = 56 }: { size?: number }) {
  const scale = size / 56;
  const h = Math.round(64 * scale);
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 56 64"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path className="steam steam-1" d="M16 30 C14 25 17 21 15 16" strokeWidth="1.8" />
      <path className="steam steam-2" d="M28 27 C26 22 29 18 27 13" strokeWidth="1.8" />
      <path className="steam steam-3" d="M40 30 C38 25 41 21 39 16" strokeWidth="1.8" />
      <line className="chop chop-1" x1="12" y1="22" x2="32" y2="38" strokeWidth="2" />
      <line className="chop chop-2" x1="24" y1="20" x2="44" y2="36" strokeWidth="2" />
      <path d="M6 38 Q6 38 28 40 Q50 38 50 38" strokeWidth="2.2" />
      <path d="M6 38 Q7 58 28 60 Q49 58 50 38" strokeWidth="2.2" />
    </svg>
  );
}

export function Loader({ text }: { text?: string }) {
  return (
    <div className="loader-wrap">
      <div className="loader-icon">
        <BowlSvg size={56} />
      </div>
      {text && <p className="loader-text">{text}</p>}
    </div>
  );
}

export function BowlLoaderBtn() {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: 'inherit', opacity: 0.9, lineHeight: 0 }}>
        <BowlSvg size={20} />
      </span>
      Creando…
    </span>
  );
}
