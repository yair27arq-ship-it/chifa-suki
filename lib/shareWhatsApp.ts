import type { ItemCarrito } from '@/types';

interface ShareTicketOptions {
  mesaNombre: string;
  items: ItemCarrito[];
  total: number;
  timestamp?: string;
}

export function shareTicketWhatsApp({ mesaNombre, items, total, timestamp }: ShareTicketOptions) {
  const now = new Date(timestamp ?? new Date().toISOString());
  const fecha = now.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora  = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });

  const lineas = items.map((item) => {
    const nombre = item.opcion_label ? `${item.nombre_plato} (${item.opcion_label})` : item.nombre_plato;
    return `• ${item.cantidad}x ${nombre} — S/ ${item.subtotal.toFixed(2)}`;
  });

  const mensaje = [
    `🧾 *CHIFA SUKI*`,
    `📍 ${mesaNombre}`,
    `📅 ${fecha}  🕐 ${hora}`,
    ``,
    lineas.join('\n'),
    ``,
    `─────────────────`,
    `*TOTAL: S/ ${total.toFixed(2)}*`,
    ``,
    `¡Gracias por su visita! 🙏`,
  ].join('\n');

  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}
