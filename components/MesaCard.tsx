'use client';

import { formatPrecio } from '@/lib/utils';
import type { Mesa } from '@/types';

interface MesaCardProps {
  mesa: Mesa;
  pedidoTotal?: number | null;
  pedidoId?: string | null;
  onClick: () => void;
}

function TableSvg({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" fill={color}>
      {/* Sillas — arriba, abajo, izquierda, derecha */}
      <rect x="17" y="1"  width="14" height="9"  rx="3.5" opacity="0.55" />
      <rect x="17" y="38" width="14" height="9"  rx="3.5" opacity="0.55" />
      <rect x="1"  y="17" width="9"  height="14" rx="3.5" opacity="0.55" />
      <rect x="38" y="17" width="9"  height="14" rx="3.5" opacity="0.55" />
      {/* Mesa — círculo central */}
      <circle cx="24" cy="24" r="12" opacity="0.9" />
      {/* Línea central decorativa */}
      <line x1="24" y1="17" x2="24" y2="31" stroke="white" strokeWidth="1.2" strokeOpacity="0.4" />
      <line x1="17" y1="24" x2="31" y2="24" stroke="white" strokeWidth="1.2" strokeOpacity="0.4" />
    </svg>
  );
}

export function MesaCard({ mesa, pedidoTotal, pedidoId, onClick }: MesaCardProps) {
  const ocupada = !!pedidoId;
  const iconColor = ocupada ? '#B45309' : '#111111';
  const iconOpacity = ocupada ? 0.22 : 0.09;

  return (
    <button
      onClick={onClick}
      className={`mesa-card ${ocupada ? 'ocupada' : 'libre'}`}
      aria-label={`${mesa.nombre || `Mesa ${mesa.numero}`} — ${ocupada ? 'ocupada' : 'libre'}`}
    >
      {/* Icono decorativo de mesa */}
      <span className="mesa-card-icon" style={{ opacity: iconOpacity }}>
        <TableSvg color={iconColor} />
      </span>

      {/* Badge de estado */}
      <div className={`mesa-badge ${ocupada ? 'mesa-badge--ocupada' : 'mesa-badge--libre'}`}>
        <span className="status-dot" />
        {ocupada ? 'Ocupada' : 'Libre'}
      </div>

      {/* Número */}
      <div className="mesa-card-num">{mesa.numero}</div>

      {/* Footer */}
      <div className="mesa-card-foot">
        {ocupada && pedidoTotal != null ? (
          <span className="mesa-card-total">{formatPrecio(pedidoTotal)}</span>
        ) : (
          <span className="mesa-card-name">{mesa.nombre || `Mesa ${mesa.numero}`}</span>
        )}
      </div>
    </button>
  );
}
