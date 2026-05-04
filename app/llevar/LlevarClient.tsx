'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPedidosLlevarAbiertos } from '@/actions/pedidos';
import { crearPedido } from '@/actions/pedidos';
import { getSupabaseBrowser } from '@/lib/supabase';
import { formatHora } from '@/lib/utils';
import type { Pedido } from '@/types';
import { Plus, ShoppingBag } from 'lucide-react';
import { BowlLoaderBtn } from '@/components/Loader';
import { DrawerToggle } from '@/components/DrawerToggle';

interface Props {
  initialOrdenes: Pedido[];
}

export function LlevarClient({ initialOrdenes }: Props) {
  const router = useRouter();
  const [ordenes, setOrdenes] = useState<Pedido[]>(initialOrdenes);
  const [creando, setCreando] = useState(false);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleReload = () => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => {
      reloadTimerRef.current = null;
      getPedidosLlevarAbiertos().then((data) => setOrdenes(data as Pedido[]));
    }, 400);
  };

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel('llevar-page-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, scheduleReload)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const crearNuevaOrden = async () => {
    setCreando(true);
    const { id, error } = await crearPedido('llevar', null, null, []);
    if (id && !error) {
      router.push(`/llevar/${id}`);
    }
    setCreando(false);
  };

  return (
    <div>
      <div className="page-header" />

      <div className="content-top-row">
        <DrawerToggle />
        <h1 className="page-title">Para llevar</h1>
        <button onClick={crearNuevaOrden} disabled={creando} className="btn-nueva-orden">
          {creando ? <BowlLoaderBtn /> : <><Plus size={15} strokeWidth={2.5} />Nueva orden</>}
        </button>
      </div>

      {ordenes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🛍️</div>
          <p className="empty-state-text">No hay órdenes activas</p>
          <p className="empty-state-sub">Toca &quot;Nueva orden&quot; para crear una</p>
        </div>
      ) : (
        <div className="llevar-grid">
          {ordenes.map((orden) => {
            const itemCount = orden.pedido_items?.length ?? 0;
            return (
              <Link key={orden.id} href={`/llevar/${orden.id}`} className="orden-card">
                <ShoppingBag size={72} className="orden-card-bg-icon" />

                <div className="orden-badge">
                  <span className="status-dot" />
                  Activa
                </div>

                <div className="orden-num">#{orden.numero_orden}</div>

                <div className="orden-card-foot">
                  <div className="orden-foot-left">
                    <span className="orden-hora">{formatHora(orden.created_at)}</span>
                    {itemCount > 0 && (
                      <span className="orden-items-count">{itemCount} {itemCount === 1 ? 'plato' : 'platos'}</span>
                    )}
                  </div>
                  {Number(orden.total) > 0 && (
                    <span className="orden-total">S/ {Number(orden.total).toFixed(2)}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
