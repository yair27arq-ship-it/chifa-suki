import { redirect } from 'next/navigation';
import { getMenu } from '@/actions/platos';
import { getPedidoPorId } from '@/actions/pedidos';
import { LlevarPedidoClient } from './LlevarPedidoClient';

export default async function LlevarPedidoPage({ params }: { params: Promise<{ ordenId: string }> }) {
  const { ordenId } = await params;

  const [{ categorias, platos }, pedido] = await Promise.all([
    getMenu(),
    getPedidoPorId(ordenId),
  ]);

  if (!pedido) redirect('/llevar');

  return (
    <LlevarPedidoClient
      ordenId={ordenId}
      initialCategorias={categorias}
      initialPlatos={platos}
      initialPedido={pedido}
    />
  );
}
