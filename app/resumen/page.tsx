import { getPedidosDelDia } from '@/actions/pedidos';
import { getCierresRecientes, getJornadaActual, getJornadaPendiente } from '@/actions/cierres';
import { getFondoDia } from '@/actions/fondo';
import { getAjustesResumen } from '@/actions/ajustes';
import { getFechaDia } from '@/lib/utils';
import { ResumenClient } from './ResumenClient';
import type { Pedido, CierreDia } from '@/types';

// Server Component: pre-fetcha los datos de hoy en el servidor.
export default async function ResumenPage() {
  const hoy = getFechaDia();

  const [pedidos, cierres, fondo, jornadaActual] = await Promise.all([
    getPedidosDelDia(hoy),
    getCierresRecientes(60),
    getFondoDia(hoy),
    getJornadaActual(hoy),
  ]);

  const [ajustes, jornadaPendiente] = await Promise.all([
    getAjustesResumen(hoy, jornadaActual),
    getJornadaPendiente(),
  ]);

  return (
    <ResumenClient
      initialPedidos={pedidos as unknown as Pedido[]}
      initialCierres={cierres as CierreDia[]}
      initialFondo={fondo}
      initialFecha={hoy}
      initialJornada={jornadaActual}
      initialAjustes={ajustes}
      jornadaPendiente={jornadaPendiente}
    />
  );
}
