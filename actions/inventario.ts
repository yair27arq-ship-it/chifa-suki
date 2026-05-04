'use server';

import { getSupabaseServer } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import type { Insumo, Receta } from '@/types';

// ── INSUMOS ──────────────────────────────────────────────────

export async function getInsumos(): Promise<Insumo[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('insumos')
    .select('*')
    
    .eq('activo', true)
    .order('nombre');
  return (data ?? []) as Insumo[];
}

export async function createInsumo(input: {
  nombre: string;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  costo_unitario: number;
}): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from('insumos').insert(input);
  if (error) return { error: error.message };
  revalidatePath('/inventario');
  return {};
}

export async function updateInsumo(
  id: number,
  input: {
    nombre: string;
    unidad: string;
    stock_actual: number;
    stock_minimo: number;
    costo_unitario: number;
  }
): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from('insumos').update(input).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/inventario');
  return {};
}

export async function deleteInsumo(id: number): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from('insumos')
    .update({ activo: false })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/inventario');
  return {};
}

// ── RECETAS ──────────────────────────────────────────────────

export async function getRecetas(): Promise<Receta[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('recetas')
    .select('*, receta_items(*)')
    .eq('activo', true)
    .order('nombre');
  return (data ?? []) as Receta[];
}

export async function createReceta(input: {
  nombre: string;
  pasos: string[];
  items: { nombre: string; cantidad: number; unidad: string }[];
}): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();
  const { data: receta, error } = await supabase
    .from('recetas')
    .insert({ nombre: input.nombre, pasos: input.pasos })
    .select('id')
    .single();
  if (error || !receta) return { error: error?.message ?? 'Error al crear receta' };

  if (input.items.length > 0) {
    const { error: itemsError } = await supabase.from('receta_items').insert(
      input.items.map((it) => ({ ...it, receta_id: receta.id }))
    );
    if (itemsError) return { error: itemsError.message };
  }

  revalidatePath('/inventario');
  return {};
}

export async function updateReceta(
  id: number,
  input: {
    nombre: string;
    pasos: string[];
    items: { nombre: string; cantidad: number; unidad: string }[];
  }
): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();

  const { error } = await supabase
    .from('recetas')
    .update({ nombre: input.nombre, pasos: input.pasos })
    .eq('id', id);
  if (error) return { error: error.message };

  // Reemplazar items: borrar los viejos e insertar los nuevos
  await supabase.from('receta_items').delete().eq('receta_id', id);
  if (input.items.length > 0) {
    const { error: itemsError } = await supabase.from('receta_items').insert(
      input.items.map((it) => ({ ...it, receta_id: id }))
    );
    if (itemsError) return { error: itemsError.message };
  }

  revalidatePath('/inventario');
  return {};
}

export async function deleteReceta(id: number): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from('recetas')
    .update({ activo: false })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/inventario');
  return {};
}
