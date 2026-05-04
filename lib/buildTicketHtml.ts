/**
 * Genera el HTML del ticket como string puro.
 * Se usa con printTicketWindow() para imprimir en una ventana emergente,
 * evitando los problemas de visibilidad CSS con el DOM anidado de Next.js.
 */
import { formatPrecio } from '@/lib/utils';
import type { ItemCarrito, MetodoPago, PagoParte } from '@/types';

export interface TicketData {
  tipo: 'salon' | 'cocina' | 'llevar';
  mesaNombre?: string;
  numeroOrden?: number | null;
  items: ItemCarrito[];
  total?: number;
  timestamp?: string;
  metodoPago?: MetodoPago | null;
  montoRecibido?: number;
  pagoPartes?: PagoParte[];
}

function formatFechaHora(iso: string) {
  const d = new Date(iso);
  const tz = { timeZone: 'America/Lima' };
  const fecha = d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', ...tz });
  const hora  = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, ...tz });
  return { fecha, hora };
}

export function buildTicketHtml(data: TicketData): string {
  const { tipo, mesaNombre, numeroOrden, items, total, timestamp, metodoPago, montoRecibido, pagoPartes } = data;
  const { fecha, hora } = formatFechaHora(timestamp ?? new Date().toISOString());
  const esCocina = tipo === 'cocina';
  const titulo = esCocina ? 'COMANDA COCINA' : tipo === 'llevar' ? 'PARA LLEVAR' : null;

  let html = '';

  // Header
  html += `<div class="ticket-header">`;
  html += `<img src="/logo.png" alt="Logo" class="ticket-logo" />`;
  html += `<h1 class="ticket-restaurante">CHIFA SUKI</h1>`;
  html += `<p class="ticket-subtitulo">Restaurante</p>`;
  html += `<p class="ticket-ruc">RUC: 10715703446</p>`;
  html += `</div>`;

  html += `<div class="ticket-sep-doble"></div>`;

  // Tipo (solo si no es salon)
  if (titulo) {
    html += `<div class="ticket-tipo">${titulo}</div>`;
  }

  // Info
  html += `<div class="ticket-info">`;
  if (tipo === 'salon' && mesaNombre) {
    html += `<div class="ticket-info-row"><span>Mesa</span><span><strong>${mesaNombre}</strong></span></div>`;
  }
  if ((tipo === 'llevar' || tipo === 'cocina') && numeroOrden) {
    html += `<div class="ticket-info-row"><span>Orden</span><span><strong>#${numeroOrden}</strong></span></div>`;
  }
  if (tipo === 'cocina' && mesaNombre) {
    html += `<div class="ticket-info-row"><span>Mesa</span><span><strong>${mesaNombre}</strong></span></div>`;
  }
  html += `<div class="ticket-info-row"><span>Fecha</span><span>${fecha}</span></div>`;
  html += `<div class="ticket-info-row"><span>Hora</span><span>${hora}</span></div>`;
  if (metodoPago === 'mixto' && pagoPartes && pagoPartes.length > 0) {
    html += `<div class="ticket-info-row"><span>Pago</span><span><strong>Mixto</strong></span></div>`;
    for (const parte of pagoPartes) {
      const pLabel = parte.metodo === 'yape' ? 'Yape' : parte.metodo === 'tarjeta' ? 'Tarjeta' : 'Efectivo';
      html += `<div class="ticket-info-row"><span>&nbsp;&nbsp;${pLabel}</span><span><strong>${formatPrecio(parte.monto)}</strong></span></div>`;
      if (parte.metodo === 'efectivo' && parte.montoRecibido != null) {
        html += `<div class="ticket-info-row"><span>&nbsp;&nbsp;&nbsp;Recibido</span><span><strong>${formatPrecio(parte.montoRecibido)}</strong></span></div>`;
        html += `<div class="ticket-info-row"><span>&nbsp;&nbsp;&nbsp;Vuelto</span><span><strong>${formatPrecio(parte.montoRecibido - parte.monto)}</strong></span></div>`;
      }
    }
  } else if (metodoPago) {
    const label = metodoPago === 'yape' ? 'Yape' : metodoPago === 'tarjeta' ? 'Tarjeta' : 'Efectivo';
    html += `<div class="ticket-info-row"><span>Pago</span><span><strong>${label}</strong></span></div>`;
    if (metodoPago === 'efectivo' && montoRecibido != null && total != null) {
      const vuelto = montoRecibido - total;
      html += `<div class="ticket-info-row"><span>Recibido</span><span><strong>${formatPrecio(montoRecibido)}</strong></span></div>`;
      html += `<div class="ticket-info-row"><span>Vuelto</span><span><strong>${formatPrecio(vuelto)}</strong></span></div>`;
    }
  }
  html += `</div>`;

  html += `<div class="ticket-sep-simple"></div>`;

  // Column headers
  html += `<div class="ticket-col-header">`;
  html += `<span class="ticket-col-cant">CANT</span>`;
  html += `<span class="ticket-col-nombre">DESCRIPCIÓN</span>`;
  html += `<span class="ticket-col-precio">S/.</span>`;
  html += `</div>`;

  html += `<div class="ticket-sep-simple"></div>`;

  // Items
  html += `<div class="ticket-items">`;
  for (const item of items) {
    html += `<div class="ticket-item">`;
    html += `<span class="ticket-col-cant">${item.cantidad}x</span>`;
    html += `<span class="ticket-col-nombre">${item.nombre_plato}</span>`;
    html += `<span class="ticket-col-precio">${formatPrecio(item.subtotal)}</span>`;
    html += `</div>`;
    if (item.descripcion) {
      html += `<div class="ticket-item" style="padding-top:0">`;
      html += `<span class="ticket-col-cant"></span>`;
      html += `<span class="ticket-col-nombre ticket-item-opcion">${item.descripcion}</span>`;
      html += `<span class="ticket-col-precio"></span>`;
      html += `</div>`;
    }
    if (item.opcion_label && !item.isCustom) {
      html += `<div class="ticket-item" style="padding-top:0">`;
      html += `<span class="ticket-col-cant"></span>`;
      html += `<span class="ticket-col-nombre ticket-item-opcion">+ ${item.opcion_label}</span>`;
      html += `<span class="ticket-col-precio"></span>`;
      html += `</div>`;
    }
    if (item.notas?.trim()) {
      html += `<div class="ticket-item" style="padding-top:0">`;
      html += `<span class="ticket-col-cant"></span>`;
      html += `<span class="ticket-col-nombre ticket-item-nota">📝 ${item.notas.trim()}</span>`;
      html += `<span class="ticket-col-precio"></span>`;
      html += `</div>`;
    }
  }
  html += `</div>`;

  // Totals
  if (total !== undefined) {
    html += `<div class="ticket-sep-simple"></div>`;
    html += `<div class="ticket-total-row"><span>SUBTOTAL</span><span>${formatPrecio(total)}</span></div>`;
    html += `<div class="ticket-sep-doble"></div>`;
    html += `<div class="ticket-total-final"><span>TOTAL</span><span>${formatPrecio(total)}</span></div>`;
  }

  html += `<div class="ticket-sep-simple"></div>`;

  // Footer
  html += `<div class="ticket-footer">`;
  if (esCocina) {
    html += `<p>⭐ COMANDA DE COCINA ⭐</p>`;
  } else {
    html += `<p>¡Gracias por su visita!</p>`;
    html += `<p class="ticket-footer-sub">Vuelva pronto</p>`;
  }
  html += `</div>`;

  return html;
}
