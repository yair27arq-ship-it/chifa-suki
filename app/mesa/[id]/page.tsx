import { getMenu, getMesaPorId } from '@/actions/platos';
import { getPedidoAbiertoDeMesa } from '@/actions/pedidos';
import { MesaPedidoClient } from './MesaPedidoClient';

export default async function MesaPedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mesaId = parseInt(id);

  const [{ categorias, platos }, mesa, pedido] = await Promise.all([
    getMenu(),
    getMesaPorId(mesaId),
    getPedidoAbiertoDeMesa(mesaId),
  ]);

  return (
    <MesaPedidoClient
      mesaId={mesaId}
      initialCategorias={categorias}
      initialPlatos={platos}
      initialMesa={mesa}
      initialPedido={pedido}
    />
  );
}
