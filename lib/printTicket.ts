import type { TicketData } from './buildTicketHtml';
import { buildTicketHtml } from './buildTicketHtml';
import { buildEscPos } from './escpos';
import { getModoImpresion, imprimirBluetooth } from './bluetoothPrinter';

// ── Impresión via iframe (navegador) ──────────────────────────────────────────

const TICKET_STYLES = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10px;
      font-weight: 700;
      color: #000;
      background: #fff;
      width: 48mm;
      padding: 1mm 1mm;
    }

    /* Header */
    .ticket-header { text-align: center; margin-bottom: 4px; }
    .ticket-logo {
      display: block;
      margin: 0 auto 4px;
      width: 40px;
      height: 40px;
      object-fit: contain;
      border-radius: 50%;
      border: 2px solid #000;
      padding: 2px;
    }
    .ticket-restaurante {
      font-size: 15px;
      font-weight: 900;
      letter-spacing: 0.10em;
      margin: 0;
    }
    .ticket-subtitulo, .ticket-ruc {
      font-size: 10px;
      font-weight: 700;
      color: #000;
      margin: 1px 0 0;
    }

    /* Tipo de ticket */
    .ticket-tipo {
      text-align: center;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.08em;
      padding: 5px 0;
    }

    /* ─── Separadores ─── */
    .ticket-sep-doble {
      border-top: 2px double #000;
      margin: 5px 0;
    }
    .ticket-sep-simple {
      border-top: 1px solid #000;
      margin: 4px 0;
    }

    /* Info */
    .ticket-info { margin: 4px 0; }
    .ticket-info-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 0;
    }

    /* Columnas */
    .ticket-col-header {
      display: flex;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      padding: 3px 0;
    }
    .ticket-col-cant   { width: 22px; flex-shrink: 0; text-align: left; }
    .ticket-col-nombre { flex: 1; padding: 0 2px; }
    .ticket-col-precio { width: 42px; text-align: right; flex-shrink: 0; }

    /* Items */
    .ticket-items { margin: 2px 0; }
    .ticket-item {
      display: flex;
      align-items: baseline;
      padding: 3px 0;
      font-size: 11px;
      font-weight: 700;
    }
    .ticket-item-opcion { font-size: 9px; font-weight: 700; color: #000; }
    .ticket-item-nota   { font-size: 9px; font-weight: 700; color: #000; font-style: italic; }

    /* Totales */
    .ticket-total-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 0;
      color: #000;
    }
    .ticket-total-final {
      display: flex;
      justify-content: space-between;
      font-size: 15px;
      font-weight: 900;
      padding: 4px 0;
    }

    /* Footer */
    .ticket-footer {
      text-align: center;
      margin-top: 10px;
      font-size: 10px;
      font-weight: 700;
      color: #000;
    }
    .ticket-footer-sub { font-size: 9px; font-weight: 700; color: #000; margin-top: 2px; }

    @media print {
      @page {
        margin: 0;
      }
      body { padding: 1mm 1mm; width: 48mm; }
    }
`;

export function printTicketWindow(ticketHtml: string) {
  const win = window.open('', '_blank', 'width=400,height=700');
  if (!win) {
    alert('El navegador bloqueó la ventana emergente. Permite pop-ups para esta página e intenta de nuevo.');
    return;
  }

  win.document.open();
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ticket</title><style>${TICKET_STYLES}</style></head><body>${ticketHtml}</body></html>`);
  win.document.close();

  const doPrint = () => {
    win.focus();
    win.print();
  };

  const img = win.document.querySelector('img');
  if (img && !img.complete) {
    img.onload  = doPrint;
    img.onerror = doPrint;
  } else {
    setTimeout(doPrint, 300);
  }
}

// ── Función unificada ────────────────────────────────────────────────────────

/**
 * Imprime un ticket usando el método configurado (Bluetooth o navegador).
 * Si Bluetooth falla, hace fallback a impresión por navegador.
 */
export async function printTicket(data: TicketData): Promise<void> {
  if (getModoImpresion() === 'bluetooth') {
    try {
      const bytes = buildEscPos(data);
      await imprimirBluetooth(bytes);
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error Bluetooth';
      // Notificar al usuario y hacer fallback al navegador
      console.error('BT print failed:', msg);
      alert(`Bluetooth: ${msg}\nUsando impresión por navegador.`);
    }
  }
  printTicketWindow(buildTicketHtml(data));
}
