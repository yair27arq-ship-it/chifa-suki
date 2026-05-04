import { getPedidosLlevarAbiertos } from '@/actions/pedidos';
import { LlevarClient } from './LlevarClient';
import type { Pedido } from '@/types';

// Server Component: fetches data on the server before sending HTML.
export default async function LlevarPage() {
  const ordenes = await getPedidosLlevarAbiertos();

  return <LlevarClient initialOrdenes={ordenes as Pedido[]} />;
}
