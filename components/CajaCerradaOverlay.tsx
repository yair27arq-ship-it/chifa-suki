'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCaja } from '@/components/CajaContext';
import { Lock, LockOpen } from 'lucide-react';

export function CajaCerradaOverlay() {
  const { cajaCerrada, horarCierre, checking, reabrir } = useCaja();
  const pathname = usePathname();
  const router = useRouter();
  const [reabriendo, setReabriendo] = useState(false);

  // No bloquear resumen, dashboard ni login
  const esExento = pathname === '/resumen' || pathname === '/dashboard' || pathname === '/login';

  if (checking || !cajaCerrada || esExento) return null;

  const hora = horarCierre
    ? new Date(horarCierre).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
    : null;

  const handleReabrir = async () => {
    setReabriendo(true);
    await reabrir();
    setReabriendo(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 900,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 32,
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'var(--s2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--t3)',
      }}>
        <Lock size={24} strokeWidth={1.5} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-sora), Sora, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--t1)', marginBottom: 6 }}>
          Caja cerrada
        </p>
        <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5 }}>
          {hora ? `Se cerró la caja a las ${hora}.` : 'La caja fue cerrada hoy.'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button
          onClick={handleReabrir}
          disabled={reabriendo}
          style={{
            height: 40, padding: '0 20px',
            borderRadius: 'var(--r)',
            background: 'var(--accent)',
            border: 'none',
            fontSize: 13, fontWeight: 600,
            color: '#fff', cursor: reabriendo ? 'not-allowed' : 'pointer',
            opacity: reabriendo ? 0.7 : 1,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <LockOpen size={15} strokeWidth={2} />
          {reabriendo ? 'Reabriendo...' : 'Reabrir caja'}
        </button>

        <button
          onClick={() => router.push('/resumen')}
          style={{
            height: 40, padding: '0 20px',
            borderRadius: 'var(--r)',
            background: 'var(--s2)',
            border: '1px solid var(--bd)',
            fontSize: 13, fontWeight: 600,
            color: 'var(--t1)', cursor: 'pointer',
          }}
        >
          Ver resumen
        </button>
      </div>
    </div>
  );
}
