'use client';

import { useState, useEffect } from 'react';
import { Bluetooth, Globe, X, RefreshCw, BluetoothOff } from 'lucide-react';
import {
  bluetoothDisponible,
  conectarImpresora,
  desconectarImpresora,
  getNombreImpresora,
  getModoImpresion,
  setModoNavegador,
} from '@/lib/bluetoothPrinter';

interface PrinterModalProps {
  onClose: () => void;
}

export function PrinterModal({ onClose }: PrinterModalProps) {
  const [modo, setModo]             = useState<'bluetooth' | 'browser'>('browser');
  const [nombreImp, setNombreImp]   = useState<string | null>(null);
  const [conectando, setConectando] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    setModo(getModoImpresion());
    setNombreImp(getNombreImpresora());
  }, []);

  const handleConectar = async () => {
    setError(null);
    setConectando(true);
    try {
      const nombre = await conectarImpresora();
      setNombreImp(nombre);
      setModo('bluetooth');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo conectar');
    } finally {
      setConectando(false);
    }
  };

  const handleDesconectar = () => {
    desconectarImpresora();
    setNombreImp(null);
    setModo('browser');
  };

  const handleNavegador = () => {
    setModoNavegador();
    setModo('browser');
  };

  const btDisponible = bluetoothDisponible();

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--s1)', border: '1px solid var(--bd2)', borderRadius: 16, width: '100%', maxWidth: 320, padding: 20, animation: 'scale-in 0.15s cubic-bezier(0.32,0.72,0,1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>Impresora</p>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--s2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t2)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Modo activo */}
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Método activo
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          <button
            onClick={handleNavegador}
            style={{ height: 48, borderRadius: 'var(--r)', background: modo === 'browser' ? 'var(--t1)' : 'var(--s2)', border: `1.5px solid ${modo === 'browser' ? 'var(--t1)' : 'var(--bd)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', color: modo === 'browser' ? 'var(--bg)' : 'var(--t2)', transition: 'all 0.12s' }}
          >
            <Globe size={16} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Navegador</span>
          </button>
          <button
            onClick={btDisponible ? handleConectar : undefined}
            disabled={!btDisponible || conectando}
            style={{ height: 48, borderRadius: 'var(--r)', background: modo === 'bluetooth' ? 'var(--t1)' : 'var(--s2)', border: `1.5px solid ${modo === 'bluetooth' ? 'var(--t1)' : 'var(--bd)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: btDisponible && !conectando ? 'pointer' : 'not-allowed', color: modo === 'bluetooth' ? 'var(--bg)' : btDisponible ? 'var(--t2)' : 'var(--t3)', opacity: btDisponible ? 1 : 0.5, transition: 'all 0.12s' }}
          >
            <Bluetooth size={16} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Bluetooth</span>
          </button>
        </div>

        {/* Estado Bluetooth */}
        {modo === 'bluetooth' && nombreImp && (
          <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', margin: '0 0 2px' }}>Conectada</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>{nombreImp}</p>
            </div>
            <button
              onClick={handleDesconectar}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, background: 'none', border: '1px solid var(--bd)', fontSize: 12, fontWeight: 600, color: 'var(--t2)', cursor: 'pointer' }}
            >
              <BluetoothOff size={13} />
              Quitar
            </button>
          </div>
        )}

        {/* Botón reconectar si está en BT pero sin nombre en memoria */}
        {modo === 'bluetooth' && !nombreImp && btDisponible && (
          <button
            onClick={handleConectar}
            disabled={conectando}
            style={{ width: '100%', height: 44, borderRadius: 'var(--r)', background: 'var(--s2)', border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--t1)', cursor: conectando ? 'not-allowed' : 'pointer', marginBottom: 12 }}
          >
            <RefreshCw size={15} style={{ animation: conectando ? 'spin 1s linear infinite' : 'none' }} />
            {conectando ? 'Buscando…' : 'Conectar impresora'}
          </button>
        )}

        {/* Botón conectar si está en modo navegador y quieren BT */}
        {modo === 'browser' && btDisponible && (
          <button
            onClick={handleConectar}
            disabled={conectando}
            style={{ width: '100%', height: 44, borderRadius: 'var(--r)', background: 'var(--s2)', border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--t1)', cursor: conectando ? 'not-allowed' : 'pointer', marginBottom: 12 }}
          >
            <Bluetooth size={15} />
            {conectando ? 'Buscando…' : 'Conectar impresora Bluetooth'}
          </button>
        )}

        {!btDisponible && (
          <p style={{ fontSize: 12, color: 'var(--t2)', textAlign: 'center', marginBottom: 12 }}>
            Web Bluetooth no disponible.<br />Usa Chrome en Android o Chrome Desktop.
          </p>
        )}

        {error && (
          <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{error}</p>
        )}
      </div>
    </div>
  );
}
