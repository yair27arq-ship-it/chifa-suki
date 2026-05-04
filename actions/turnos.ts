'use server';

import { getSupabaseServer } from '@/lib/supabase-server';
import { getFechaDia } from '@/lib/utils';

import type { Turno } from '@/lib/turno-utils';


export async function getTurnoHoy(): Promise<Turno | null> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('turnos')
    .select('*')
    .eq('user_id', user.id)
    .eq('fecha', getFechaDia())
    .maybeSingle();

  return data ?? null;
}



export async function registrarEntrada(): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { error } = await supabase.from('turnos').insert({
    user_id: user.id,
    fecha: getFechaDia(),
    entrada: new Date().toISOString(),
  });

  return error ? { error: error.message } : {};
}

export async function registrarInicioDescanso(): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const turno = await getTurnoHoy();
  if (!turno) return { error: 'No hay turno activo' };

  const { error } = await supabase
    .from('turnos')
    .update({ inicio_descanso: new Date().toISOString() })
    .eq('id', turno.id);

  return error ? { error: error.message } : {};
}

export async function registrarFinDescanso(): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const turno = await getTurnoHoy();
  if (!turno) return { error: 'No hay turno activo' };

  const { error } = await supabase
    .from('turnos')
    .update({ fin_descanso: new Date().toISOString() })
    .eq('id', turno.id);

  return error ? { error: error.message } : {};
}

export async function registrarSalida(): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const turno = await getTurnoHoy();
  if (!turno) return { error: 'No hay turno activo' };

  const { error } = await supabase
    .from('turnos')
    .update({ salida: new Date().toISOString() })
    .eq('id', turno.id);

  return error ? { error: error.message } : {};
}

/** Admin: todos los turnos con filtro de fecha */
export async function getTurnosTodos(fecha?: string): Promise<Turno[]> {
  const supabase = await getSupabaseServer();
  const fechaFiltro = fecha ?? getFechaDia();

  const { data } = await supabase
    .from('turnos')
    .select('*, perfil:perfiles(nombre, rol)')
    .eq('fecha', fechaFiltro)
    .order('entrada', { ascending: true });

  return (data ?? []) as Turno[];
}
