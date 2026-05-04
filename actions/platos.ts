'use server';

import { getSupabaseServer } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import type { CategoriaMenu, Plato, OpcionPrecio } from '@/types';

// ============================================================
// Server Action — Menú de platos
// ============================================================

// Caché en memoria: el menú raramente cambia durante el servicio.
// Se invalida automáticamente cuando hay mutaciones (create/update/delete).
let _menuCache: { categorias: CategoriaMenu[]; platos: Plato[] } | null = null;

function invalidarMenuCache() {
  _menuCache = null;
}

export async function getMenu(): Promise<{ categorias: CategoriaMenu[]; platos: Plato[] }> {
  if (_menuCache) return _menuCache;

  const supabase = await getSupabaseServer();

  const [{ data: categorias }, { data: platos }] = await Promise.all([
    supabase.from('categorias').select('id, nombre, orden').order('orden'),
    supabase.from('platos').select('id, categoria_id, nombre, precio, opciones_precio, activo, orden, seccion, descripcion').eq('activo', true).order('seccion', { nullsFirst: true }).order('orden'),
  ]);

  _menuCache = {
    categorias: categorias || [],
    platos: platos || [],
  };

  return _menuCache;
}

export async function getMenuAdmin(): Promise<{ categorias: CategoriaMenu[]; platos: Plato[] }> {
  const supabase = await getSupabaseServer();

  const [{ data: categorias }, { data: platos }] = await Promise.all([
    supabase.from('categorias').select('*').order('orden'),
    supabase.from('platos').select('*').order('categoria_id').order('orden'),
  ]);

  return {
    categorias: categorias || [],
    platos: platos || [],
  };
}

export async function createPlato(input: {
  categoria_id: number;
  nombre: string;
  precio: number;
  descripcion: string;
  seccion: string;
  orden: number;
  opciones_precio: OpcionPrecio[] | null;
}): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from('platos').insert({
    ...input,
    descripcion: input.descripcion || null,
    seccion: input.seccion || null,
    opciones_precio: input.opciones_precio && input.opciones_precio.length > 0 ? input.opciones_precio : null,
  });
  if (error) return { error: error.message };
  invalidarMenuCache();
  revalidatePath('/menu');
  return {};
}

export async function updatePlato(
  id: number,
  input: {
    categoria_id: number;
    nombre: string;
    precio: number;
    descripcion: string;
    seccion: string;
    orden: number;
    activo: boolean;
    opciones_precio: OpcionPrecio[] | null;
  }
): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from('platos').update({
    ...input,
    descripcion: input.descripcion || null,
    seccion: input.seccion || null,
    opciones_precio: input.opciones_precio && input.opciones_precio.length > 0 ? input.opciones_precio : null,
  }).eq('id', id);
  if (error) return { error: error.message };
  invalidarMenuCache();
  revalidatePath('/menu');
  return {};
}

export async function deletePlato(id: number): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from('platos').update({ activo: false }).eq('id', id);
  if (error) return { error: error.message };
  invalidarMenuCache();
  revalidatePath('/menu');
  return {};
}

export async function createCategoria(nombre: string): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();
  const { data: last } = await supabase.from('categorias').select('orden').order('orden', { ascending: false }).limit(1).single();
  const orden = (last?.orden ?? 0) + 1;
  const { error } = await supabase.from('categorias').insert({ nombre, orden });
  if (error) return { error: error.message };
  invalidarMenuCache();
  revalidatePath('/menu');
  return {};
}

export async function updateCategoria(id: number, nombre: string): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from('categorias').update({ nombre }).eq('id', id);
  if (error) return { error: error.message };
  invalidarMenuCache();
  revalidatePath('/menu');
  return {};
}

export async function deleteCategoria(id: number): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from('categorias').delete().eq('id', id);
  if (error) return { error: error.message };
  invalidarMenuCache();
  revalidatePath('/menu');
  return {};
}

// Caché de mesas: raramente cambian durante el servicio
let _mesasCache: Awaited<ReturnType<typeof _fetchMesas>> | null = null;

async function _fetchMesas() {
  const supabase = await getSupabaseServer();
  const { data } = await supabase.from('mesas').select('*').eq('activa', true).order('numero');
  return data || [];
}

export async function getMesas() {
  if (_mesasCache) return _mesasCache;
  _mesasCache = await _fetchMesas();
  return _mesasCache;
}

export async function getMesaPorId(id: number) {
  const mesas = await getMesas();
  return mesas.find((m) => m.id === id) ?? null;
}

function invalidarMesasCache() {
  _mesasCache = null;
}
// Suprimir warning de unused: se usará cuando haya mutations de mesas
void invalidarMesasCache;
