'use client';

import { useState, useRef, useEffect } from 'react';
import { Printer, X, Share2 } from 'lucide-react';
import { formatPrecio } from '@/lib/utils';
import { shareTicketWhatsApp } from '@/lib/shareWhatsApp';
import type { MetodoPago, ItemCarrito, PagoParte } from '@/types';

type MetodoSimple = 'efectivo' | 'yape' | 'tarjeta';

interface CobrarModalProps {
  total: number;
  mesaNombre: string;
  items: ItemCarrito[];
  onClose: () => void;
  onImprimir: (metodo: MetodoPago | null, montoRecibido?: number, pagoPartes?: PagoParte[]) => void;
  onCobrar: (metodoPago: MetodoPago, montoRecibido?: number, pagoPartes?: PagoParte[]) => void;
  isPending: boolean;
}

const METODOS: MetodoSimple[] = ['efectivo', 'yape', 'tarjeta'];
const LABEL: Record<MetodoSimple, string> = { efectivo: 'Efectivo', yape: 'Yape', tarjeta: 'Tarjeta' };

export function CobrarModal({
  total,
  mesaNombre,
  items,
  onClose,
  onImprimir,
  onCobrar,
  isPending,
}: CobrarModalProps) {
  const [metodo, setMetodo] = useState<MetodoPago | null>(null);
  const [montoStr, setMontoStr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Estado mixto
  const [mixtoM1, setMixtoM1] = useState<MetodoSimple | null>(null);
  const [mixtoMonto1, setMixtoMonto1] = useState('');
  const [mixtoRecibido1, setMixtoRecibido1] = useState('');
  const [mixtoM2, setMixtoM2] = useState<MetodoSimple | null>(null);
  const [mixtoRecibido2, setMixtoRecibido2] = useState('');

  const montoRecibido = parseFloat(montoStr) || 0;
  const vuelto = montoRecibido - total;
  const vueltoValido = montoRecibido >= total;

  const mixtoMonto1Val = parseFloat(mixtoMonto1) || 0;
  const mixtoMonto2Val = Math.round((total - mixtoMonto1Val) * 100) / 100;

  const mixtoRecibido1Val = mixtoRecibido1 === '' ? mixtoMonto1Val : (parseFloat(mixtoRecibido1) || 0);
  const mixtoRecibido2Val = mixtoRecibido2 === '' ? mixtoMonto2Val : (parseFloat(mixtoRecibido2) || 0);

  useEffect(() => {
    if (metodo === 'efectivo') {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setMontoStr('');
    }
    if (metodo !== 'mixto') {
      setMixtoM1(null); setMixtoMonto1(''); setMixtoRecibido1('');
      setMixtoM2(null); setMixtoRecibido2('');
    }
  }, [metodo]);

  function puedeCobrarMixto(): boolean {
    if (!mixtoM1 || !mixtoM2) return false;
    if (mixtoMonto1Val <= 0 || mixtoMonto2Val <= 0) return false;
    if (mixtoM1 === 'efectivo' && mixtoRecibido1Val < mixtoMonto1Val) return false;
    if (mixtoM2 === 'efectivo' && mixtoRecibido2Val < mixtoMonto2Val) return false;
    return true;
  }

  const puedeCobrar =
    metodo === 'mixto'
      ? puedeCobrarMixto()
      : metodo === 'yape' || metodo === 'tarjeta'
      ? true
      : metodo === 'efectivo'
      ? vueltoValido
      : false;

  function buildPartes(): PagoParte[] {
    return [
      {
        metodo: mixtoM1!,
        monto: mixtoMonto1Val,
        ...(mixtoM1 === 'efectivo' ? { montoRecibido: mixtoRecibido1Val } : {}),
      },
      {
        metodo: mixtoM2!,
        monto: mixtoMonto2Val,
        ...(mixtoM2 === 'efectivo' ? { montoRecibido: mixtoRecibido2Val } : {}),
      },
    ];
  }

  function handleCobrar() {
    if (!metodo || !puedeCobrar) return;
    if (metodo === 'mixto') {
      onCobrar('mixto', undefined, buildPartes());
    } else {
      onCobrar(metodo, metodo === 'efectivo' ? montoRecibido : undefined);
    }
  }

  function handleImprimir() {
    if (metodo === 'mixto') {
      onImprimir('mixto', undefined, buildPartes());
    } else {
      onImprimir(metodo, metodo === 'efectivo' && montoRecibido > 0 ? montoRecibido : undefined);
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--s1)', border: '1px solid var(--bd2)', borderRadius: '16px', width: '100%', maxWidth: '320px', padding: '20px', animation: 'scale-in 0.15s cubic-bezier(0.32,0.72,0,1)', maxHeight: '90dvh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 500, margin: '0 0 2px' }}>{mesaNombre}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--t1)', margin: 0, fontFamily: 'var(--font-sora), Sora, sans-serif', lineHeight: 1.1 }}>
              {formatPrecio(total)}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--s2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t2)', cursor: 'pointer', flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Selector de método */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Método de pago
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            {METODOS.map((m) => (
              <button
                key={m}
                onClick={() => setMetodo(m)}
                style={{ height: 44, borderRadius: 'var(--r)', background: metodo === m ? 'var(--t1)' : 'var(--s2)', border: metodo === m ? '1.5px solid var(--t1)' : '1.5px solid var(--bd)', fontSize: 14, fontWeight: 600, color: metodo === m ? 'var(--bg)' : 'var(--t2)', cursor: 'pointer', transition: 'all 0.12s' }}
              >
                {LABEL[m]}
              </button>
            ))}
          </div>
          {/* Botón mixto */}
          <button
            onClick={() => setMetodo('mixto')}
            style={{ width: '100%', height: 40, borderRadius: 'var(--r)', background: metodo === 'mixto' ? 'var(--t1)' : 'var(--s2)', border: metodo === 'mixto' ? '1.5px solid var(--t1)' : '1.5px dashed var(--bd2)', fontSize: 13, fontWeight: 600, color: metodo === 'mixto' ? 'var(--bg)' : 'var(--t3)', cursor: 'pointer', transition: 'all 0.12s' }}
          >
            Pago mixto (2 métodos)
          </button>
        </div>

        {/* Panel efectivo simple */}
        {metodo === 'efectivo' && (
          <EfectivoPanel
            monto={total}
            montoStr={montoStr}
            setMontoStr={setMontoStr}
            inputRef={inputRef}
            vuelto={vuelto}
            vueltoValido={vueltoValido}
          />
        )}

        {/* Panel mixto */}
        {metodo === 'mixto' && (
          <div style={{ marginBottom: 16 }}>
            <PartePanel
              label="Parte 1"
              metodo={mixtoM1}
              setMetodo={setMixtoM1}
              montoVal={mixtoMonto1Val}
              montoStr={mixtoMonto1}
              setMontoStr={setMixtoMonto1}
              montoEditable
              recibidoStr={mixtoRecibido1}
              setRecibidoStr={setMixtoRecibido1}
            />
            <PartePanel
              label={`Parte 2 — restante`}
              metodo={mixtoM2}
              setMetodo={setMixtoM2}
              montoVal={mixtoMonto2Val}
              montoStr={mixtoMonto2Val > 0 ? mixtoMonto2Val.toFixed(2) : '0.00'}
              setMontoStr={() => {}}
              montoEditable={false}
              recibidoStr={mixtoRecibido2}
              setRecibidoStr={setMixtoRecibido2}
            />
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleImprimir}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 44, padding: '0 16px', borderRadius: 'var(--r)', background: 'var(--s2)', border: '1px solid var(--bd)', fontSize: 13, fontWeight: 600, color: 'var(--t1)', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            <Printer size={16} />
            <span>Ticket</span>
          </button>

          <button
            onClick={() => shareTicketWhatsApp({ mesaNombre, items, total })}
            title="Compartir por WhatsApp"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 'var(--r)', background: '#25D366', border: 'none', color: '#fff', cursor: 'pointer', flexShrink: 0 }}
          >
            <Share2 size={16} />
          </button>

          <button
            disabled={!puedeCobrar || isPending}
            onClick={handleCobrar}
            style={{ flex: 1, height: 44, borderRadius: 'var(--r)', background: !puedeCobrar || isPending ? 'var(--s3)' : 'var(--t1)', color: !puedeCobrar || isPending ? 'var(--t2)' : 'var(--bg)', border: 'none', fontSize: 14, fontWeight: 700, cursor: !puedeCobrar || isPending ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
          >
            {isPending ? 'Cobrando…' : 'Cobrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Panel efectivo (monto recibido + vuelto) ───────────────────────────────

function EfectivoPanel({
  monto,
  montoStr,
  setMontoStr,
  inputRef,
  vuelto,
  vueltoValido,
}: {
  monto: number;
  montoStr: string;
  setMontoStr: (v: string) => void;
  inputRef?: { current: HTMLInputElement | null };
  vuelto: number;
  vueltoValido: boolean;
}) {
  return (
    <div style={{ marginBottom: '16px', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--bd)' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
          Monto recibido
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--t3)' }}>S/</span>
          <input
            ref={inputRef}
            type="number"
            min={0}
            step={0.50}
            placeholder={monto.toFixed(2)}
            value={montoStr}
            onChange={(e) => setMontoStr(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 22, fontWeight: 700, color: 'var(--t1)', fontFamily: 'var(--font-sora), Sora, sans-serif', width: '100%' }}
          />
        </div>
      </div>
      <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', margin: 0 }}>Vuelto</p>
        <p style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'var(--font-sora), Sora, sans-serif', color: montoStr === '' ? 'var(--t3)' : vueltoValido ? 'var(--green)' : 'var(--red)' }}>
          {montoStr === '' ? '—' : vueltoValido ? formatPrecio(vuelto) : `Faltan ${formatPrecio(Math.abs(vuelto))}`}
        </p>
      </div>
    </div>
  );
}

// ─── Panel de parte mixta ────────────────────────────────────────────────────

function PartePanel({
  label,
  metodo,
  setMetodo,
  montoVal,
  montoStr,
  setMontoStr,
  montoEditable,
  recibidoStr,
  setRecibidoStr,
}: {
  label: string;
  metodo: MetodoSimple | null;
  setMetodo: (m: MetodoSimple) => void;
  montoVal: number;
  montoStr: string;
  setMontoStr: (v: string) => void;
  montoEditable: boolean;
  recibidoStr: string;
  setRecibidoStr: (v: string) => void;
}) {
  const recibidoVal = recibidoStr === '' ? montoVal : (parseFloat(recibidoStr) || 0);
  const vuelto = recibidoVal - montoVal;
  const vueltoValido = recibidoVal >= montoVal;

  return (
    <div style={{ marginBottom: 10, background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
      {/* Label + métodos */}
      <div style={{ padding: '10px 14px 8px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
          {label}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {METODOS.map((m) => (
            <button
              key={m}
              onClick={() => setMetodo(m)}
              style={{ height: 36, borderRadius: 8, background: metodo === m ? 'var(--t1)' : 'var(--bg)', border: metodo === m ? '1.5px solid var(--t1)' : '1.5px solid var(--bd)', fontSize: 12, fontWeight: 600, color: metodo === m ? 'var(--bg)' : 'var(--t2)', cursor: 'pointer', transition: 'all 0.12s' }}
            >
              {m === 'efectivo' ? 'Ef.' : LABEL[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Monto */}
      <div style={{ padding: '6px 14px 10px', borderTop: '1px solid var(--bd)' }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>
          Monto
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, color: 'var(--t3)' }}>S/</span>
          {montoEditable ? (
            <input
              type="number"
              min={0}
              step={0.50}
              value={montoStr}
              onChange={(e) => setMontoStr(e.target.value)}
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 20, fontWeight: 700, color: 'var(--t1)', fontFamily: 'var(--font-sora), Sora, sans-serif', width: '100%' }}
            />
          ) : (
            <span style={{ fontSize: 20, fontWeight: 700, color: montoVal > 0 ? 'var(--t1)' : 'var(--red)', fontFamily: 'var(--font-sora), Sora, sans-serif' }}>
              {montoVal > 0 ? montoStr : 'Ingresa monto de parte 1'}
            </span>
          )}
        </div>
      </div>

      {/* Panel efectivo */}
      {metodo === 'efectivo' && montoVal > 0 && (
        <div style={{ borderTop: '1px solid var(--bd)', display: 'flex', alignItems: 'stretch' }}>
          <div style={{ flex: 1, padding: '8px 14px', borderRight: '1px solid var(--bd)' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>Recibido</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>S/</span>
              <input
                type="number"
                min={0}
                step={0.50}
                placeholder={montoVal.toFixed(2)}
                value={recibidoStr}
                onChange={(e) => setRecibidoStr(e.target.value)}
                style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', fontSize: 18, fontWeight: 700, color: 'var(--t1)', fontFamily: 'var(--font-sora), Sora, sans-serif', width: '100%' }}
              />
            </div>
          </div>
          <div style={{ flex: 1, padding: '8px 14px' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>Vuelto</p>
            <p style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: 'var(--font-sora), Sora, sans-serif', color: recibidoStr === '' ? 'var(--t3)' : vueltoValido ? 'var(--green)' : 'var(--red)' }}>
              {recibidoStr === '' ? '—' : vueltoValido ? formatPrecio(vuelto) : `−${formatPrecio(Math.abs(vuelto))}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
