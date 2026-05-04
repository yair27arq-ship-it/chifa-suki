'use client';

import { useState, useEffect } from 'react';
import type { Plato, OpcionPrecio } from '@/types';
import { formatPrecio } from '@/lib/utils';
import type { ItemCarrito } from '@/types';

const ENTRADAS = ['Sopa Wantan', 'Wantanes Fritos'] as const;

interface MenuModalProps {
  plato: Plato | null;
  onClose: () => void;
  onAgregar: (item: ItemCarrito) => void;
  esMenuConEntrada?: boolean;
}

export function MenuModal({ plato, onClose, onAgregar, esMenuConEntrada = false }: MenuModalProps) {
  const [cantidad, setCantidad] = useState(1);
  const [opcionSeleccionada, setOpcionSeleccionada] = useState<OpcionPrecio | null>(null);
  const [entradaSeleccionada, setEntradaSeleccionada] = useState<string | null>(null);

  useEffect(() => {
    setCantidad(1);
    setOpcionSeleccionada(null);
    setEntradaSeleccionada(null);
  }, [plato?.id]);

  if (!plato) return null;

  const tieneOpciones = plato.opciones_precio && plato.opciones_precio.length > 0;
  const precioActual = opcionSeleccionada ? opcionSeleccionada.precio : plato.precio;
  const totalItem = Number((precioActual * cantidad).toFixed(2));
  const puedeAgregar = !esMenuConEntrada || entradaSeleccionada !== null;

  const handleAgregar = () => {
    onAgregar({
      plato_id: plato.id,
      nombre_plato: plato.nombre,
      precio_unitario: precioActual,
      cantidad,
      subtotal: totalItem,
      opcion_label: esMenuConEntrada ? entradaSeleccionada : (opcionSeleccionada?.label || null),
      descripcion: plato.descripcion ?? null,
    });
    onClose();
    setCantidad(1);
    setOpcionSeleccionada(null);
    setEntradaSeleccionada(null);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />

        <div className="modal-header">
          <h2 className="modal-title">{plato.nombre}</h2>
          {!tieneOpciones && (
            <p className="modal-precio-base">{formatPrecio(plato.precio)}</p>
          )}
          {plato.descripcion && (
            <p className="modal-descripcion">{plato.descripcion}</p>
          )}
        </div>

        {esMenuConEntrada && (
          <div className="modal-section">
            <p className="modal-label">Elige tu entrada</p>
            <div className="modal-opciones">
              {ENTRADAS.map((entrada) => (
                <button
                  key={entrada}
                  onClick={() => setEntradaSeleccionada(entrada)}
                  className={`opcion-btn ${entradaSeleccionada === entrada ? 'activa' : ''}`}
                >
                  <span>{entrada}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {tieneOpciones && (
          <div className="modal-section">
            <p className="modal-label">Variante</p>
            <div className="modal-opciones">
              {plato.opciones_precio!.map((op) => (
                <button
                  key={op.label}
                  onClick={() =>
                    setOpcionSeleccionada(
                      opcionSeleccionada?.label === op.label ? null : op
                    )
                  }
                  className={`opcion-btn ${opcionSeleccionada?.label === op.label ? 'activa' : ''}`}
                >
                  <span>{op.label}</span>
                  <span className="opcion-precio">{formatPrecio(op.precio)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="modal-section">
          <p className="modal-label">Cantidad</p>
          <div className="cantidad-control">
            <button
              onClick={() => setCantidad(Math.max(1, cantidad - 1))}
              className="cantidad-btn"
              aria-label="Reducir cantidad"
            >
              −
            </button>
            <span className="cantidad-sep" />
            <span className="cantidad-numero">{cantidad}</span>
            <span className="cantidad-sep" />
            <button
              onClick={() => setCantidad(cantidad + 1)}
              className="cantidad-btn"
              aria-label="Aumentar cantidad"
            >
              +
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <div className="modal-total">
            <span className="modal-total-label">Total</span>
            <span className="modal-total-valor">{formatPrecio(totalItem)}</span>
          </div>
          <button onClick={handleAgregar} className="btn-agregar" disabled={!puedeAgregar} style={!puedeAgregar ? { opacity: 0.5 } : {}}>
            Agregar al pedido
          </button>
        </div>
      </div>
    </div>
  );
}
