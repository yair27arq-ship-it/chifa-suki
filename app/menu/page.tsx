import { getMenuAdmin } from '@/actions/platos';
import { MenuClient } from './MenuClient';

export default async function MenuPage() {
  const { categorias, platos } = await getMenuAdmin();
  return <MenuClient initialCategorias={categorias} initialPlatos={platos} />;
}
