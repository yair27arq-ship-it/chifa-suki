'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  getTurnoHoy, registrarEntrada,
  registrarInicioDescanso, registrarFinDescanso, registrarSalida,
} from '@/actions/turnos';
import { getEstadoTurno, type Turno, type EstadoTurno } from '@/lib/turno-utils';

import { useAuth } from '@/components/AuthContext';
import { DrawerToggle } from '@/components/DrawerToggle';
import { Loader } from '@/components/Loader';
import { LogIn, Coffee, LogOut, Play } from 'lucide-react';

function formatHora(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function duracion(desde: string | null, hasta: string | null): string {
  if (!desde) return '—';
  const fin = hasta ? new Date(hasta) : new Date();
  const mins = Math.floor((fin.getTime() - new Date(desde).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function TurnosPage() {
  const { usuario } = useAuth();
  const [turno, setTurno] = useState<Turno | null>(null);
  const [estado, setEstado] = useState<EstadoTurno>('sin_turno');
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const cargar = async () => {
    const t = await getTurnoHoy();
    setTurno(t);
    setEstado(getEstadoTurno(t));
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const accion = (fn: () => Promise<{ error?: string }>) => {
    startTransition(async () => {
      await fn();
      await cargar();
    });
  };

  if (loading) return <Loader />;

  return (
    <div>
      <div className="page-header" />

      <div className="content-top-row">
        <DrawerToggle />
        <h1 className="page-title">Mi turno</h1>
      </div>

      <div className="turnos-page">
        {/* Card de estado actual */}
        <div className="turno-card">
          <div className="turno-card-top">
            <div>
              <p className="turno-nombre">{usuario?.nombre ?? '—'}</p>
              <span className={`turno-estado-badge turno-estado-${estado}`}>
                {estado === 'sin_turno' && 'Sin turno'}
                {estado === 'trabajando' && 'Trabajando'}
                {estado === 'descansando' && 'En descanso'}
                {estado === 'finalizado' && 'Turno finalizado'}
              </span>
            </div>
            {estado === 'trabajando' && (
              <div className="turno-tiempo-live">
                <span className="turno-tiempo-val">{duracion(turno?.entrada ?? null, null)}</span>
                <span className="turno-tiempo-lbl">trabajando</span>
              </div>
            )}
          </div>

          {/* Línea de tiempo del turno */}
          {turno && (
            <div className="turno-timeline">
              <div className="turno-tl-row">
                <span className="turno-tl-label">Entrada</span>
                <span className="turno-tl-val">{formatHora(turno.entrada)}</span>
              </div>
              {turno.inicio_descanso && (
                <div className="turno-tl-row">
                  <span className="turno-tl-label">Inicio descanso</span>
                  <span className="turno-tl-val">{formatHora(turno.inicio_descanso)}</span>
                </div>
              )}
              {turno.fin_descanso && (
                <div className="turno-tl-row">
                  <span className="turno-tl-label">Fin descanso</span>
                  <span className="turno-tl-val">{formatHora(turno.fin_descanso)}</span>
                </div>
              )}
              {turno.salida && (
                <div className="turno-tl-row">
                  <span className="turno-tl-label">Salida</span>
                  <span className="turno-tl-val">{formatHora(turno.salida)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="turno-acciones">
          {estado === 'sin_turno' && (
            <button className="turno-btn turno-btn-entrada" disabled={isPending} onClick={() => accion(registrarEntrada)}>
              <LogIn size={18} />
              Registrar entrada
            </button>
          )}
          {estado === 'trabajando' && (
            <>
              {!turno?.inicio_descanso && (
                <button className="turno-btn turno-btn-descanso" disabled={isPending} onClick={() => accion(registrarInicioDescanso)}>
                  <Coffee size={18} />
                  Iniciar descanso
                </button>
              )}
              <button className="turno-btn turno-btn-salida" disabled={isPending} onClick={() => accion(registrarSalida)}>
                <LogOut size={18} />
                Registrar salida
              </button>
            </>
          )}
          {estado === 'descansando' && (
            <button className="turno-btn turno-btn-entrada" disabled={isPending} onClick={() => accion(registrarFinDescanso)}>
              <Play size={18} />
              Fin del descanso
            </button>
          )}
          {estado === 'finalizado' && (
            <p className="turno-fin-msg">✓ Turno completado. ¡Hasta mañana!</p>
          )}
        </div>
      </div>
    </div>
  );
}
