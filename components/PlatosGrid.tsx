'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Plato } from '@/types';
import { formatPrecio } from '@/lib/utils';

const ORDEN_SECCIONES = [
  'CHAUFA',
  'TALLARIN',
  'PLATOS FUERTES',
  'PATO ASADO',
  'CHANCHO ASADO',
  'POLLO',
  'CHICHARRON DE POLLO',
  'CHICHARRON DE ALITA',
];

function rankSeccion(seccion: string | null): number {
  if (!seccion) return 999;
  const idx = ORDEN_SECCIONES.findIndex((s) => s === seccion.toUpperCase());
  return idx === -1 ? 998 : idx;
}

interface PlatosGridProps {
  platos: Plato[];
  onSelect: (plato: Plato) => void;
  mostrarSecciones?: boolean;
}

export function PlatosGrid({ platos, onSelect, mostrarSecciones = true }: PlatosGridProps) {
  const tieneSecciones = mostrarSecciones && platos.some((p) => p.seccion);
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});

  const toggle = (seccion: string) =>
    setAbiertas((prev) => ({ ...prev, [seccion]: !prev[seccion] }));

  if (!tieneSecciones) {
    return (
      <div className="platos-grid">
        {platos.map((plato) => (
          <PlatoCard key={plato.id} plato={plato} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  // Agrupar por sección y ordenar según ORDEN_SECCIONES
  const map = new Map<string, Plato[]>();
  const sinSeccion: Plato[] = [];

  for (const plato of platos) {
    if (plato.seccion) {
      if (!map.has(plato.seccion)) map.set(plato.seccion, []);
      map.get(plato.seccion)!.push(plato);
    } else {
      sinSeccion.push(plato);
    }
  }

  const grupos = Array.from(map.entries())
    .sort(([a], [b]) => rankSeccion(a) - rankSeccion(b))
    .map(([seccion, items]) => ({ seccion, platos: items }));

  if (sinSeccion.length > 0) {
    grupos.push({ seccion: '', platos: sinSeccion });
  }

  return (
    <>
      {grupos.map((grupo) => {
        const colapsada = grupo.seccion ? !abiertas[grupo.seccion] : false;

        return (
          <div key={grupo.seccion || '__sin_seccion'}>
            {grupo.seccion ? (
              <button onClick={() => toggle(grupo.seccion)} className="plato-seccion-header">
                <span className="plato-seccion-header-left">
                  <span>{grupo.seccion}</span>
                  <span className="plato-seccion-count">{grupo.platos.length}</span>
                </span>
                <ChevronDown
                  size={15}
                  style={{
                    flexShrink: 0,
                    color: 'var(--t3)',
                    transform: colapsada ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.18s ease',
                  }}
                />
              </button>
            ) : null}

            {!colapsada && (
              <div className="platos-grid">
                {grupo.platos.map((plato) => (
                  <PlatoCard key={plato.id} plato={plato} onSelect={onSelect} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function PlatoCard({ plato, onSelect }: { plato: Plato; onSelect: (p: Plato) => void }) {
  return (
    <button className="plato-card" onClick={() => onSelect(plato)}>
      <span className="plato-nombre">{plato.nombre}</span>
      <span className="plato-precio">{formatPrecio(plato.precio)}</span>
      {plato.descripcion && (
        <span className="plato-descripcion">{plato.descripcion}</span>
      )}
      {plato.opciones_precio && (
        <span className="plato-opciones-label">+ variantes</span>
      )}
    </button>
  );
}
