'use client';

import { useState, useRef, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';

import { getTopPlatos, getDashboardMetrics, getMetodosPagoStats, getDetailedPeakStats, type TopPlato, type MetricaDia, type MetodoPagoStat, type DetailedPeakStats, type DayOfWeekStat } from '@/actions/dashboard';
import { formatPrecio } from '@/lib/utils';
import { TrendingUp, TrendingDown, Receipt, ShoppingBag, Download, ChevronDown, ChevronUp, Clock, Calendar } from 'lucide-react';
import { DrawerToggle } from '@/components/DrawerToggle';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function formatHora(h: number) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

function exportarCSV(
  periodo: Periodo,
  actual: MetricaDia[],
  topPlatos: TopPlato[],
  totalActual: number,
  totalPedidos: number,
  totalMesas: number,
  totalLlevar: number,
) {
  const labelPeriodo = PERIODOS.find(p => p.key === periodo)?.label ?? '';
  const fecha = new Date().toLocaleDateString('es-PE');
  const ticket = totalPedidos > 0 ? (totalActual / totalPedidos).toFixed(2) : '0.00';

  const th = (txt: string) =>
    `<th style="background:#111;color:#fff;padding:8px 12px;border:1px solid #333;font-size:12px;white-space:nowrap">${txt}</th>`;
  const td = (txt: string | number, bold = false) =>
    `<td style="padding:7px 12px;border:1px solid #ddd;font-size:12px;${bold ? 'font-weight:700' : ''}">${txt}</td>`;
  const section = (title: string) =>
    `<tr><td colspan="10" style="padding:20px 0 8px;font-size:14px;font-weight:700;border:none">${title}</td></tr>`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Dashboard ${labelPeriodo}</title></head>
<body style="font-family:Arial,sans-serif;padding:32px;color:#111">
  <h1 style="font-size:20px;margin:0 0 4px">Reporte Dashboard — ${labelPeriodo}</h1>
  <p style="color:#888;font-size:13px;margin:0 0 28px">Generado el ${fecha}</p>
  <table style="border-collapse:collapse;width:100%">
    ${section('RESUMEN')}
    <tr>${th('Total ventas')}${th('Pedidos')}${th('Ticket promedio')}${th('Ventas mesas')}${th('Ventas para llevar')}</tr>
    <tr>
      ${td('S/ ' + totalActual.toFixed(2), true)}
      ${td(totalPedidos)}
      ${td('S/ ' + ticket)}
      ${td('S/ ' + totalMesas.toFixed(2))}
      ${td('S/ ' + totalLlevar.toFixed(2))}
    </tr>
  </table>
  <table style="border-collapse:collapse;width:100%;margin-top:8px">
    ${section('DETALLE DIARIO')}
    <tr>${th('Fecha')}${th('Ventas mesas')}${th('Ventas para llevar')}${th('Total')}${th('Pedidos')}</tr>
    ${actual.map(d => `<tr>
      ${td(d.fecha)}
      ${td('S/ ' + Number(d.total_mesas).toFixed(2))}
      ${td('S/ ' + Number(d.total_llevar).toFixed(2))}
      ${td('S/ ' + Number(d.total_general).toFixed(2), true)}
      ${td(d.num_pedidos)}
    </tr>`).join('')}
  </table>
  <table style="border-collapse:collapse;width:100%;margin-top:8px">
    ${section('PLATOS MÁS VENDIDOS')}
    <tr>${th('Plato')}${th('Unidades vendidas')}${th('Ingresos')}</tr>
    ${topPlatos.map(p => `<tr>
      ${td(p.nombre)}
      ${td(p.cantidad)}
      ${td('S/ ' + p.ingresos.toFixed(2))}
    </tr>`).join('')}
  </table>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dashboard_${labelPeriodo.replace(' ', '_')}_${new Date().toLocaleDateString('en-CA')}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

const ventasConfig  = { total:    { label: 'Ventas',          color: '#111111' } } satisfies ChartConfig;
const platosConfig  = { cantidad: { label: 'Uds. vendidas',   color: '#111111' } } satisfies ChartConfig;
const peakConfig    = { count:    { label: 'Pedidos',         color: '#111111' } } satisfies ChartConfig;
const distConfig    = { mesas:    { label: 'Mesas',           color: '#111111' },
                        llevar:   { label: 'Para llevar',     color: '#B45309' } } satisfies ChartConfig;

type Periodo = '1d' | '7d' | '30d';

const PERIODOS: { key: Periodo; label: string; dias: number; diasComp: number }[] = [
  { key: '1d',  label: '1 día',  dias: 1,  diasComp: 2  },
  { key: '7d',  label: '7 días', dias: 7,  diasComp: 14 },
  { key: '30d', label: '1 mes',  dias: 30, diasComp: 60 },
];

function formatDia(fecha: string, periodo: Periodo) {
  const d = new Date(fecha + 'T12:00:00');
  if (periodo === '30d') return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  return d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' });
}

function labelVentas(periodo: Periodo) {
  if (periodo === '1d')  return 'Ventas hoy';
  if (periodo === '7d')  return 'Ventas esta semana';
  return 'Ventas este mes';
}

function labelPedidos(periodo: Periodo) {
  if (periodo === '1d')  return 'pedidos hoy';
  if (periodo === '7d')  return 'pedidos esta semana';
  return 'pedidos este mes';
}

function labelPeak(periodo: Periodo) {
  if (periodo === '1d')  return 'Análisis horario hoy';
  if (periodo === '7d')  return 'Análisis por días y horas esta semana';
  return 'Análisis por días y horas este mes';
}

function labelDistribucion(periodo: Periodo) {
  if (periodo === '1d')  return 'Mesas vs para llevar hoy';
  if (periodo === '7d')  return 'Mesas vs para llevar esta semana';
  return 'Mesas vs para llevar este mes';
}

type PeriodoData = { topPlatos: TopPlato[]; cierres: MetricaDia[]; metodoStats: MetodoPagoStat[]; peakStats: DetailedPeakStats };

interface Props {
  initialTopPlatos: TopPlato[];
  initialMetricas: MetricaDia[];
  initialMetodos: MetodoPagoStat[];
  initialPeakStats: DetailedPeakStats;
}

function Skel({ w, h, r, style }: { w?: string | number; h: number; r?: number; style?: React.CSSProperties }) {
  return <div className="skel" style={{ width: w ?? '100%', height: h, borderRadius: r ?? 8, ...style }} />;
}

function DashboardSkeleton() {
  return (
    <>
      {/* KPI cards */}
      <div className="dash-skel-kpis">
        {[0, 1].map((i) => (
          <div key={i} className="dash-skel-kpi">
            <Skel w={34} h={34} r={9} />
            <Skel w={90} h={10} style={{ marginTop: 14 }} />
            <Skel w={120} h={24} style={{ marginTop: 8 }} />
            <Skel w={80} h={18} r={99} style={{ marginTop: 10 }} />
          </div>
        ))}
      </div>

      {/* Ventas diarias chart */}
      <div className="dash-skel-chart">
        <Skel w={130} h={15} />
        <Skel w={180} h={11} style={{ marginTop: 6 }} />
        <Skel h={200} style={{ marginTop: 16 }} r={12} />
      </div>

      {/* Bottom row: Métodos de pago + Distribución */}
      <div className="dash-skel-bottom">
        <div className="dash-skel-chart">
          <Skel w={140} h={15} />
          <Skel w={190} h={11} style={{ marginTop: 6 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {[0, 1, 2].map((i) => (
              <Skel key={i} h={72} r={10} />
            ))}
          </div>
        </div>
        <div className="dash-skel-chart">
          <Skel w={110} h={15} />
          <Skel w={200} h={11} style={{ marginTop: 6 }} />
          <Skel h={52} style={{ marginTop: 16 }} r={10} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }}>
            {[0, 1].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Skel w={9} h={9} r={99} />
                <div style={{ flex: 1 }}>
                  <Skel w={70} h={11} />
                  <Skel w={90} h={16} style={{ marginTop: 4 }} />
                </div>
                <Skel w={40} h={16} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Peak analysis chart */}
      <div className="dash-skel-chart">
        <Skel w={160} h={15} />
        <Skel w={130} h={11} style={{ marginTop: 6 }} />
        <Skel h={280} style={{ marginTop: 16 }} r={12} />
      </div>

      {/* Platos más vendidos */}
      <div className="dash-skel-chart">
        <Skel w={160} h={15} />
        <Skel w={130} h={11} style={{ marginTop: 6 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Skel w={112} h={14} />
              <Skel h={20} r={6} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function DashboardClient({ initialTopPlatos, initialMetricas, initialMetodos, initialPeakStats }: Props) {
  // El período inicial es 7d — los datos ya vienen del servidor
  const [periodo, setPeriodo] = useState<Periodo>('7d');
  const [topPlatos,    setTopPlatos]    = useState<TopPlato[]>(initialTopPlatos);
  const [cierres,      setCierres]      = useState<MetricaDia[]>(initialMetricas);
  const [metodoStats,  setMetodoStats]  = useState<MetodoPagoStat[]>(initialMetodos);
  const [peakStats,    setPeakStats]    = useState<DetailedPeakStats>(initialPeakStats);
  const [loading,      setLoading]      = useState(false);
  const [showAllPlatos, setShowAllPlatos] = useState(false);

  // Caché local de períodos ya visitados (stale-while-revalidate)
  const cacheRef = useRef<Map<Periodo, PeriodoData>>(new Map());
  // Ref para rastrear el período activo y evitar race conditions
  const periodoActivoRef = useRef<Periodo>('7d');

  // Guardar los datos iniciales (7d) en la caché local al montar
  useEffect(() => {
    cacheRef.current.set('7d', {
      topPlatos: initialTopPlatos,
      cierres: initialMetricas,
      metodoStats: initialMetodos,
      peakStats: initialPeakStats,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cambiarPeriodo = (nuevoPeriodo: Periodo) => {
    if (nuevoPeriodo === periodo) return;
    const cfg = PERIODOS.find(p => p.key === nuevoPeriodo)!;

    // Marcar el periodo activo ANTES de cualquier fetch
    periodoActivoRef.current = nuevoPeriodo;

    const cached = cacheRef.current.get(nuevoPeriodo);
    if (cached) {
      // Mostrar datos guardados de inmediato — sin spinner
      setPeriodo(nuevoPeriodo);
      setTopPlatos(cached.topPlatos);
      setCierres(cached.cierres);
      setMetodoStats(cached.metodoStats);
      setPeakStats(cached.peakStats);
      // Actualizar en background silenciosamente
      Promise.all([
        getTopPlatos(cfg.dias),
        getDashboardMetrics(cfg.diasComp),
        getMetodosPagoStats(cfg.dias),
        getDetailedPeakStats(cfg.dias),
      ]).then(([platos, metricas, metodos, peak]) => {
        cacheRef.current.set(nuevoPeriodo, { topPlatos: platos, cierres: metricas, metodoStats: metodos, peakStats: peak });
        // Solo aplicar si el usuario sigue en este período
        if (periodoActivoRef.current !== nuevoPeriodo) return;
        setTopPlatos(platos);
        setCierres(metricas);
        setMetodoStats(metodos);
        setPeakStats(peak);
      });
    } else {
      // Primera vez que se ve este período — mostrar loading
      setPeriodo(nuevoPeriodo);
      setLoading(true);
      Promise.all([
        getTopPlatos(cfg.dias),
        getDashboardMetrics(cfg.diasComp),
        getMetodosPagoStats(cfg.dias),
        getDetailedPeakStats(cfg.dias),
      ]).then(([platos, metricas, metodos, peak]) => {
        cacheRef.current.set(nuevoPeriodo, { topPlatos: platos, cierres: metricas, metodoStats: metodos, peakStats: peak });
        // Solo aplicar si el usuario sigue en este período
        if (periodoActivoRef.current !== nuevoPeriodo) return;
        setTopPlatos(platos);
        setCierres(metricas);
        setMetodoStats(metodos);
        setPeakStats(peak);
        setLoading(false);
      });
    }
  };

  const cfg         = PERIODOS.find(p => p.key === periodo)!;
  const actual      = [...cierres].slice(0, cfg.dias).reverse();
  const anterior    = [...cierres].slice(cfg.dias, cfg.diasComp);

  const totalActual   = actual.reduce((a, c) => a + Number(c.total_general), 0);
  const totalPedidos  = actual.reduce((a, c) => a + c.num_pedidos, 0);
  const ticketAvg     = totalPedidos > 0 ? totalActual / totalPedidos : 0;
  const totalAnterior = anterior.reduce((a, c) => a + Number(c.total_general), 0);
  const pct           = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior) * 100 : null;
  const subiendo      = pct !== null && pct >= 0;

  const totalMesas  = actual.reduce((a, c) => a + Number(c.total_mesas),  0);
  const totalLlevar = actual.reduce((a, c) => a + Number(c.total_llevar), 0);
  const totalDist   = totalMesas + totalLlevar;

  const areaData  = actual.map(c => ({ dia: formatDia(c.fecha, periodo), total: Number(c.total_general) }));
  const distData  = [{ mesas: totalMesas, llevar: totalLlevar }];

  return (
    <div>
      <div className="page-header" />

      <div className="dash-page">

        <div className="content-top-row" style={{ paddingBottom: 4 }}>
          <DrawerToggle />
          <h1 style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-sora)', letterSpacing: '-0.03em', margin: 0, flex: 1 }}>Dashboard</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 12px', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {PERIODOS.map(p => (
              <button
                key={p.key}
                className={`category-tab ${periodo === p.key ? 'active' : ''}`}
                onClick={() => cambiarPeriodo(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          {!loading && (
            <button
              onClick={() => exportarCSV(periodo, actual, topPlatos, totalActual, totalPedidos, totalMesas, totalLlevar)}
              className="category-tab"
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Download size={13} />
              Exportar
            </button>
          )}
        </div>

        {loading ? <DashboardSkeleton /> : (
          <>
            <div className="dash-kpis">
              <Card>
                <CardContent className="dash-kpi-content">
                  <div className="dash-kpi-icon" style={{ background: '#F0EFF0' }}>
                    <Receipt size={15} strokeWidth={2.5} />
                  </div>
                  <p className="dash-kpi-lbl">{labelVentas(periodo)}</p>
                  <p className="dash-kpi-num">{formatPrecio(totalActual)}</p>
                  {pct !== null && (
                    <div className="dash-kpi-tag" style={{ color: subiendo ? '#16A34A' : '#DC2626', background: subiendo ? '#DCFCE7' : '#FEE2E2' }}>
                      {subiendo ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      <span>{Math.abs(pct).toFixed(0)}% vs período ant.</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="dash-kpi-content">
                  <div className="dash-kpi-icon" style={{ background: '#FEF3C7' }}>
                    <ShoppingBag size={15} strokeWidth={2.5} style={{ color: '#B45309' }} />
                  </div>
                  <p className="dash-kpi-lbl">Ticket promedio</p>
                  <p className="dash-kpi-num">{formatPrecio(ticketAvg)}</p>
                  <p className="dash-kpi-meta">{totalPedidos} {labelPedidos(periodo)}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="dash-card-header">
                <CardTitle className="dash-card-title">Ventas diarias</CardTitle>
                <CardDescription>Ingresos por cierre de día</CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-5">
                {areaData.length === 0 ? (
                  <p className="dash-empty">Sin cierres registrados en este período</p>
                ) : (
                  <ChartContainer config={ventasConfig} className="h-[200px] w-full">
                    <AreaChart data={areaData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="gvFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="var(--color-total)" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 11 }}
                        interval={periodo === '30d' ? 4 : 0}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `S/${v}`} width={48} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatPrecio(Number(v))} />} />
                      <Area type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2}
                        fill="url(#gvFill)"
                        dot={{ r: 3, fill: 'var(--color-total)', strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <div className="dash-bottom-row">
              <Card>
                <CardHeader className="dash-card-header">
                  <CardTitle className="dash-card-title">Métodos de pago</CardTitle>
                  <CardDescription>Por número de pedidos cobrados</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {metodoStats.length === 0 ? (
                    <p className="dash-empty">Sin datos en este período</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {metodoStats.map((m) => {
                        const totalCount = metodoStats.reduce((s, x) => s + x.count, 0);
                        const pct = Math.round((m.count / totalCount) * 100);
                        return (
                          <div key={m.metodo} style={{ background: 'hsl(var(--muted)/40%)', borderRadius: 10, padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                                {m.emoji}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'hsl(var(--foreground))', lineHeight: 1.2 }}>{m.label}</p>
                                <p style={{ margin: 0, fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>{m.count} pedido{m.count !== 1 ? 's' : ''}</p>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'hsl(var(--foreground))', fontFamily: 'var(--font-sora)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{formatPrecio(m.total)}</p>
                                <p style={{ margin: 0, fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>{pct}%</p>
                              </div>
                            </div>
                            <div style={{ height: 5, background: 'hsl(var(--border))', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 99, background: 'hsl(var(--foreground))', width: `${pct}%`, transition: 'width 0.4s ease' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="dash-card-header">
                  <CardTitle className="dash-card-title">Distribución</CardTitle>
                  <CardDescription>{labelDistribucion(periodo)}</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-5">
                  {totalDist === 0 ? (
                    <p className="dash-empty">Sin datos en este período</p>
                  ) : (
                    <>
                      <ChartContainer config={distConfig} className="h-[52px] w-full mb-6">
                        <BarChart layout="vertical" data={distData} margin={{ top: 12, right: 0, bottom: 12, left: 0 }} barSize={22}>
                          <XAxis type="number" hide />
                          <YAxis type="category" hide />
                          <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatPrecio(Number(v))} />} />
                          <Bar dataKey="mesas"  fill="var(--color-mesas)"  stackId="d" radius={[6, 0, 0, 6]} />
                          <Bar dataKey="llevar" fill="var(--color-llevar)" stackId="d" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ChartContainer>
                      <div className="dash-dist-legend">
                        {[
                          { key: 'mesas',  label: 'Mesas',       val: totalMesas,  color: '#111111' },
                          { key: 'llevar', label: 'Para llevar', val: totalLlevar, color: '#B45309' },
                        ].map(item => (
                          <div key={item.key} className="dash-dist-row">
                            <span className="dash-dist-dot" style={{ background: item.color }} />
                            <div className="dash-dist-info">
                              <p className="dash-dist-name">{item.label}</p>
                              <p className="dash-dist-val">{formatPrecio(item.val)}</p>
                            </div>
                            <span className="dash-dist-pct">{((item.val / totalDist) * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="dash-card-header">
                <CardTitle className="dash-card-title">Análisis de recurrencia</CardTitle>
                <CardDescription>{labelPeak(periodo)}</CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-6">
                {peakStats.heatmap.length === 0 || peakStats.heatmap.every(h => h.count === 0) ? (
                  <p className="dash-empty">Sin datos suficientes en este período</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    
                    {/* KPIs de tiempo */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ background: 'hsl(var(--muted)/30%)', padding: '12px 14px', borderRadius: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'hsl(var(--muted-foreground))', marginBottom: 4 }}>
                          <Calendar size={13} />
                          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Día pico</span>
                        </div>
                        <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                          {DIAS_SEMANA[[...peakStats.days].sort((a,b) => b.count - a.count)[0].day]}
                        </p>
                      </div>
                      <div style={{ background: 'hsl(var(--muted)/30%)', padding: '12px 14px', borderRadius: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'hsl(var(--muted-foreground))', marginBottom: 4 }}>
                          <Clock size={13} />
                          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Hora pico</span>
                        </div>
                        <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                          {formatHora([...peakStats.hours].sort((a,b) => b.count - a.count)[0].hora)}
                        </p>
                      </div>
                    </div>

                    {/* Popularidad por Día de la Semana */}
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        Popularidad por día
                      </p>
                      <ChartContainer config={peakConfig} className="h-[120px] w-full">
                        <BarChart data={peakStats.days} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tickFormatter={(v) => DIAS_SEMANA[v]} tick={{ fontSize: 11 }} />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0].payload as DayOfWeekStat;
                              return (
                                <div className="bg-background border rounded-lg p-2 shadow-sm text-[12px]">
                                  <p className="font-bold mb-1">{DIAS_SEMANA[d.day]}</p>
                                  <p>{d.count} pedidos</p>
                                  <p className="text-muted-foreground">{formatPrecio(d.total)} total</p>
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </div>

                    {/* Mapa de Calor (Heatmap) */}
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        Mapa de calor (Día vs Hora)
                      </p>
                      <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
                        <div style={{ minWidth: 400 }}>
                          {/* Header horas */}
                          <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(13, 1fr)', gap: 2, marginBottom: 4 }}>
                            <div />
                            {Array.from({ length: 13 }).map((_, i) => (
                              <div key={i} style={{ fontSize: 9, color: 'hsl(var(--muted-foreground))', textAlign: 'center' }}>
                                {11 + i}
                              </div>
                            ))}
                          </div>
                          {/* Filas días */}
                          {DIAS_SEMANA.map((dName, dIdx) => (
                            <div key={dName} style={{ display: 'grid', gridTemplateColumns: '40px repeat(13, 1fr)', gap: 2, marginBottom: 2 }}>
                              <div style={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--muted-foreground))', alignSelf: 'center' }}>
                                {dName}
                              </div>
                              {Array.from({ length: 13 }).map((_, hIdx) => {
                                const h = 11 + hIdx;
                                const cell = peakStats.heatmap.find(x => x.day === dIdx && x.hour === h);
                                const count = cell?.count ?? 0;
                                const maxCount = Math.max(...peakStats.heatmap.map(x => x.count), 1);
                                const opacity = count === 0 ? 0.05 : (count / maxCount) * 0.9 + 0.1;
                                return (
                                  <div 
                                    key={h} 
                                    title={`${dName} ${formatHora(h)}: ${count} pedidos`}
                                    style={{ 
                                      height: 24, 
                                      background: `rgba(0,0,0, ${opacity})`, 
                                      borderRadius: 3,
                                      transition: 'background 0.3s ease'
                                    }} 
                                  />
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                        <span style={{ fontSize: 9, color: 'hsl(var(--muted-foreground))' }}>Menos</span>
                        <div style={{ width: 60, height: 6, borderRadius: 99, background: 'linear-gradient(to right, rgba(0,0,0,0.1), rgba(0,0,0,0.8))' }} />
                        <span style={{ fontSize: 9, color: 'hsl(var(--muted-foreground))' }}>Más pedidos</span>
                      </div>
                    </div>

                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="dash-card-header" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <CardTitle className="dash-card-title">Platos más vendidos</CardTitle>
                  <CardDescription>Por unidades vendidas</CardDescription>
                </div>
                {topPlatos.length > 5 && (
                  <button
                    onClick={() => setShowAllPlatos(v => !v)}
                    className="category-tab"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginTop: 2 }}
                  >
                    {showAllPlatos ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    {showAllPlatos ? 'Ver menos' : `Ver todos (${topPlatos.length})`}
                  </button>
                )}
              </CardHeader>
              <CardContent className="px-4 pb-5">
                {topPlatos.length === 0 ? (
                  <p className="dash-empty">Sin ventas en este período</p>
                ) : (() => {
                  const displayPlatos = showAllPlatos ? topPlatos : topPlatos.slice(0, 5);
                  const chartH = displayPlatos.length * 44;
                  return (
                    <ChartContainer config={platosConfig} style={{ height: chartH, transition: 'height 0.3s ease' }} className="w-full">
                      <BarChart layout="vertical" data={displayPlatos} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                        <YAxis type="category" dataKey="nombre" width={112} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <XAxis type="number" hide />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, _name, item) => (
                                <>
                                  <span className="font-semibold">{value} uds</span>
                                  <span className="text-muted-foreground ml-1">— {formatPrecio(item.payload.ingresos)}</span>
                                </>
                              )}
                            />
                          }
                          cursor={{ fill: 'hsl(var(--muted))' }}
                        />
                        <Bar dataKey="cantidad" fill="var(--color-cantidad)" radius={[0, 6, 6, 0]} maxBarSize={20} />
                      </BarChart>
                    </ChartContainer>
                  );
                })()}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
