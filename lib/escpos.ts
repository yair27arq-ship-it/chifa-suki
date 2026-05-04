/**
 * Genera bytes ESC/POS para impresoras térmicas de 58mm (32 chars/línea).
 */
import type { TicketData } from './buildTicketHtml';

// ── Constantes ESC/POS ──────────────────────────────────────────────────────
const ESC = 0x1B;
const GS  = 0x1D;
const LF  = 0x0A;

const CMD = {
  INIT:          [ESC, 0x40],
  CODE_PAGE_850: [ESC, 0x74, 0x02],   // CP850 – Multilingual Latin 1
  ALIGN_LEFT:    [ESC, 0x61, 0x00],
  ALIGN_CENTER:  [ESC, 0x61, 0x01],
  BOLD_ON:       [ESC, 0x45, 0x01],
  BOLD_OFF:      [ESC, 0x45, 0x00],
  SIZE_NORMAL:   [ESC, 0x21, 0x00],
  SIZE_DOUBLE:   [ESC, 0x21, 0x30],   // doble alto + ancho
  SIZE_DBL_H:    [ESC, 0x21, 0x10],   // solo doble alto
  FEED_2:        [ESC, 0x64, 0x02],
  FEED_4:        [ESC, 0x64, 0x04],
  CUT:           [GS,  0x56, 0x42, 0x00],
};

const WIDTH = 32; // chars por línea en fuente normal 58mm

// ── Helpers ─────────────────────────────────────────────────────────────────
/** Mapa CP850 para caracteres españoles fuera de ASCII */
const CP850: Record<string, number> = {
  á:0xA0, é:0x82, í:0xA1, ó:0xA2, ú:0xA3,
  Á:0xB5, É:0x90, Í:0xD6, Ó:0xE0, Ú:0xE9,
  ñ:0xA4, Ñ:0xA5,
  ü:0x81, Ü:0x9A,
  '¡':0xAD, '¿':0xA8,
};

function encodeText(text: string): number[] {
  const bytes: number[] = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code < 0x80) {
      bytes.push(code);
    } else {
      bytes.push(CP850[ch] ?? 0x3F); // '?' para desconocidos
    }
  }
  return bytes;
}

function txt(text: string): number[] { return encodeText(text); }
function lf(): number[] { return [LF]; }
function cmd(...groups: number[][]): number[] { return groups.flat(); }

function padR(s: string, n: number): string {
  return s.substring(0, n).padEnd(n);
}
function padL(s: string, n: number): string {
  return s.substring(0, n).padStart(n);
}

/** Dos columnas en la misma línea */
function col2(left: string, right: string, width = WIDTH): number[] {
  const gap = width - left.length - right.length;
  const line = gap >= 1
    ? left + ' '.repeat(gap) + right
    : left.substring(0, width - right.length) + right;
  return txt(line);
}

/** Línea de separador */
function sep(char: string): number[] {
  return txt(char.repeat(WIDTH));
}

function formatFechaHora(iso: string) {
  const d = new Date(iso);
  const tz = { timeZone: 'America/Lima' };
  const fecha = d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', ...tz });
  const hora  = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, ...tz });
  return { fecha, hora };
}

function precioStr(n: number): string {
  return Number(n).toFixed(2);
}

// ── Generador principal ──────────────────────────────────────────────────────
export function buildEscPos(data: TicketData): Uint8Array {
  const { tipo, mesaNombre, numeroOrden, items, total, timestamp, metodoPago, montoRecibido } = data;
  const { fecha, hora } = formatFechaHora(timestamp ?? new Date().toISOString());
  const esCocina = tipo === 'cocina';
  const titulo = esCocina ? 'COMANDA COCINA' : tipo === 'llevar' ? 'PARA LLEVAR' : 'SALON';

  const bytes: number[] = [];
  const push = (...chunks: number[][]) => bytes.push(...chunks.flat());

  // Init + code page
  push(CMD.INIT, CMD.CODE_PAGE_850);

  // ── Cabecera ──
  push(CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.SIZE_DOUBLE, txt('CHIFA SUKI'), lf());
  push(CMD.SIZE_NORMAL, txt('Restaurante'), lf());
  push(txt('RUC: 10715703446'), lf());
  push(CMD.BOLD_OFF);

  push(sep('='), lf());

  // ── Tipo ──
  push(CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.SIZE_DBL_H, txt(titulo), lf());
  push(CMD.SIZE_NORMAL, CMD.BOLD_OFF);

  push(sep('-'), lf());

  // ── Info ──
  push(CMD.ALIGN_LEFT);
  if (tipo === 'salon' && mesaNombre) {
    push(CMD.BOLD_ON, col2('Mesa:', mesaNombre), lf(), CMD.BOLD_OFF);
  }
  if (tipo === 'cocina' && mesaNombre) {
    push(CMD.BOLD_ON, col2('Mesa:', mesaNombre), lf(), CMD.BOLD_OFF);
  }
  if ((tipo === 'llevar' || tipo === 'cocina') && numeroOrden) {
    push(CMD.BOLD_ON, col2('Orden:', `#${numeroOrden}`), lf(), CMD.BOLD_OFF);
  }
  push(col2('Fecha:', fecha), lf());
  push(col2('Hora:', hora), lf());
  if (metodoPago) {
    const label = metodoPago === 'yape' ? 'Yape' : 'Efectivo';
    push(CMD.BOLD_ON, col2('Pago:', label), lf(), CMD.BOLD_OFF);
  }
  if (metodoPago === 'efectivo' && montoRecibido != null && total != null) {
    push(col2('Recibido:', `S/${precioStr(montoRecibido)}`), lf());
    push(col2('Vuelto:', `S/${precioStr(montoRecibido - total)}`), lf());
  }

  push(sep('-'), lf());

  // ── Encabezado columnas ──
  const CANT_W  = 4;
  const PRICE_W = 8;
  const DESC_W  = WIDTH - CANT_W - PRICE_W;
  push(CMD.BOLD_ON);
  push(txt(padR('CANT', CANT_W) + padR('DESCRIPCION', DESC_W) + padL('S/.', PRICE_W)), lf());
  push(CMD.BOLD_OFF);
  push(sep('-'), lf());

  // ── Items ──
  for (const item of items) {
    const cantStr  = padR(`${item.cantidad}x`, CANT_W);
    const priceStr = padL(precioStr(item.subtotal), PRICE_W);
    const nombre = item.nombre_plato;

    if (nombre.length <= DESC_W) {
      push(txt(cantStr + padR(nombre, DESC_W) + priceStr), lf());
    } else {
      push(txt(cantStr + padR(nombre.substring(0, DESC_W), DESC_W) + priceStr), lf());
      let rest = nombre.substring(DESC_W);
      while (rest.length > 0) {
        push(txt(' '.repeat(CANT_W) + padR(rest.substring(0, DESC_W), DESC_W)), lf());
        rest = rest.substring(DESC_W);
      }
    }

    if (item.descripcion) {
      let rest = item.descripcion;
      while (rest.length > 0) {
        push(txt(' '.repeat(CANT_W) + padR(rest.substring(0, DESC_W), DESC_W)), lf());
        rest = rest.substring(DESC_W);
      }
    }
    if (item.opcion_label && !item.isCustom) {
      const detalle = `+ ${item.opcion_label}`;
      if (detalle.length <= DESC_W) {
        push(txt(' '.repeat(CANT_W) + padR(detalle, DESC_W)), lf());
      } else {
        let rest = detalle;
        while (rest.length > 0) {
          push(txt(' '.repeat(CANT_W) + padR(rest.substring(0, DESC_W), DESC_W)), lf());
          rest = rest.substring(DESC_W);
        }
      }
    }
    if (item.notas?.trim()) {
      const nota = `* ${item.notas.trim()}`;
      if (nota.length <= DESC_W) {
        push(txt(' '.repeat(CANT_W) + padR(nota, DESC_W)), lf());
      } else {
        let rest = nota;
        while (rest.length > 0) {
          push(txt(' '.repeat(CANT_W) + padR(rest.substring(0, DESC_W), DESC_W)), lf());
          rest = rest.substring(DESC_W);
        }
      }
    }
  }

  // ── Totales ──
  if (total !== undefined) {
    push(sep('-'), lf());
    push(col2('SUBTOTAL', `S/${precioStr(total)}`), lf());
    push(sep('='), lf());
    push(CMD.BOLD_ON, CMD.SIZE_DBL_H, col2('TOTAL', `S/${precioStr(total)}`), lf());
    push(CMD.SIZE_NORMAL, CMD.BOLD_OFF);
  }

  push(sep('-'), lf());

  // ── Footer ──
  push(CMD.ALIGN_CENTER);
  if (esCocina) {
    push(CMD.BOLD_ON, txt('** COMANDA DE COCINA **'), lf(), CMD.BOLD_OFF);
  } else {
    push(txt('Gracias por su visita!'), lf());
    push(txt('Vuelva pronto'), lf());
  }

  push(CMD.FEED_4, CMD.CUT);

  return new Uint8Array(bytes);
}
