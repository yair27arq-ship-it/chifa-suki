'use server';

import { getSupabaseServer } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export async function login(email: string, password: string) {
  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return {};
}

export async function logout() {
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function getUsuarioActual() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, rol')
    .eq('id', user.id)
    .single();

  if (!perfil) return null;
  return { id: user.id, email: user.email ?? '', nombre: perfil.nombre, rol: perfil.rol as 'admin' | 'cajero' };
}
