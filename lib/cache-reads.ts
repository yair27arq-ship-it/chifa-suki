// Funciones de lectura cacheadas con unstable_cache.
// Usan getSupabaseService() (sin cookies) para poder vivir fuera de 'use server'.

import { unstable_cache } from 'next/cache';
import { getSupabaseService } from '@/lib/supabase-server';

// unstable_cache incluye los argumentos en la cache key automáticamente.
// Distintos userId → distintas entradas de caché.
const _getCachedUserProfile = unstable_cache(
  async (userId: string) => {
    const supabase = getSupabaseService();
    const [{ data: perfil }, { data: modulosData }] = await Promise.all([
      supabase.from('perfiles').select('nombre, rol').eq('id', userId).single(),
      supabase.from('modulos_usuario').select('modulo').eq('user_id', userId),
    ]);
    return { perfil: perfil ?? null, modulosData: modulosData ?? [] };
  },
  ['user-profile'],
  { revalidate: 300 } // 5 minutos — el perfil raramente cambia en un turno
);

/**
 * Perfil + módulos cacheados 5 min por user ID.
 * Elimina 2 queries DB en cada navegación de página.
 */
export function getCachedUserProfile(userId: string) {
  return _getCachedUserProfile(userId);
}
