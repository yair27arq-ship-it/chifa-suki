'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getCierreHoy, reabrirCaja } from '@/actions/cierres';
import { getSupabaseBrowser } from '@/lib/supabase';
import { getFechaDia } from '@/lib/utils';

interface CajaState {
  cajaCerrada: boolean;
  horarCierre: string | null;
  checking: boolean;
  jornadaActual: 1 | 2;
  jornada1Cerrada: boolean;
  reabrir: () => Promise<void>;
}

const CajaContext = createContext<CajaState>({
  cajaCerrada: false,
  horarCierre: null,
  checking: true,
  jornadaActual: 1,
  jornada1Cerrada: false,
  reabrir: async () => {},
});

export function useCaja() {
  return useContext(CajaContext);
}

export function CajaProvider({ children }: { children: React.ReactNode }) {
  const [cajaCerrada, setCajaCerrada] = useState(false);
  const [horarCierre, setHorarCierre] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [jornadaActual, setJornadaActual] = useState<1 | 2>(1);
  const [jornada1Cerrada, setJornada1Cerrada] = useState(false);

  const check = useCallback(async () => {
    const hoy = getFechaDia();
    const result = await getCierreHoy(hoy);
    setCajaCerrada(result.cerrado);
    setHorarCierre(result.created_at ?? null);
    setJornadaActual(result.jornadaActual);
    setJornada1Cerrada(result.jornada1Cerrada);
    setChecking(false);
  }, []);

  const reabrir = useCallback(async () => {
    const hoy = getFechaDia();
    await reabrirCaja(hoy);
    await check();
  }, [check]);

  useEffect(() => {
    check();

    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel('caja-status')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cierres_dia' }, () => {
        check();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'cierres_dia' }, () => {
        check();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [check]);

  return (
    <CajaContext.Provider value={{ cajaCerrada, horarCierre, checking, jornadaActual, jornada1Cerrada, reabrir }}>
      {children}
    </CajaContext.Provider>
  );
}
