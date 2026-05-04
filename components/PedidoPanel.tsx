'use client';

import { useState } from 'react';
import { formatPrecio } from '@/lib/utils';
import { Minus, Plus, Trash2, Save, Users, PenLine } from 'lucide-react';
import type { ItemCarrito } from '@/types';

interface PedidoPanelProps {
  items: ItemCarrito[];
  total: number;
  isPending?: boolean;
  onActualizar: (platoId: number, opcionLabel: string | null, cantidad: number) => void;
  onQuitar: (platoId: number, opcionLabel: string | null) => void;
  onCobrar: () => void;
  onDividir: () => void;
  onAnular: () => void;
  onGuardar?: () => void;
  onAgregarPersonalizado?: () => void;
  onNotasItem: (platoId: number, opcionLabel: string | null, notas: string) => void;
  tipo: 'mesa' | 'llevar';
}

export function PedidoPanel({
  items,
  total,
  isPending,
  onActualizar,
  onQuitar,
  onCobrar,
  onDividir,
  onAnular,
  onGuardar,
  onAgregarPersonalizado,
  onNotasItem,
  tipo: _tipo,
}: PedidoPanelProps) {
  const [notaAbierta, setNotaAbierta] = useState<string | null>(null);

  const key = (item: ItemCarrito) => `${item.plato_id}|${item.opcion_label}`;

  return (
    <div className="pedido-panel">
      <div className="pedido-items-list">
        {items.length === 0 ? (
          <p className="pedido-vacio">Selecciona un plato para empezar</p>
        ) : (
          items.map((item) => {
            const k = key(item);
            const mostrarNota = notaAbierta === k || !!item.notas;
            return (
              <div key={k} className="pedido-item-wrap">
                <div className="pedido-item">
                  <div className="pedido-item-row">
                    <div className="pedido-item-info">
                      <span className="pedido-item-nombre">
                        {item.nombre_plato}
                        {item.opcion_label && !item.isCustom && (
                          <span className="pedido-item-opcion"> · {item.opcion_label}</span>
                        )}
                      </span>
                      <span className="pedido-item-subtotal">{formatPrecio(item.subtotal)}</span>
                    </div>

                    <div className="pedido-item-controles">
                      <button onClick={() => onQuitar(item.plato_id, item.opcion_label)} className="pedido-btn-quitar" aria-label="Quitar">
                        <Trash2 size={13} />
                      </button>
                      <button onClick={() => onActualizar(item.plato_id, item.opcion_label, item.cantidad - 1)} className="pedido-btn-cantidad" aria-label="Menos">
                        <Minus size={12} />
                      </button>
                      <span className="pedido-item-cantidad">{item.cantidad}</span>
                      <button onClick={() => onActualizar(item.plato_id, item.opcion_label, item.cantidad + 1)} className="pedido-btn-cantidad" aria-label="Más">
                        <Plus size={12} />
                      </button>
                      <button
                        className={`pedido-btn-nota${item.notas ? ' has-nota' : ''}`}
                        aria-label="Nota"
                        onClick={() => setNotaAbierta(mostrarNota && !item.notas ? null : k)}
                      >
                        <PenLine size={11} />
                      </button>
                    </div>
                  </div>
                </div>

                {mostrarNota && (
                  <div className="pedido-item-nota-section">
                    <div className="pedido-nota-section-label">
                      <PenLine size={10} />
                      <span>Nota para cocina</span>
                    </div>
                    <input
                      className="pedido-item-nota-input"
                      type="text"
                      placeholder="Sin cebolla, sin picante…"
                      value={item.notas ?? ''}
                      autoFocus={notaAbierta === k && !item.notas}
                      onChange={(e) => onNotasItem(item.plato_id, item.opcion_label, e.target.value)}
                      onBlur={() => { if (!item.notas) setNotaAbierta(null); }}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {onAgregarPersonalizado && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button className="btn-personalizado" onClick={onAgregarPersonalizado}>
            <PenLine size={11} />
            Ítem personalizado
          </button>
        </div>
      )}

      <div className="pedido-total-row">
        <span className="pedido-total-label">Total</span>
        <span className="pedido-total-valor">{formatPrecio(total)}</span>
      </div>

      <div className="pedido-acciones">
        <button onClick={onGuardar} disabled={isPending || items.length === 0} className="btn-accion btn-guardar">
          <Save size={13} />
          Guardar
        </button>
        <button onClick={onAnular} className="btn-accion btn-anular">
          Anular
        </button>
        <button onClick={onDividir} disabled={isPending || items.length === 0} className="btn-accion btn-dividir">
          <Users size={13} />
          Dividir
        </button>
        <button onClick={onCobrar} disabled={isPending || items.length === 0} className="btn-accion btn-cobrar">
          {isPending ? '···' : `Cobrar ${formatPrecio(total)}`}
        </button>
      </div>
    </div>
  );
}
