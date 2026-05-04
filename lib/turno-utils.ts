/**
 * Tipos y utilidades de turnos que pueden usarse tanto en el cliente como el servidor.
 * Todo lo que no sea async y no necesite 'use server' va aquí.
 */

export type EstadoTurno = 'sin_turno' | 'trabajando' | 'descansando' | 'finalizado';

export type Turno = {
  id: number;
  user_id: string;
  fecha: string;
  entrada: string | null;
  inicio_descanso: string | null;
  fin_descanso: string | null;
  salida: string | null;
  perfil?: { nombre: string; rol: string };
};

/** Calcula el estado actual del turno para la UI */
export function getEstadoTurno(turno: Turno | null): EstadoTurno {
  if (!turno || !turno.entrada) return 'sin_turno';
  if (turno.salida) return 'finalizado';
  if (turno.inicio_descanso && !turno.fin_descanso) return 'descansando';
  return 'trabajando';
}
