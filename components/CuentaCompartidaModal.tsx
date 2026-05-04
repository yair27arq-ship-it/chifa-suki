'use client';

import { useState } from 'react';
import { X, Minus, Plus, Check, Printer } from 'lucide-react';
import { formatPrecio } from '@/lib/utils';
import { printTicketWindow } from '@/lib/printTicket';
import type { ItemCarrito, MetodoPago } from '@/types';

interface Persona {
  monto: string;
  metodo: MetodoPago | null;
  montoRecibido: string;
  pagado: boolean;
}

interface Props {
  total: number;
  mesaNombre: string;
  items: ItemCarrito[];
  onClose: () => void;
  onCobrar: (metodoPago: MetodoPago) => void;
  isPending: boolean;
}

function makePersonas(n: number, total: number, prev: Persona[] = []): Persona[] {
  const base = Math.floor((total / n) * 100) / 100;
  return Array.from({ length: n }, (_, i) => {
    if (prev[i]?.pagado) return prev[i];
    return { monto: base.toFixed(2), metodo: prev[i]?.metodo ?? null, montoRecibido: '', pagado: false };
  });
}

function buildSplitTicketHtml(
  mesaNombre: string,
  personaNum: number,
  totalPersonas: number,
  monto: number,
  metodo: MetodoPago | null,
  montoRecibido: number | undefined,
  items: ItemCarrito[],
  totalGeneral: number,
): string {
  const ahora = new Date();
  const tz = { timeZone: 'America/Lima' };
  const fecha = ahora.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', ...tz });
  const hora  = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, ...tz });

  let html = '';
  html += `<div class="ticket-header">`;
  html += `<img src="/logo.png" alt="Logo" class="ticket-logo" />`;
  html += `<h1 class="ticket-restaurante">CHIFA SUKI</h1>`;
  html += `<p class="ticket-subtitulo">Restaurante</p>`;
  html += `<p class="ticket-ruc">RUC: 10715703446</p>`;
  html += `</div>`;
  html += `<div class="ticket-sep-doble"></div>`;

  html += `<div class="ticket-info">`;
  html += `<div class="ticket-info-row"><span>Mesa</span><span><strong>${mesaNombre}</strong></span></div>`;
  html += `<div class="ticket-info-row"><span>Persona</span><span><strong>${personaNum} de ${totalPersonas}</strong></span></div>`;
  html += `<div class="ticket-info-row"><span>Fecha</span><span>${fecha}</span></div>`;
  html += `<div class="ticket-info-row"><span>Hora</span><span>${hora}</span></div>`;
  if (metodo) {
    html += `<div class="ticket-info-row"><span>Pago</span><span><strong>${metodo === 'yape' ? 'Yape' : metodo === 'tarjeta' ? 'Tarjeta' : 'Efectivo'}</strong></span></div>`;
  }
  if (metodo === 'efectivo' && montoRecibido != null) {
    html += `<div class="ticket-info-row"><span>Recibido</span><span><strong>${formatPrecio(montoRecibido)}</strong></span></div>`;
    html += `<div class="ticket-info-row"><span>Vuelto</span><span><strong>${formatPrecio(montoRecibido - monto)}</strong></span></div>`;
  }
  html += `</div>`;

  html += `<div class="ticket-sep-simple"></div>`;
  html += `<div class="ticket-col-header"><span class="ticket-col-cant">CANT</span><span class="ticket-col-nombre">DESCRIPCIÓN</span><span class="ticket-col-precio">S/.</span></div>`;
  html += `<div class="ticket-sep-simple"></div>`;
  html += `<div class="ticket-items">`;
  for (const item of items) {
    html += `<div class="ticket-item"><span class="ticket-col-cant">${item.cantidad}x</span><span class="ticket-col-nombre">${item.nombre_plato}${item.opcion_label && !item.opcion_label.startsWith('_cust') ? ` <span class="ticket-item-opcion">(${item.opcion_label})</span>` : ''}</span><span class="ticket-col-precio">${formatPrecio(item.subtotal)}</span></div>`;
  }
  html += `</div>`;
  html += `<div class="ticket-sep-simple"></div>`;
  html += `<div class="ticket-total-row"><span>TOTAL MESA</span><span>${formatPrecio(totalGeneral)}</span></div>`;
  html += `<div class="ticket-sep-doble"></div>`;
  html += `<div class="ticket-total-final"><span>TU PARTE</span><span>${formatPrecio(monto)}</span></div>`;
  html += `<div class="ticket-sep-simple"></div>`;
  html += `<div class="ticket-footer"><p>¡Gracias por su visita!</p><p class="ticket-footer-sub">Vuelva pronto</p></div>`;

  return html;
}

export function CuentaCompartidaModal({ total, mesaNombre, items, onClose, onCobrar, isPending }: Props) {
  const [n, setN] = useState(2);
  const [personas, setPersonas] = useState<Persona[]>(() => makePersonas(2, total));

  const totalAsignado = personas.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const restante = Math.round((total - totalAsignado) * 100) / 100;
  const todasPagaron = personas.every((p) => p.pagado);
  const cuantasPagaron = personas.filter((p) => p.pagado).length;

  function cambiarN(nuevo: number) {
    if (nuevo < 2 || nuevo > 10) return;
    setN(nuevo);
    setPersonas(makePersonas(nuevo, total, personas));
  }

  function update(i: number, patch: Partial<Persona>) {
    setPersonas((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function pagar(i: number) {
    update(i, { pagado: true });
  }

  function imprimirPersona(i: number) {
    const p = personas[i];
    const monto = parseFloat(p.monto) || 0;
    const recibido = p.metodo === 'efectivo' && parseFloat(p.montoRecibido) >= monto
      ? parseFloat(p.montoRecibido)
      : undefined;
    const html = buildSplitTicketHtml(mesaNombre, i + 1, n, monto, p.metodo, recibido, items, total);
    printTicketWindow(html);
  }

  function puedePagar(p: Persona): boolean {
    if (!p.metodo) return false;
    if (p.metodo === 'yape' || p.metodo === 'tarjeta') return true;
    const recibido = parseFloat(p.montoRecibido) || 0;
    return recibido >= (parseFloat(p.monto) || 0);
  }

  function handleCobrar() {
    const metodos = personas.map((p) => p.metodo).filter(Boolean) as MetodoPago[];
    onCobrar(metodos[metodos.length - 1] ?? 'efectivo');
  }

  const restanteColor = restante < 0 ? 'var(--red)' : restante === 0 ? 'var(--green)' : 'var(--t1)';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--s1)', border: '1px solid var(--bd2)', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '94dvh', display: 'flex', flexDirection: 'column', animation: 'scale-in 0.15s cubic-bezier(0.32,0.72,0,1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '18px 18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 500, margin: '0 0 2px' }}>{mesaNombre}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', margin: 0, fontFamily: 'var(--font-sora), Sora, sans-serif', lineHeight: 1.15 }}>Dividir cuenta</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--s2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t2)', cursor: 'pointer', flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Totales + picker */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--t3)', margin: '0 0 1px' }}>Total</p>
              <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>{formatPrecio(total)}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--t3)', margin: '0 0 1px' }}>Pendiente</p>
              <p style={{ fontSize: 17, fontWeight: 700, color: restanteColor, margin: 0 }}>
                {restante === 0 ? '—' : formatPrecio(Math.abs(restante))}{restante < 0 ? ' +' : ''}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => cambiarN(n - 1)} disabled={n <= 2} style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--s2)', border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: n <= 2 ? 'var(--t3)' : 'var(--t1)', cursor: n <= 2 ? 'not-allowed' : 'pointer' }}>
              <Minus size={12} />
            </button>
            <div style={{ textAlign: 'center', minWidth: 36 }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', margin: 0, lineHeight: 1 }}>{n}</p>
              <p style={{ fontSize: 9, color: 'var(--t3)', margin: 0 }}>personas</p>
            </div>
            <button onClick={() => cambiarN(n + 1)} disabled={n >= 10} style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--s2)', border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: n >= 10 ? 'var(--t3)' : 'var(--t1)', cursor: n >= 10 ? 'not-allowed' : 'pointer' }}>
              <Plus size={12} />
            </button>
          </div>
        </div>

        {/* Lista */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '6px 10px' }}>
          {personas.map((persona, i) => {
            const monto = parseFloat(persona.monto) || 0;
            const recibido = parseFloat(persona.montoRecibido) || 0;
            const vuelto = recibido - monto;
            const vueltoValido = recibido >= monto;
            const esEfectivo = persona.metodo === 'efectivo';

            return (
              <div
                key={i}
                style={{ borderRadius: 12, marginBottom: 6, background: persona.pagado ? 'color-mix(in srgb, var(--green) 8%, var(--s1))' : 'var(--s2)', border: '1px solid var(--bd)', overflow: 'hidden', transition: 'background 0.2s' }}
              >
                  {/* Fila 1: avatar + label + método + pagar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px 8px' }}>
                  {/* Avatar */}
                  <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: persona.pagado ? 'var(--green)' : 'var(--bg)', border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: persona.pagado ? '#fff' : 'var(--t2)', fontSize: 13, fontWeight: 700, transition: 'all 0.2s' }}>
                    {persona.pagado ? <Check size={13} strokeWidth={2.5} /> : i + 1}
                  </div>

                  {/* Label */}
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', margin: 0, flex: 1 }}>Persona {i + 1}</p>

                  {/* Ticket */}
                  <button onClick={() => imprimirPersona(i)} title="Ticket" style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t2)', cursor: 'pointer', flexShrink: 0 }}>
                    <Printer size={14} />
                  </button>

                  {/* Método */}
                  {!persona.pagado && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {(['efectivo', 'yape', 'tarjeta'] as MetodoPago[]).map((m) => (
                        <button
                          key={m}
                          onClick={() => update(i, { metodo: m, montoRecibido: '' })}
                          style={{ height: 36, padding: '0 12px', borderRadius: 8, background: persona.metodo === m ? 'var(--t1)' : 'var(--bg)', border: `1px solid ${persona.metodo === m ? 'var(--t1)' : 'var(--bd)'}`, fontSize: 12, fontWeight: 600, color: persona.metodo === m ? 'var(--bg)' : 'var(--t2)', cursor: 'pointer', transition: 'all 0.12s', whiteSpace: 'nowrap' }}
                        >
                          {m === 'efectivo' ? 'Ef.' : m === 'yape' ? 'Yape' : 'Tarjeta'}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Pagar / Pagado */}
                  {persona.pagado ? (
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)', whiteSpace: 'nowrap', flexShrink: 0 }}>Pagado</span>
                  ) : (
                    <button
                      disabled={!puedePagar(persona)}
                      onClick={() => pagar(i)}
                      style={{ height: 36, padding: '0 14px', borderRadius: 8, background: puedePagar(persona) ? 'var(--t1)' : 'var(--s3)', border: 'none', fontSize: 13, fontWeight: 700, color: puedePagar(persona) ? 'var(--bg)' : 'var(--t3)', cursor: puedePagar(persona) ? 'pointer' : 'not-allowed', transition: 'all 0.12s', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      Pagar
                    </button>
                  )}
                </div>

                {/* Fila 2: input monto (ancho completo) */}
                <div style={{ padding: '0 14px 12px' }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Monto a pagar</p>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '0 12px', height: 48 }}>
                    <span style={{ fontSize: 14, color: 'var(--t3)', marginRight: 4, flexShrink: 0 }}>S/</span>
                    <input
                      inputMode="decimal"
                      type="number"
                      min={0}
                      step={0.01}
                      value={persona.monto}
                      disabled={persona.pagado}
                      onChange={(e) => update(i, { monto: e.target.value })}
                      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 22, fontWeight: 700, color: 'var(--t1)', width: '100%', fontFamily: 'var(--font-sora), Sora, sans-serif' }}
                    />
                  </div>
                </div>

                {/* Panel efectivo: monto recibido + vuelto */}
                {esEfectivo && !persona.pagado && (
                  <div style={{ borderTop: '1px solid var(--bd)', display: 'flex', alignItems: 'stretch' }}>
                    {/* Monto recibido */}
                    <div style={{ flex: 1, padding: '10px 14px', borderRight: '1px solid var(--bd)' }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Recibido</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 13, color: 'var(--t3)', flexShrink: 0 }}>S/</span>
                        <input
                          inputMode="decimal"
                          type="number"
                          min={0}
                          step={0.50}
                          placeholder={monto.toFixed(2)}
                          value={persona.montoRecibido}
                          onChange={(e) => update(i, { montoRecibido: e.target.value })}
                          style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', fontSize: 20, fontWeight: 700, color: 'var(--t1)', fontFamily: 'var(--font-sora), Sora, sans-serif', width: '100%' }}
                        />
                      </div>
                    </div>
                    {/* Vuelto */}
                    <div style={{ flex: 1, padding: '10px 14px' }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Vuelto</p>
                      <p style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'var(--font-sora), Sora, sans-serif', color: persona.montoRecibido === '' ? 'var(--t3)' : vueltoValido ? 'var(--green)' : 'var(--red)' }}>
                        {persona.montoRecibido === ''
                          ? '—'
                          : vueltoValido
                          ? formatPrecio(vuelto)
                          : `−${formatPrecio(Math.abs(vuelto))}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px 18px', borderTop: '1px solid var(--bd)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--t3)' }}>{cuantasPagaron} de {n} pagaron</span>
            <div style={{ width: 80, height: 4, background: 'var(--s3)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, background: todasPagaron ? 'var(--green)' : 'var(--t1)', width: `${(cuantasPagaron / n) * 100}%`, transition: 'width 0.3s' }} />
            </div>
          </div>
          <button
            disabled={!todasPagaron || isPending}
            onClick={handleCobrar}
            style={{ width: '100%', height: 44, borderRadius: 'var(--r)', background: todasPagaron && !isPending ? 'var(--t1)' : 'var(--s3)', color: todasPagaron && !isPending ? 'var(--bg)' : 'var(--t3)', border: 'none', fontSize: 14, fontWeight: 700, cursor: todasPagaron && !isPending ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}
          >
            {isPending ? 'Cobrando…' : todasPagaron ? 'Cobrar todo' : `Faltan ${n - cuantasPagaron} de pagar`}
          </button>
        </div>
      </div>
    </div>
  );
}
