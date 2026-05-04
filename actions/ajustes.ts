'use server';

import { getSupabaseServer } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function getAjustesResumen(
  fecha: string,
  jornada: 1 | 2
): Promise<Record<string, number>> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('resumen_ajustes')
    .select('campo, valor')
    .eq('fecha', fecha)
    .eq('jornada', jornada);

  if (!data) return {};
  return Object.fromEntries(data.map((r) => [r.campo, Number(r.valor)]));
}

export async function setAjusteResumen(
  fecha: string,
  jornada: 1 | 2,
  campo: string,
  valor: number
): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from('resumen_ajustes')
    .upsert(
      { fecha, jornada, campo, valor: Number(valor.toFixed(2)) },
      { onConflict: 'fecha,jornada,campo' }
    );
  if (error) return { error: error.message };
  revalidatePath('/resumen');
  return {};
}

export async function deleteAjusteResumen(
  fecha: string,
  jornada: 1 | 2,
  campo: string
): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from('resumen_ajustes')
    .delete()
    .eq('fecha', fecha)
    .eq('jornada', jornada)
    .eq('campo', campo);
  if (error) return { error: error.message };
  revalidatePath('/resumen');
  return {};
}
