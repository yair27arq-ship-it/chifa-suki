'use server';

import { getSupabaseServer } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// ============================================================
// Server Action — Cierre de jornada (2 jornadas por día)
// ============================================================

/**
 * Devuelve la jornada actual para una fecha:
 * - Si jornada 1 ya está cerrada → retorna 2
 * - Si no → retorna 1
 */
export async function getJornadaActual(fecha: string): Promise<1 | 2> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('cierres_dia')
    .select('jornada')
    .eq('fecha', fecha)
    .eq('jornada', 1)
    .maybeSingle();
  return data ? 2 : 1;
}

/**
 * Cierra una jornada:
 * 1. Calcula totales de pedidos cobrados de esa jornada
 * 2. Guarda registro en cierres_dia con la jornada
 */
export async function cerrarJornada(fecha: string, jornada: 1 | 2): Promise<{
  error?: string;
  data?: {
    total_mesas: number;
    total_llevar: number;
    total_general: number;
    num_pedidos: number;
  };
}> {
  const supabase = await getSupabaseServer();

  const { data: pedidos, error: pedidosError } = await supabase
    .from('pedidos')
    .select('tipo, total')
    .eq('fecha_dia', fecha)
    .eq('jornada', jornada)
    .eq('estado', 'cobrado');

  if (pedidosError) return { error: pedidosError.message };

  const total_mesas = (pedidos || [])
    .filter((p) => p.tipo === 'mesa')
    .reduce((acc, p) => acc + Number(p.total), 0);

  const total_llevar = (pedidos || [])
    .filter((p) => p.tipo === 'llevar')
    .reduce((acc, p) => acc + Number(p.total), 0);

  const total_general = Number((total_mesas + total_llevar).toFixed(2));
  const num_pedidos = (pedidos || []).length;

  const { error: cierreError } = await supabase.from('cierres_dia').upsert(
    {
      fecha,
      jornada,
      total_mesas: Number(total_mesas.toFixed(2)),
      total_llevar: Number(total_llevar.toFixed(2)),
      total_general,
      num_pedidos,
    },
    { onConflict: 'fecha,jornada' }
  );

  if (cierreError) return { error: cierreError.message };

  revalidatePath('/resumen');

  return {
    data: {
      total_mesas: Number(total_mesas.toFixed(2)),
      total_llevar: Number(total_llevar.toFixed(2)),
      total_general,
      num_pedidos,
    },
  };
}

/**
 * Verifica el estado de cierres del día.
 * La caja se considera "cerrada" solo cuando la jornada 2 está registrada.
 */
export async function getCierreHoy(fecha: string): Promise<{
  cerrado: boolean;
  created_at?: string;
  jornadaActual: 1 | 2;
  jornada1Cerrada: boolean;
  jornada2Cerrada: boolean;
}> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('cierres_dia')
    .select('jornada, created_at')
    .eq('fecha', fecha);

  const j1 = data?.find((r) => r.jornada === 1) ?? null;
  const j2 = data?.find((r) => r.jornada === 2) ?? null;

  return {
    cerrado: !!j2,
    created_at: j2?.created_at ?? j1?.created_at,
    jornadaActual: j1 ? 2 : 1,
    jornada1Cerrada: !!j1,
    jornada2Cerrada: !!j2,
  };
}

/**
 * Elimina el cierre de la última jornada para permitir reabrir.
 */
export async function reabrirCaja(fecha: string): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();

  // Busca la jornada más alta cerrada y la elimina
  const { data } = await supabase
    .from('cierres_dia')
    .select('jornada')
    .eq('fecha', fecha)
    .order('jornada', { ascending: false })
    .limit(1);

  if (!data || data.length === 0) return {};

  const jornada = data[0].jornada;

  const { error } = await supabase
    .from('cierres_dia')
    .delete()
    .eq('fecha', fecha)
    .eq('jornada', jornada);

  if (error) return { error: error.message };
  revalidatePath('/resumen');
  return {};
}

/**
 * Revisa si hay una jornada 2 sin cerrar del día anterior (u otro día reciente).
 * Retorna la fecha y totales si existe, o null si todo está cerrado.
 */
export async function getJornadaPendiente(): Promise<{ fecha: string; num_pedidos: number } | null> {
  const supabase = await getSupabaseServer();

  // Buscar los últimos 7 días con J1 cerrada pero sin J2 cerrada y con pedidos en J2
  const { data: cierres } = await supabase
    .from('cierres_dia')
    .select('fecha, jornada')
    .order('fecha', { ascending: false })
    .limit(14);

  if (!cierres) return null;

  // Fechas que tienen J1 cerrada
  const conJ1 = new Set(cierres.filter((c) => c.jornada === 1).map((c) => c.fecha));
  // Fechas que tienen J2 cerrada
  const conJ2 = new Set(cierres.filter((c) => c.jornada === 2).map((c) => c.fecha));

  // Fechas con J1 cerrada pero sin J2
  const pendientes = [...conJ1].filter((f) => !conJ2.has(f)).sort().reverse();

  for (const fecha of pendientes) {
    const { count } = await supabase
      .from('pedidos')
      .select('*', { count: 'exact', head: true })
      .eq('fecha_dia', fecha)
      .eq('jornada', 2);

    if ((count ?? 0) > 0) return { fecha, num_pedidos: count ?? 0 };
  }

  return null;
}

/**
 * Obtiene los últimos N cierres de día (todas las jornadas).
 */
export async function getCierresRecientes(limite = 14) {
  const supabase = await getSupabaseServer();

  const { data } = await supabase
    .from('cierres_dia')
    .select('*')
    .order('fecha', { ascending: false })
    .order('jornada', { ascending: false })
    .limit(limite);

  return data || [];
}
