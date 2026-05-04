'use server';

import { getSupabaseServer } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function getFondoDia(fecha: string): Promise<number | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('fondo_dia')
    .select('monto')
    .eq('fecha', fecha)
    .maybeSingle();
  return data ? Number(data.monto) : null;
}

export async function setFondoDia(
  fecha: string,
  monto: number
): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from('fondo_dia')
    .upsert({ fecha, monto: Number(monto.toFixed(2)) }, { onConflict: 'fecha' });

  if (error) return { error: error.message };

  revalidatePath('/resumen');
  revalidatePath('/mesas');
  return {};
}
