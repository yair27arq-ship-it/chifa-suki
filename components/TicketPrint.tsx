'use client';

import { formatPrecio } from '@/lib/utils';
import type { ItemCarrito } from '@/types';

interface TicketPrintProps {
  tipo: 'salon' | 'cocina' | 'llevar';
  mesaNombre?: string;
  numeroOrden?: number | null;
  items: ItemCarrito[];
  total?: number;
  timestamp?: string;
}

function formatFechaHora(iso: string) {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora  = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
  return { fecha, hora };
}

export function TicketPrint({
  tipo,
  mesaNombre,
  numeroOrden,
  items,
  total,
  timestamp,
}: TicketPrintProps) {
  const { fecha, hora } = formatFechaHora(timestamp ?? new Date().toISOString());

  const escocina = tipo === 'cocina';
  const titulo   = escocina ? 'COMANDA COCINA' : tipo === 'llevar' ? 'PARA LLEVAR' : 'SALÓN';

  return (
    <div className="ticket-print" id="ticket-print">

      {/* Logo + cabecera */}
      <div className="ticket-header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Logo" className="ticket-logo" />
        <h1 className="ticket-restaurante">CHIFA SUKI</h1>
        <p className="ticket-subtitulo">Restaurante</p>
        <p className="ticket-ruc">RUC: 10715703446</p>
      </div>

      <div className="ticket-sep-doble">{'═'.repeat(32)}</div>

      {/* Tipo de ticket */}
      <div className="ticket-tipo">{titulo}</div>

      {/* Info del pedido */}
      <div className="ticket-info">
        {tipo === 'salon' && mesaNombre && (
          <div className="ticket-info-row">
            <span>Mesa</span>
            <span><strong>{mesaNombre}</strong></span>
          </div>
        )}
        {(tipo === 'llevar' || tipo === 'cocina') && numeroOrden && (
          <div className="ticket-info-row">
            <span>Orden</span>
            <span><strong>#{numeroOrden}</strong></span>
          </div>
        )}
        <div className="ticket-info-row">
          <span>Fecha</span>
          <span>{fecha}</span>
        </div>
        <div className="ticket-info-row">
          <span>Hora</span>
          <span>{hora}</span>
        </div>
      </div>

      <div className="ticket-sep-simple">{'─'.repeat(32)}</div>

      {/* Encabezado columnas */}
      <div className="ticket-col-header">
        <span className="ticket-col-cant">CANT</span>
        <span className="ticket-col-nombre">DESCRIPCIÓN</span>
        <span className="ticket-col-precio">S/.</span>
      </div>

      <div className="ticket-sep-simple">{'─'.repeat(32)}</div>

      {/* Items */}
      <div className="ticket-items">
        {items.map((item, idx) => (
          <div key={idx} className="ticket-item">
            <span className="ticket-col-cant">{item.cantidad}x</span>
            <span className="ticket-col-nombre">
              {item.nombre_plato}
              {item.opcion_label && !item.opcion_label.startsWith('_cust') && (
                <span className="ticket-item-opcion"> ({item.opcion_label})</span>
              )}
            </span>
            <span className="ticket-col-precio">{formatPrecio(item.subtotal)}</span>
          </div>
        ))}
      </div>

      {total !== undefined && (
        <>
          <div className="ticket-sep-simple">{'─'.repeat(32)}</div>
          <div className="ticket-total-row">
            <span>SUBTOTAL</span>
            <span>{formatPrecio(total)}</span>
          </div>
          <div className="ticket-sep-doble">{'═'.repeat(32)}</div>
          <div className="ticket-total-final">
            <span>TOTAL</span>
            <span>{formatPrecio(total)}</span>
          </div>
        </>
      )}

      <div className="ticket-sep-simple">{'─'.repeat(32)}</div>

      <div className="ticket-footer">
        {escocina ? (
          <p>⭐ COMANDA DE COCINA ⭐</p>
        ) : (
          <>
            <p>¡Gracias por su visita!</p>
            <p className="ticket-footer-sub">Vuelva pronto</p>
          </>
        )}
      </div>

    </div>
  );
}
