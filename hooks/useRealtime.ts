'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase';

// ============================================================
// Hook useRealtime — suscripción a cambios en tiempo real
// ============================================================

/**
 * Escucha cambios en las tablas 'pedidos' y 'pedido_items' de Supabase Realtime.
 * Al detectar un cambio, hace refresh de la página para reflejar el nuevo estado.
 *
 * Uso: llamar desde componentes de página (Server Components renderizan
 * el estado inicial; este hook detecta cambios y dispara un router.refresh).
 */
export function useRealtime(channelName: string = 'pos-realtime') {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => {
          router.refresh();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedido_items' },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, channelName]);
}

/**
 * Hook para escuchar solo cambios en mesas (para la pantalla /mesas).
 */
export function useRealtimeMesas() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    const channel = supabase
      .channel('mesas-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);
}
