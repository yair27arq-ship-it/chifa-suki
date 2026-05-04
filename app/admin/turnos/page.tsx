import { getTurnosTodos } from '@/actions/turnos';
import { getUsuarios } from '@/actions/personal';
import { getFechaDia } from '@/lib/utils';
import { AdminTurnosClient } from './AdminTurnosClient';

export default async function AdminTurnosPage() {
  const hoy = getFechaDia();
  const [turnos, usuarios] = await Promise.all([
    getTurnosTodos(hoy),
    getUsuarios().catch(() => []), // getUsuarios lanza si no es admin; capturamos sin romper
  ]);

  return (
    <AdminTurnosClient
      initialTurnos={turnos}
      initialHoy={hoy}
      initialUsuarios={usuarios}
    />
  );
}
