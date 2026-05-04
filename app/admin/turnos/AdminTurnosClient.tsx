'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTurnosTodos } from '@/actions/turnos';
import { getUsuarios, crearUsuario, eliminarUsuario, setModulosUsuario } from '@/actions/personal';
import type { PerfilUsuario } from '@/actions/personal';
import type { Turno } from '@/lib/turno-utils';
import { useAuth } from '@/components/AuthContext';
import { DrawerToggle } from '@/components/DrawerToggle';
import { getFechaDia } from '@/lib/utils';
import { Trash2, X, Settings2 } from 'lucide-react';

const TODOS_MODULOS = [
  { key: 'dashboard',    label: 'Dashboard'   },
  { key: 'mesas',        label: 'Mesas'       },
  { key: 'llevar',       label: 'Para llevar' },
  { key: 'resumen',      label: 'Resumen'     },
  { key: 'turnos',       label: 'Mi turno'    },
  { key: 'admin/turnos', label: 'Personal'    },
  { key: 'inventario',   label: 'Inventario'  },
  { key: 'menu',         label: 'Menú'        },
];

function ModalModulos({ u, onClose, onGuardado }: { u: PerfilUsuario; onClose: () => void; onGuardado: () => void }) {
  const router = useRouter();
  const [seleccionados, setSeleccionados] = useState<string[]>(
    u.modulos ?? ['mesas', 'llevar', 'turnos']
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleModulo = (key: string) => {
    setSeleccionados((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleGuardar = async () => {
    setLoading(true);
    setError('');
    const res = await setModulosUsuario(u.id, seleccionados);
    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      router.refresh(); // Invalida el cache del layout en el servidor
      onGuardado();
      onClose();
    }
  };

  return (
    <div className="inv-modal-backdrop" onClick={onClose}>
      <div className="inv-modal inv-modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="inv-modal-header">
          <span className="inv-modal-title">Módulos de {u.nombre}</span>
          <button className="inv-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="inv-modal-body">
          <p style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 14, lineHeight: 1.5 }}>
            Elige qué secciones puede ver este usuario en el menú de navegación.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {TODOS_MODULOS.map((m) => (
              <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={seleccionados.includes(m.key)}
                  onChange={() => toggleModulo(m.key)}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--t1)' }}
                />
                <span style={{ fontSize: 14, color: 'var(--t1)', fontWeight: 500 }}>{m.label}</span>
              </label>
            ))}
          </div>
          {error && <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 10 }}>{error}</p>}
        </div>
        <div className="inv-modal-footer">
          <button className="inv-btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            onClick={handleGuardar}
            disabled={loading}
            style={{ height: 36, padding: '0 16px', borderRadius: 'var(--r)', background: 'var(--t1)', color: 'var(--bg)', fontSize: 13, fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
          >
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatHora(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function duracionMin(desde: string | null, hasta: string | null): string {
  if (!desde) return '—';
  const fin = hasta ? new Date(hasta) : new Date();
  const mins = Math.floor((fin.getTime() - new Date(desde).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function ModalAgregarUsuario({ onClose, onCreado }: { onClose: () => void; onCreado: () => void }) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<'admin' | 'cajero'>('cajero');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim() || !password.trim()) { setError('Todos los campos son obligatorios'); return; }
    setLoading(true);
    setError('');
    const result = await crearUsuario(nombre.trim(), email.trim(), password, rol);
    setLoading(false);
    if (result.error) { setError(result.error); } else { onCreado(); onClose(); }
  };

  const inputStyle: React.CSSProperties = { height: 42, padding: '0 12px', borderRadius: 'var(--r)', border: '1px solid var(--bd)', background: 'var(--bg)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.07em' };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="modal-title">Nuevo usuario</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', display: 'flex', alignItems: 'center', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ paddingBottom: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Nombre</label>
              <input style={inputStyle} type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del empleado" autoFocus />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Correo</label>
              <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Contraseña</label>
              <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Rol</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['cajero', 'admin'] as const).map((r) => (
                  <button key={r} type="button" onClick={() => setRol(r)} style={{ flex: 1, height: 40, borderRadius: 'var(--r)', border: rol === r ? '2px solid var(--t1)' : '1px solid var(--bd)', background: rol === r ? 'var(--t1)' : 'var(--bg)', color: rol === r ? 'var(--bg)' : 'var(--t2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.12s' }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {error && <p style={{ fontSize: 13, color: 'var(--red)', margin: 0 }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ height: 46, borderRadius: 'var(--r)', background: 'var(--t1)', color: 'var(--bg)', fontSize: 14, fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, marginTop: 4 }}>
              {loading ? 'Creando…' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type Tab = 'turnos' | 'usuarios';

export function AdminTurnosClient({
  initialTurnos,
  initialHoy,
  initialUsuarios,
}: {
  initialTurnos: Turno[];
  initialHoy: string;
  initialUsuarios: PerfilUsuario[];
}) {
  const hoy = getFechaDia();
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'admin';

  const [tab, setTab] = useState<Tab>('turnos');
  const [fecha, setFecha] = useState(initialHoy);
  const [turnos, setTurnos] = useState<Turno[]>(initialTurnos);
  const [loadingTurnos, setLoadingTurnos] = useState(false);

  const [usuarios, setUsuarios] = useState<PerfilUsuario[]>(initialUsuarios);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PerfilUsuario | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [modalModulos, setModalModulos] = useState<PerfilUsuario | null>(null);

  const cargarTurnos = (f: string) => {
    setLoadingTurnos(true);
    getTurnosTodos(f)
      .then((data) => { setTurnos(data); })
      .catch(() => {})
      .finally(() => { setLoadingTurnos(false); });
  };

  const cargarUsuarios = () => {
    if (!esAdmin) return;
    getUsuarios().then(setUsuarios).catch(() => {});
  };

  const handleFecha = (f: string) => {
    setFecha(f);
    cargarTurnos(f);
  };

  const handleEliminar = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    setDeleteError('');
    const res = await eliminarUsuario(confirmDelete.id);
    setDeletingId(null);
    if (res.error) { setDeleteError(res.error); } else { setConfirmDelete(null); cargarUsuarios(); }
  };

  return (
    <div>
      <div className="page-header" />
      <div className="content-top-row">
        <DrawerToggle />
        <h1 className="page-title">Personal</h1>
        {tab === 'turnos' && (
          <div className="resumen-fecha-wrap">
            <input type="date" className="resumen-fecha-input" value={fecha} max={hoy} onChange={(e) => e.target.value && handleFecha(e.target.value)} />
            {fecha !== hoy && <button className="resumen-fecha-hoy" onClick={() => handleFecha(hoy)}>Hoy</button>}
          </div>
        )}
        {tab === 'usuarios' && esAdmin && (
          <button onClick={() => setModalAbierto(true)} style={{ height: 34, padding: '0 14px', borderRadius: 'var(--r)', background: 'var(--t1)', color: 'var(--bg)', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + Agregar usuario
          </button>
        )}
      </div>

      {esAdmin && (
        <div className="category-tabs">
          <button className={`category-tab ${tab === 'turnos' ? 'active' : ''}`} onClick={() => setTab('turnos')}>Turnos</button>
          <button className={`category-tab ${tab === 'usuarios' ? 'active' : ''}`} onClick={() => setTab('usuarios')}>Usuarios</button>
        </div>
      )}

      {tab === 'turnos' && (
        loadingTurnos ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: 'var(--t3)' }}>Cargando…</div>
        ) : turnos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🕐</div>
            <p className="empty-state-text">Sin registros de turnos este día</p>
          </div>
        ) : (
          <div className="resumen-table-wrap" style={{ marginTop: 16 }}>
            <table className="resumen-table">
              <thead>
                <tr><th>Empleado</th><th>Rol</th><th>Entrada</th><th>Descanso</th><th>Regreso</th><th>Salida</th><th>Total</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {turnos.map((t) => {
                  const trabajado = duracionMin(t.entrada, t.salida);
                  const sinSalida = !t.salida && t.entrada;
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.perfil?.nombre ?? '—'}</td>
                      <td><span className={`tipo-badge tipo-${t.perfil?.rol === 'admin' ? 'mesa' : 'llevar'}`}>{t.perfil?.rol ?? '—'}</span></td>
                      <td>{formatHora(t.entrada)}</td>
                      <td>{formatHora(t.inicio_descanso)}</td>
                      <td>{formatHora(t.fin_descanso)}</td>
                      <td>{formatHora(t.salida)}</td>
                      <td style={{ color: 'var(--t2)' }}>{trabajado}</td>
                      <td>
                        <span className={`estado-badge ${t.salida ? 'estado-cobrado' : sinSalida ? 'estado-abierto' : 'estado-anulado'}`}>
                          {t.salida ? 'Finalizado' : sinSalida ? 'Activo' : 'Sin entrada'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'usuarios' && esAdmin && (
        usuarios.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">👤</div><p className="empty-state-text">Sin usuarios registrados</p></div>
        ) : (
          <div className="resumen-table-wrap" style={{ marginTop: 16 }}>
            <table className="resumen-table">
              <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Módulos</th><th></th></tr></thead>
              <tbody>
                {usuarios.map((u) => {
                  const modulosLabel = u.rol === 'admin'
                    ? 'Todos'
                    : u.modulos === null
                      ? 'Todos'
                      : u.modulos.length === 0
                        ? 'Ninguno'
                        : `${u.modulos.length}/${TODOS_MODULOS.length}`;
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.nombre}</td>
                      <td style={{ color: 'var(--t2)' }}>{u.email}</td>
                      <td><span className={`tipo-badge tipo-${u.rol === 'admin' ? 'mesa' : 'llevar'}`}>{u.rol}</span></td>
                      <td style={{ color: 'var(--t2)', fontSize: 13 }}>{modulosLabel}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {u.rol === 'cajero' && (
                            <button
                              className="inv-action-btn"
                              title="Configurar módulos"
                              onClick={() => setModalModulos(u)}
                            >
                              <Settings2 size={13} />
                            </button>
                          )}
                          {u.id !== usuario?.id && (
                            <button className="inv-action-btn inv-action-danger" onClick={() => { setDeleteError(''); setConfirmDelete(u); }}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {modalAbierto && <ModalAgregarUsuario onClose={() => setModalAbierto(false)} onCreado={cargarUsuarios} />}
      {modalModulos && <ModalModulos u={modalModulos} onClose={() => setModalModulos(null)} onGuardado={cargarUsuarios} />}

      {confirmDelete && (
        <div className="inv-modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="inv-modal inv-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="inv-modal-header">
              <span className="inv-modal-title">Eliminar usuario</span>
              <button className="inv-modal-close" onClick={() => setConfirmDelete(null)}>✕</button>
            </div>
            <div className="inv-modal-body">
              <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5 }}>
                ¿Eliminar a <strong style={{ color: 'var(--t1)' }}>{confirmDelete.nombre}</strong>? Esta acción no se puede deshacer.
              </p>
              {deleteError && <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>{deleteError}</p>}
            </div>
            <div className="inv-modal-footer">
              <button className="inv-btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="inv-btn-danger" onClick={handleEliminar} disabled={!!deletingId} style={{ opacity: deletingId ? 0.5 : 1 }}>
                {deletingId ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
