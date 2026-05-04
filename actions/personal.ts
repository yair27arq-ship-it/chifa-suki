'use server';

import { getSupabaseServer } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getUsuarioActual } from '@/actions/auth';
import { revalidatePath } from 'next/cache';

export type PerfilUsuario = {
  id: string;
  nombre: string;
  rol: 'admin' | 'cajero';
  email: string;
  modulos: string[] | null; // null = sin restricción (todos los módulos visibles)
};

async function verificarAdmin() {
  const usuario = await getUsuarioActual();
  if (!usuario || usuario.rol !== 'admin') {
    throw new Error('No autorizado');
  }
  return usuario;
}

export async function getUsuarios(): Promise<PerfilUsuario[]> {
  await verificarAdmin();
  const supabase = await getSupabaseServer();

  const { data: perfiles } = await supabase
    .from('perfiles')
    .select('id, nombre, rol')
    .order('nombre');

  if (!perfiles || perfiles.length === 0) return [];

  const admin = getSupabaseAdmin();
  const { data: authData } = await admin.auth.admin.listUsers();
  const emailMap = new Map(authData?.users.map((u) => [u.id, u.email ?? '']));

  const { data: modulosData } = await supabase.from('modulos_usuario').select('user_id, modulo');
  const modulosMap = new Map<string, string[]>();
  if (modulosData) {
    for (const row of modulosData) {
      if (!modulosMap.has(row.user_id)) modulosMap.set(row.user_id, []);
      modulosMap.get(row.user_id)!.push(row.modulo);
    }
  }

  return perfiles.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    rol: p.rol,
    email: emailMap.get(p.id) ?? '',
    modulos: modulosMap.has(p.id) ? modulosMap.get(p.id)! : null,
  }));
}

export async function setModulosUsuario(userId: string, modulos: string[]): Promise<{ error?: string }> {
  await verificarAdmin();
  const supabase = await getSupabaseServer();

  await supabase.from('modulos_usuario').delete().eq('user_id', userId);

  if (modulos.length === 0) {
    revalidatePath('/', 'layout');
    return {};
  }

  const { error } = await supabase.from('modulos_usuario').insert(
    modulos.map((m) => ({ user_id: userId, modulo: m }))
  );

  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return {};
}

export async function crearUsuario(
  nombre: string,
  email: string,
  password: string,
  rol: 'admin' | 'cajero',
): Promise<{ error?: string }> {
  await verificarAdmin();

  const admin = getSupabaseAdmin();

  const { data, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !data.user) {
    return { error: authError?.message ?? 'Error al crear usuario' };
  }

  // Usamos upsert para manejar el caso donde un trigger de Supabase
  // ya creó la fila en perfiles automáticamente (sin nombre ni rol).
  const { error: perfilError } = await admin
    .from('perfiles')
    .upsert({ id: data.user.id, nombre, rol }, { onConflict: 'id' });

  if (perfilError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: perfilError.message };
  }

  return {};
}

export async function eliminarUsuario(id: string): Promise<{ error?: string }> {
  const yo = await verificarAdmin();
  if (yo.id === id) return { error: 'No puedes eliminar tu propia cuenta' };

  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { error: error.message };

  // Eliminar perfil por si no hay cascade configurado
  const supabase = await getSupabaseServer();
  await supabase.from('perfiles').delete().eq('id', id);

  return {};
}
