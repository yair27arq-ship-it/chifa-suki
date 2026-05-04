'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DrawerToggle } from '@/components/DrawerToggle';
import { formatPrecio } from '@/lib/utils';
import { MesaCard } from '@/components/MesaCard';
import { getSupabaseBrowser } from '@/lib/supabase';
import { getPedidosAbiertoPorMesa } from '@/actions/pedidos';
import { getFondoDia } from '@/actions/fondo';
import { getFechaDia } from '@/lib/utils';
import type { Mesa } from '@/types';

type PedidoMesa = { mesa_id: number | null; total: number; id: string };

interface Props {
  initialMesas: Mesa[];
  initialPedidos: PedidoMesa[];
  initialFondo: number | null;
}

export function MesasClient({ initialMesas, initialPedidos, initialFondo }: Props) {
  const router = useRouter();
  // mesas vienen del caché del servidor y no cambian durante el servicio
  const [mesas] = useState<Mesa[]>(initialMesas);
  const [pedidos, setPedidos] = useState<PedidoMesa[]>(initialPedidos);
  const [fondo, setFondo] = useState<number | null>(initialFondo);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Actualiza solo pedidos+fondo cuando hay cambios (mesas no cambian)
  const scheduleReload = () => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => {
      reloadTimerRef.current = null;
      Promise.all([getPedidosAbiertoPorMesa(), getFondoDia(getFechaDia())]).then(
        ([pedidosData, fondoData]) => {
          setPedidos(pedidosData as PedidoMesa[]);
          setFondo(fondoData);
        }
      );
    }, 400);
  };

  useEffect(() => {
    // Prefetch de todas las páginas de mesa en segundo plano para navegación instantánea
    mesas.forEach((m) => router.prefetch(`/mesa/${m.id}`));

    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel('mesas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, scheduleReload)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPedidoDeMesa = (mesaId: number) =>
    pedidos.find((p) => p.mesa_id === mesaId) || null;

  const mesasOcupadas = pedidos.length;
  const mesasLibres   = mesas.length - mesasOcupadas;
  const totalEnCurso  = pedidos.reduce((a, p) => a + Number(p.total), 0);

  return (
    <div>
      <div className="page-header" />

      <div className="content-top-row">
        <DrawerToggle />
      </div>

      <div className="mesas-stats">
        <div className="mesas-stat">
          <span className="mesas-stat-num" style={{ color: 'var(--green)' }}>{mesasLibres}</span>
          <span className="mesas-stat-lbl">Libres</span>
        </div>
        <div className="mesas-stat-sep" />
        <div className="mesas-stat">
          <span className="mesas-stat-num" style={{ color: 'var(--amber)' }}>{mesasOcupadas}</span>
          <span className="mesas-stat-lbl">Ocupadas</span>
        </div>
        <div className="mesas-stat-sep" />
        <div className="mesas-stat">
          <span className="mesas-stat-num">{formatPrecio(totalEnCurso)}</span>
          <span className="mesas-stat-lbl">En curso</span>
        </div>
        <div className="mesas-stat-sep" />
        <div className="mesas-stat">
          <span className="mesas-stat-num" style={{ color: 'var(--t2)' }}>
            {fondo != null ? formatPrecio(fondo) : '—'}
          </span>
          <span className="mesas-stat-lbl">Fondo</span>
        </div>
      </div>

      <div className="mesas-grid">
        {mesas.map((mesa) => {
          const pedido = getPedidoDeMesa(mesa.id);
          return (
            <MesaCard
              key={mesa.id}
              mesa={mesa}
              pedidoTotal={pedido?.total ?? null}
              pedidoId={pedido?.id ?? null}
              onClick={() => router.push(`/mesa/${mesa.id}`)}
            />
          );
        })}
      </div>

      {mesas.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🍽</div>
          <p className="empty-state-text">No hay mesas configuradas</p>
          <p className="empty-state-text" style={{ fontSize: 12 }}>
            Agrega mesas en la base de datos
          </p>
        </div>
      )}
    </div>
  );
}
