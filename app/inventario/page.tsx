import { getInsumos, getRecetas } from '@/actions/inventario';
import { InventarioClient } from './InventarioClient';

export default async function InventarioPage() {
  const [insumos, recetas] = await Promise.all([getInsumos(), getRecetas()]);
  return <InventarioClient initialInsumos={insumos} initialRecetas={recetas} />;
}
