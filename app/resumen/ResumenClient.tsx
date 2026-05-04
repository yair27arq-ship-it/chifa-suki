'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getPedidosDelDia, editarPedidoResumen } from '@/actions/pedidos';
import { cerrarJornada, getCierresRecientes, getJornadaActual } from '@/actions/cierres';
import { getFondoDia, setFondoDia } from '@/actions/fondo';
import { getAjustesResumen, setAjusteResumen, deleteAjusteResumen } from '@/actions/ajustes';
import { getSupabaseBrowser } from '@/lib/supabase';
import { formatPrecio, formatHora, formatFecha, getFechaDia } from '@/lib/utils';
import { DrawerToggle } from '@/components/DrawerToggle';
import { Pencil, Check, X } from 'lucide-react';
import type { Pedido, CierreDia, PedidoItem } from '@/types';

interface Props {
  initialPedidos: Pedido[];
  initialCierres: CierreDia[];
  initialFondo: number | null;
  initialFecha: string;
  initialJornada: 1 | 2;
  initialAjustes: Record<string, number>;
  jornadaPendiente: { fecha: string; num_pedidos: number } | null;
}

export function ResumenClient({ initialPedidos, initialCierres, initialFondo, initialFecha, initialJornada, initialAjustes, jornadaPendiente }: Props) {
  const [pedidos, setPedidos] = useState<Pedido[]>(initialPedidos);
  const [cierres, setCierres] = useState<CierreDia[]>(initialCierres);
  const [loading, setLoading] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [itemsPopup, setItemsPopup] = useState<{ items: PedidoItem[]; anchorRect: DOMRect } | null>(null);
  const [resultado, setResultado] = useState<{
    jornada: 1 | 2;
    total_mesas: number;
    total_llevar: number;
    total_general: number;
    num_pedidos: number;
  } | null>(null);

  const [fondo, setFondo] = useState<number | null>(initialFondo);
  const [editandoFondo, setEditandoFondo] = useState(false);
  const [fondoInput, setFondoInput] = useState('');
  const [guardandoFondo, setGuardandoFondo] = useState(false);

  // Overrides manuales de las tarjetas de resumen
  const [overrides, setOverrides] = useState<Record<string, number>>(initialAjustes);
  const [cardPopup, setCardPopup] = useState<{ key: string; label: string; calc: number; money: boolean } | null>(null);
  const [cardInput, setCardInput] = useState('');
  const [cardSaveError, setCardSaveError] = useState<string | null>(null);
  const [showAlertaPendiente, setShowAlertaPendiente] = useState(!!jornadaPendiente);

  // Editar pedido individual
  const [editPedido, setEditPedido] = useState<Pedido | null>(null);
  const [editEstado, setEditEstado] = useState<'abierto' | 'cobrado' | 'anulado'>('cobrado');
  const [editTotal, setEditTotal] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const hoy = getFechaDia();
  const [fechaFiltro, setFechaFiltro] = useState(initialFecha);
  const esHoy = fechaFiltro === hoy;

  // Jornada que se muestra en la UI (tab seleccionada)
  const [jornadaVista, setJornadaVista] = useState<1 | 2>(initialJornada);
  // Jornada activa del día (la que aún no se ha cerrado)
  const [jornadaActual, setJornadaActual] = useState<1 | 2>(initialJornada);
  // Cuáles jornadas ya están cerradas para la fecha visualizada
  const [jornada1Cerrada, setJornada1Cerrada] = useState(
    initialCierres.some((c) => c.fecha === initialFecha && c.jornada === 1)
  );
  const [jornada2Cerrada, setJornada2Cerrada] = useState(
    initialCierres.some((c) => c.fecha === initialFecha && c.jornada === 2)
  );

  const cargar = useCallback(async (fecha: string, jornada?: 1 | 2) => {
    const [ped, cie, fondoData, jornadaActiva] = await Promise.all([
      getPedidosDelDia(fecha),
      getCierresRecientes(60),
      getFondoDia(fecha),
      getJornadaActual(fecha),
    ]);
    const jornadaTarget = jornada ?? jornadaActiva;
    const ajustesData = await getAjustesResumen(fecha, jornadaTarget);
    const cieArray = cie as CierreDia[];
    setPedidos(ped as unknown as Pedido[]);
    setCierres(cieArray);
    setFondo(fondoData);
    setJornadaActual(jornadaActiva);
    setJornada1Cerrada(cieArray.some((c) => c.fecha === fecha && c.jornada === 1));
    setJornada2Cerrada(cieArray.some((c) => c.fecha === fecha && c.jornada === 2));
    setJornadaVista(jornadaTarget);
    setOverrides(ajustesData);
    setLoading(false);
  }, []);

  // Realtime: solo recarga si el filtro es hoy
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel('resumen-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        if (fechaFiltro === getFechaDia()) cargar(fechaFiltro);
      })
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === 'visible') cargar(fechaFiltro);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [cargar, fechaFiltro]);

  // Pedidos filtrados por jornada vista
  const pedidosJornada = pedidos.filter((p) => p.jornada === jornadaVista);
  const pedidosCobrados = pedidosJornada.filter((p) => p.estado === 'cobrado');
  const totalMesas = pedidosCobrados.filter((p) => p.tipo === 'mesa').reduce((acc, p) => acc + Number(p.total), 0);
  const totalLlevar = pedidosCobrados.filter((p) => p.tipo === 'llevar').reduce((acc, p) => acc + Number(p.total), 0);
  const totalGeneral = totalMesas + totalLlevar;

  function sumarPorMetodo(metodo: string) {
    return pedidosCobrados.reduce((acc, p) => {
      if (p.metodo_pago === metodo) return acc + Number(p.total);
      if (p.metodo_pago === 'mixto' && p.pago_partes) {
        return acc + p.pago_partes.filter((pp) => pp.metodo === metodo).reduce((s, pp) => s + pp.monto, 0);
      }
      return acc;
    }, 0);
  }

  const totalEfectivo = sumarPorMetodo('efectivo');
  const totalYape = sumarPorMetodo('yape');
  const totalTarjeta = sumarPorMetodo('tarjeta');
  const totalEnCaja = (fondo ?? 0) + totalEfectivo;

  // Solo mostrar el botón de cerrar si estamos viendo la jornada actual y no está cerrada
  const jornadadVistaCerrada = jornadaVista === 1 ? jornada1Cerrada : jornada2Cerrada;
  const puedesCerrar = !jornadadVistaCerrada;

  const handleCerrar = async () => {
    setCerrando(true);
    setShowConfirm(false);
    const { data, error } = await cerrarJornada(fechaFiltro, jornadaVista);
    if (!error && data) {
      setResultado({ jornada: jornadaVista, ...data });
      await cargar(fechaFiltro);
      // Después de cerrar jornada 1, mostrar automáticamente jornada 2
      if (jornadaVista === 1) setJornadaVista(2);
    }
    setCerrando(false);
  };

  const handleGuardarFondo = async () => {
    const monto = parseFloat(fondoInput.replace(',', '.'));
    if (isNaN(monto) || monto < 0) return;
    setGuardandoFondo(true);
    await setFondoDia(fechaFiltro, monto);
    setFondo(monto);
    setEditandoFondo(false);
    setGuardandoFondo(false);
  };

  const handleAbrirEdicion = () => {
    setFondoInput(fondo != null ? fondo.toFixed(2) : '');
    setEditandoFondo(true);
  };

  // Helpers para tarjetas editables
  const getCardValue = (key: string, calculated: number) =>
    key in overrides ? overrides[key] : calculated;

  const openCardPopup = (key: string, label: string, calc: number, money: boolean) => {
    const val = key in overrides ? overrides[key] : calc;
    setCardInput(val.toFixed(money ? 2 : 0));
    setCardPopup({ key, label, calc, money });
  };

  const confirmCardPopup = async () => {
    if (!cardPopup) return;
    const parsed = parseFloat(cardInput.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      setOverrides((prev) => ({ ...prev, [cardPopup.key]: parsed }));
      const result = await setAjusteResumen(fechaFiltro, jornadaVista, cardPopup.key, parsed);
      if (result.error) {
        console.error('[ajuste] error al guardar:', result.error);
        setCardSaveError(result.error);
        return;
      }
    }
    setCardSaveError(null);
    setCardPopup(null);
  };

  const resetCardPopup = async () => {
    if (!cardPopup) return;
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[cardPopup.key];
      return next;
    });
    await deleteAjusteResumen(fechaFiltro, jornadaVista, cardPopup.key);
    setCardPopup(null);
  };

  const openEditPedido = (p: Pedido) => {
    setEditPedido(p);
    setEditEstado(p.estado);
    setEditTotal(Number(p.total).toFixed(2));
    setEditError(null);
  };

  const confirmEditPedido = async () => {
    if (!editPedido) return;
    const parsedTotal = parseFloat(editTotal.replace(',', '.'));
    if (isNaN(parsedTotal) || parsedTotal < 0) { setEditError('Total inválido'); return; }
    setEditSaving(true);
    setEditError(null);
    const res = await editarPedidoResumen(editPedido.id, {
      estado: editEstado !== editPedido.estado ? editEstado : undefined,
      total: parsedTotal !== Number(editPedido.total) ? parsedTotal : undefined,
    });
    setEditSaving(false);
    if (res.error) { setEditError(res.error); return; }
    setPedidos((prev) =>
      prev.map((p) =>
        p.id === editPedido.id ? { ...p, estado: editEstado, total: parsedTotal } : p
      )
    );
    setEditPedido(null);
  };

  return (
    <div>
      <div className="page-header" />


      <div className="content-top-row">
        <DrawerToggle />
        <h1 className="page-title">Resumen</h1>
        <div className="resumen-fecha-wrap">
          <input
            type="date"
            className="resumen-fecha-input"
            value={fechaFiltro}
            max={hoy}
            onChange={(e) => {
              if (e.target.value) {
                setFechaFiltro(e.target.value);
                setLoading(true);
                cargar(e.target.value);
              }
            }}
          />
          {!esHoy && (
            <button className="resumen-fecha-hoy" onClick={() => { setFechaFiltro(hoy); setLoading(true); cargar(hoy); }}>
              Hoy
            </button>
          )}
        </div>
      </div>

      {resultado && (
        <div style={{ margin: '12px 16px', padding: '14px 16px', background: 'color-mix(in srgb, var(--green) 10%, var(--surface))', border: '1px solid var(--green)', borderRadius: '12px', fontSize: '14px', color: 'var(--green)' }}>
          Jornada {resultado.jornada} cerrada — Total: {formatPrecio(resultado.total_general)}
          {resultado.jornada === 1 && ' · Iniciando jornada 2'}
        </div>
      )}

      <div className="fondo-card">
        <div className="fondo-card-left">
          <span className="fondo-card-label">💵 Fondo inicial de caja</span>
          {editandoFondo ? (
            <div className="fondo-edit-row">
              <span className="fondo-prefix">S/</span>
              <input
                className="fondo-input"
                type="number"
                min="0"
                step="1"
                autoFocus
                value={fondoInput}
                onChange={(e) => setFondoInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGuardarFondo();
                  if (e.key === 'Escape') setEditandoFondo(false);
                }}
              />
              <button className="fondo-btn-ok" onClick={handleGuardarFondo} disabled={guardandoFondo}>
                <Check size={14} />
              </button>
              <button className="fondo-btn-cancel" onClick={() => setEditandoFondo(false)}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <span className="fondo-card-valor">
              {fondo != null ? formatPrecio(fondo) : <span className="fondo-sin-dato">Sin registrar</span>}
            </span>
          )}
        </div>
        {!editandoFondo && (
          <button className="fondo-btn-editar" onClick={handleAbrirEdicion} title="Editar fondo">
            <Pencil size={14} />
          </button>
        )}
      </div>

      {/* Tabs de jornada */}
      <div style={{ display: 'flex', gap: 8, margin: '0 16px 4px', padding: '4px 0' }}>
        {([1, 2] as const).map((j) => {
          const cerrada = j === 1 ? jornada1Cerrada : jornada2Cerrada;
          const activa = jornadaVista === j;
          return (
            <button
              key={j}
              onClick={async () => {
              setJornadaVista(j);
              const ajustesData = await getAjustesResumen(fechaFiltro, j);
              setOverrides(ajustesData);
            }}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: activa ? '1.5px solid var(--accent)' : '1.5px solid var(--bd)',
                background: activa ? 'color-mix(in srgb, var(--accent) 12%, var(--surface))' : 'var(--surface)',
                color: activa ? 'var(--accent)' : 'var(--t2)',
                fontWeight: activa ? 700 : 400,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Jornada {j}
              {cerrada && (
                <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7 }}>cerrada</span>
              )}
              {!cerrada && j === jornadaActual && esHoy && (
                <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7 }}>activa</span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>Cargando…</div>
      ) : (
        <>
          <div className="resumen-cards">
            {([
              { key: 'mesas', label: '🍽 Mesas', calc: totalMesas, money: true },
              { key: 'llevar', label: '🛍 Para llevar', calc: totalLlevar, money: true },
              { key: 'efectivo', label: '💵 Efectivo', calc: totalEfectivo, money: true },
              { key: 'yape', label: '📱 Yape', calc: totalYape, money: true },
              { key: 'tarjeta', label: '💳 Tarjeta', calc: totalTarjeta, money: true },
              { key: 'pedidosCobrados', label: '# Pedidos cobrados', calc: pedidosCobrados.length, money: false },
              { key: 'pedidosTotal', label: '# Pedidos total', calc: pedidosJornada.length, money: false },
            ] as const).map(({ key, label, calc, money }) => {
              const isOverridden = key in overrides;
              const displayVal = getCardValue(key, calc);
              return (
                <div
                  key={key}
                  className="resumen-card resumen-card-editable"
                  onClick={() => openCardPopup(key, label, calc, money)}
                  title="Haz clic para editar"
                >
                  <div className="resumen-card-label-row">
                    <span className="resumen-card-label">{label}</span>
                    {isOverridden && <span className="resumen-card-override-dot" title="Valor ajustado manualmente" />}
                  </div>
                  <span className={`resumen-card-valor${isOverridden ? ' resumen-card-valor--override' : ''}`}>
                    {money ? formatPrecio(displayVal) : displayVal}
                  </span>
                </div>
              );
            })}
            <div className="resumen-card total">
              <span className="resumen-card-label">💰 Total general</span>
              <span className="resumen-card-valor">
                {formatPrecio(getCardValue('mesas', totalMesas) + getCardValue('llevar', totalLlevar))}
              </span>
            </div>
            <div
              className="resumen-card caja resumen-card-editable"
              onClick={() => openCardPopup('totalCaja', '🏦 Total en caja', (fondo ?? 0) + getCardValue('efectivo', totalEfectivo), true)}
              title="Haz clic para editar"
            >
              <div className="resumen-card-label-row">
                <span className="resumen-card-label">🏦 Total en caja</span>
                {'totalCaja' in overrides && <span className="resumen-card-override-dot" title="Valor ajustado manualmente" />}
              </div>
              <span className={`resumen-card-valor${'totalCaja' in overrides ? ' resumen-card-valor--override' : ''}`}>
                {formatPrecio(getCardValue('totalCaja', (fondo ?? 0) + getCardValue('efectivo', totalEfectivo)))}
              </span>
              <span className="resumen-caja-detalle">
                {fondo != null ? formatPrecio(fondo) : 'S/ 0.00'} fondo + {formatPrecio(getCardValue('efectivo', totalEfectivo))} efectivo
              </span>
            </div>
          </div>

          {puedesCerrar && (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={cerrando}
              className="btn-cerrar-dia"
            >
              {cerrando ? 'Cerrando…' : `Cerrar Jornada ${jornadaVista}`}
            </button>
          )}

          {jornadadVistaCerrada && !puedesCerrar && (
            <div style={{ margin: '8px 16px 12px', padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--bd)', borderRadius: 10, fontSize: 13, color: 'var(--t2)' }}>
              Jornada {jornadaVista} cerrada
              {cierres.find((c) => c.fecha === fechaFiltro && c.jornada === jornadaVista) && (
                <> — {formatPrecio(Number(cierres.find((c) => c.fecha === fechaFiltro && c.jornada === jornadaVista)!.total_general))} en ventas</>
              )}
            </div>
          )}

          {pedidosJornada.length > 0 && (
            <>
              <p className="section-title">
                {esHoy ? `Pedidos de hoy · Jornada ${jornadaVista}` : `Pedidos del ${formatFecha(fechaFiltro)} · Jornada ${jornadaVista}`}
              </p>
              <div className="resumen-table-wrap">
                <table className="resumen-table">
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Tipo</th>
                      <th>Mesa/Orden</th>
                      <th>Ítems</th>
                      <th>Total</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosJornada.map((p) => {
                      const numItems = p.pedido_items?.reduce((a, i) => a + i.cantidad, 0) ?? 0;
                      return (
                        <tr key={p.id}>
                          <td>{formatHora(p.created_at)}</td>
                          <td>
                            <span className={`tipo-badge tipo-${p.tipo}`}>
                              {p.tipo === 'mesa' ? 'Mesa' : 'Llevar'}
                            </span>
                          </td>
                          <td>
                            {p.tipo === 'mesa'
                              ? (p.mesas?.nombre || 'Mesa')
                              : `#${p.numero_orden}`}
                          </td>
                          <td>
                            {numItems > 0 && p.pedido_items ? (
                              <button
                                className="items-pill"
                                onClick={(e) => {
                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  setItemsPopup(prev =>
                                    prev && prev.items === p.pedido_items ? null : { items: p.pedido_items!, anchorRect: rect }
                                  );
                                }}
                              >
                                {numItems} uds
                              </button>
                            ) : '—'}
                          </td>
                          <td>{formatPrecio(Number(p.total))}</td>
                          <td>
                            <span className={`estado-badge estado-${p.estado}`}>
                              {p.estado}
                            </span>
                          </td>
                          <td>
                            <button
                              className="inv-action-btn"
                              title="Editar"
                              onClick={() => openEditPedido(p)}
                            >
                              <Pencil size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {itemsPopup && typeof document !== 'undefined' && createPortal(
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 499 }} onClick={() => setItemsPopup(null)} />
              <div style={{ position: 'fixed', top: Math.min(itemsPopup.anchorRect.bottom + 6, window.innerHeight - 300), left: Math.min(itemsPopup.anchorRect.left, window.innerWidth - 270), zIndex: 500, background: 'var(--s1)', border: '1px solid var(--bd2)', borderRadius: 12, padding: '12px 14px', minWidth: 230, maxWidth: 280, boxShadow: '0 8px 28px rgba(0,0,0,0.14)', animation: 'scale-in 0.12s cubic-bezier(0.32,0.72,0,1)', transformOrigin: 'top left' }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--t3)', marginBottom: 8 }}>
                  Detalle del pedido
                </p>
                {itemsPopup.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 6, padding: '5px 0', borderTop: i === 0 ? 'none' : '1px solid var(--bd)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', flexShrink: 0, width: 22 }}>{item.cantidad}×</span>
                    <span style={{ fontSize: 12, color: 'var(--t1)', flex: 1, lineHeight: 1.3 }}>
                      {item.nombre_plato}
                      {item.opcion_label && !item.opcion_label.startsWith('_cust') && <span style={{ fontSize: 11, color: 'var(--t3)' }}> ({item.opcion_label})</span>}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', flexShrink: 0 }}>{formatPrecio(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </>,
            document.body
          )}

          {cierres.length > 0 && (
            <>
              <p className="section-title">Historial de cierres</p>
              <div className="resumen-table-wrap">
                <table className="resumen-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Jornada</th>
                      <th>Mesas</th>
                      <th>Llevar</th>
                      <th>Pedidos</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cierres.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontSize: 11 }}>{formatFecha(c.fecha)}</td>
                        <td style={{ color: 'var(--t2)' }}>J{c.jornada}</td>
                        <td>{formatPrecio(Number(c.total_mesas))}</td>
                        <td>{formatPrecio(Number(c.total_llevar))}</td>
                        <td style={{ color: 'var(--t2)' }}>{c.num_pedidos}</td>
                        <td style={{ fontWeight: 700 }}>{formatPrecio(Number(c.total_general))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {showAlertaPendiente && jornadaPendiente && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 500, width: 300, background: 'var(--s1)', border: '1px solid #f59e0b', borderRadius: 14, padding: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', animation: 'scale-in 0.15s cubic-bezier(0.32,0.72,0,1)', transformOrigin: 'bottom right' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#b45309' }}>⚠️ Jornada 2 sin cerrar</p>
            <button onClick={() => setShowAlertaPendiente(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 0, lineHeight: 1, fontSize: 16 }}>×</button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 14, lineHeight: 1.5 }}>
            <strong>{formatFecha(jornadaPendiente.fecha)}</strong> — {jornadaPendiente.num_pedidos} pedido{jornadaPendiente.num_pedidos !== 1 ? 's' : ''} en J2 sin registrar en el historial.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-confirm-cancel" onClick={() => setShowAlertaPendiente(false)} style={{ flex: 1 }}>Ignorar</button>
            <button
              className="btn-confirm-ok"
              style={{ flex: 1 }}
              onClick={() => {
                setShowAlertaPendiente(false);
                setFechaFiltro(jornadaPendiente.fecha);
                setLoading(true);
                cargar(jornadaPendiente.fecha, 2);
              }}
            >
              Ver y cerrar
            </button>
          </div>
        </div>,
        document.body
      )}

      {showConfirm && (
        <div className="confirm-backdrop">
          <div className="confirm-box">
            <h2 className="confirm-title">¿Cerrar Jornada {jornadaVista}?</h2>
            <p className="confirm-desc">
              Se guardará el resumen con {formatPrecio(totalGeneral)} en ventas cobradas de esta jornada.
              {jornadaVista === 1 && ' La jornada 2 quedará activa para seguir operando.'}
              {jornadaVista === 2 && ' Esta es la jornada final del día.'}
            </p>
            <div className="confirm-actions">
              <button className="btn-confirm-cancel" onClick={() => setShowConfirm(false)}>Cancelar</button>
              <button className="btn-confirm-ok" onClick={handleCerrar}>Cerrar Jornada {jornadaVista}</button>
            </div>
          </div>
        </div>
      )}

      {editPedido && typeof document !== 'undefined' && createPortal(
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 499 }}
            onClick={() => setEditPedido(null)}
          />
          <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, pointerEvents: 'none' }}>
            <div
              style={{ background: 'var(--s1)', border: '1px solid var(--bd2)', borderRadius: 16, padding: 22, width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 18, pointerEvents: 'all' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t3)', marginBottom: 4 }}>
                  Editar pedido
                </p>
                <p style={{ fontSize: 13, color: 'var(--t2)' }}>
                  {editPedido.tipo === 'mesa' ? (editPedido.mesas?.nombre || 'Mesa') : `#${editPedido.numero_orden}`}
                  {' · '}{formatHora(editPedido.created_at)}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--t3)' }}>Estado</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['abierto', 'cobrado', 'anulado'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditEstado(s)}
                      style={{ flex: 1, height: 36, borderRadius: 8, border: editEstado === s ? '2px solid var(--t1)' : '1px solid var(--bd)', background: editEstado === s ? 'var(--t1)' : 'var(--surface)', color: editEstado === s ? 'var(--bg)' : 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.1s' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--t3)' }}>Total</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1.5px solid var(--bd2)', borderRadius: 10, padding: '8px 12px', background: 'var(--s2)' }}>
                  <span style={{ fontFamily: 'var(--font-sora), Sora, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--t2)', flexShrink: 0 }}>S/</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editTotal}
                    onChange={(e) => setEditTotal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmEditPedido(); if (e.key === 'Escape') setEditPedido(null); }}
                    style={{ fontFamily: 'var(--font-sora), Sora, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em', background: 'transparent', border: 'none', outline: 'none', width: '100%', minWidth: 0 }}
                  />
                </div>
              </div>
              {editError && (
                <p style={{ fontSize: 11, color: '#e55', background: 'rgba(230,80,80,0.1)', border: '1px solid rgba(230,80,80,0.3)', borderRadius: 8, padding: '8px 10px' }}>
                  {editError}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-confirm-cancel" onClick={() => setEditPedido(null)} style={{ flex: 1 }}>Cancelar</button>
                <button className="btn-confirm-ok" onClick={confirmEditPedido} disabled={editSaving} style={{ flex: 1, opacity: editSaving ? 0.5 : 1 }}>
                  {editSaving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {cardPopup && typeof document !== 'undefined' && createPortal(
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 499 }}
            onClick={() => setCardPopup(null)}
          />
          <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, pointerEvents: 'none' }}>
            <div
              style={{ background: 'var(--s1)', border: '1px solid var(--bd2)', borderRadius: 16, padding: 22, width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 16, pointerEvents: 'all' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t3)', marginBottom: 4 }}>
                  {cardPopup.label}
                </p>
                <p style={{ fontSize: 12, color: 'var(--t2)' }}>
                  Calculado: {cardPopup.money ? formatPrecio(cardPopup.calc) : cardPopup.calc}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1.5px solid var(--bd2)', borderRadius: 10, padding: '10px 14px', background: 'var(--s2)' }}>
                {cardPopup.money && (
                  <span style={{ fontFamily: 'var(--font-sora), Sora, sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--t2)', flexShrink: 0 }}>S/</span>
                )}
                <input
                  type="number"
                  min="0"
                  step={cardPopup.money ? '0.01' : '1'}
                  autoFocus
                  value={cardInput}
                  onChange={(e) => setCardInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmCardPopup();
                    if (e.key === 'Escape') setCardPopup(null);
                  }}
                  style={{ fontFamily: 'var(--font-sora), Sora, sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em', background: 'transparent', border: 'none', outline: 'none', width: '100%', minWidth: 0 }}
                />
              </div>
              {cardSaveError && (
                <p style={{ fontSize: 11, color: '#e55', background: 'rgba(230,80,80,0.1)', border: '1px solid rgba(230,80,80,0.3)', borderRadius: 8, padding: '8px 10px' }}>
                  Error al guardar: {cardSaveError}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {cardPopup.key in overrides && (
                  <button
                    onClick={resetCardPopup}
                    style={{ fontSize: 12, color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginRight: 'auto', textDecoration: 'underline', textUnderlineOffset: 2 }}
                  >
                    Restablecer
                  </button>
                )}
                <button className="btn-confirm-cancel" onClick={() => { setCardSaveError(null); setCardPopup(null); }}>Cancelar</button>
                <button className="btn-confirm-ok" onClick={confirmCardPopup}>Guardar</button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
