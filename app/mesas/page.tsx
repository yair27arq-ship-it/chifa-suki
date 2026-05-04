import { getMesas } from '@/actions/platos';
import { getPedidosAbiertoPorMesa } from '@/actions/pedidos';
import { getFondoDia } from '@/actions/fondo';
import { getFechaDia } from '@/lib/utils';
import { MesasClient } from './MesasClient';

// Server Component: fetches data on the server before sending HTML.
// El cliente recibe la página ya renderizada — sin loading spinner.
export default async function MesasPage() {
  const [mesas, pedidos, fondo] = await Promise.all([
    getMesas(),
    getPedidosAbiertoPorMesa(),
    getFondoDia(getFechaDia()),
  ]);

  return (
    <MesasClient
      initialMesas={mesas}
      initialPedidos={pedidos as { mesa_id: number | null; total: number; id: string }[]}
      initialFondo={fondo}
    />
  );
}
