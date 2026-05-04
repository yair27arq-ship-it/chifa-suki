'use client';

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase';

type Usuario = { id: string; email: string; nombre: string; rol: 'admin' | 'cajero'; modulos: string[] | null };

const AuthContext = createContext<{ usuario: Usuario | null; loading: boolean }>({
  usuario: null,
  loading: false,
});

export function useAuth() { return useContext(AuthContext); }

async function fetchModulos(userId: string): Promise<string[] | null> {
  const supabase = getSupabaseBrowser();
  const { data } = await supabase
    .from('modulos_usuario')
    .select('modulo')
    .eq('user_id', userId);
  return data && data.length > 0
    ? (data as { modulo: string }[]).map((r) => r.modulo)
    : null;
}

// Sentinel para distinguir "aún no fetched" de null
const NOT_FETCHED = Symbol('NOT_FETCHED');

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: Usuario | null;
}) {
  // Solo guardamos los módulos del cliente; el resto viene directo del server.
  // Esto garantiza que router.refresh() siempre actualice el usuario sin depender de useState.
  const [modulosClient, setModulosClient] = useState<string[] | null | typeof NOT_FETCHED>(NOT_FETCHED);

  useEffect(() => {
    if (!initialUser || initialUser.rol === 'admin') {
      setModulosClient(NOT_FETCHED);
      return;
    }

    // Fetch inmediato para tener módulos frescos desde la DB
    fetchModulos(initialUser.id).then(setModulosClient);

    // Suscripción realtime: actualiza el nav cuando el admin cambia módulos
    const supabase = getSupabaseBrowser();
    const canal = supabase
      .channel(`modulos_usuario:${initialUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'modulos_usuario',
          filter: `user_id=eq.${initialUser.id}`,
        },
        () => {
          fetchModulos(initialUser.id).then(setModulosClient);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUser?.id]);

  // usuario siempre refleja el initialUser del servidor.
  // Para cajeros, los módulos se sobreescriben con el fetch del cliente una vez disponible.
  const usuario = useMemo<Usuario | null>(() => {
    if (!initialUser) return null;
    if (initialUser.rol === 'admin') return initialUser;
    return {
      ...initialUser,
      modulos: modulosClient === NOT_FETCHED ? initialUser.modulos : modulosClient,
    };
  }, [initialUser, modulosClient]);

  return (
    <AuthContext.Provider value={{ usuario, loading: false }}>
      {children}
    </AuthContext.Provider>
  );
}
