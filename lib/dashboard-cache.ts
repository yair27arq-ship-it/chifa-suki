import { unstable_cache } from 'next/cache';
import { getSupabaseService } from './supabase-server';
import type { TopPlato, MetricaDia, MetodoPagoStat, DetailedPeakStats } from '@/actions/dashboard';

// ─────────────────────────────────────────────────────────────
// Funciones de datos del dashboard usando el cliente sin cookies.
// Se puede envolver con unstable_cache porque no acceden a cookies().
// ─────────────────────────────────────────────────────────────

async function fetchDetailedPeakStats(dias: number): Promise<DetailedPeakStats> {
  const supabase = getSupabaseService();

  const desde = new Date();
  desde.setDate(desde.getDate() - (dias - 1));
  const fechaDesde = desde.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const fechaHasta = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('created_at, total')
    .eq('estado', 'cobrado')
    .gte('fecha_dia', fechaDesde)
    .lte('fecha_dia', fechaHasta);

  if (!pedidos?.length) return { hours: [], days: [], heatmap: [] };

  const hoursMap = new Map<number, number>();
  const daysMap = new Map<number, { count: number; total: number }>();
  const heatmapMap = new Map<string, number>();

  for (let h = 11; h <= 23; h++) hoursMap.set(h, 0);
  for (let d = 0; d <= 6; d++) daysMap.set(d, { count: 0, total: 0 });

  for (const p of pedidos) {
    const localDate = new Date(new Date(p.created_at).toLocaleString('en-US', { timeZone: 'America/Lima' }));
    const hour = localDate.getHours();
    const day = localDate.getDay();

    if (hour >= 11 && hour <= 23) {
      hoursMap.set(hour, (hoursMap.get(hour) ?? 0) + 1);
      const key = `${day}-${hour}`;
      heatmapMap.set(key, (heatmapMap.get(key) ?? 0) + 1);
    }
    const dStat = daysMap.get(day)!;
    daysMap.set(day, { count: dStat.count + 1, total: dStat.total + Number(p.total) });
  }

  const hours = Array.from(hoursMap.entries()).map(([hora, count]) => ({ hora, count })).sort((a,b) => a.hora - b.hora);
  const days = Array.from(daysMap.entries()).map(([day, stats]) => ({ day, ...stats })).sort((a,b) => a.day - b.day);
  const heatmap: any[] = [];
  for (let d = 0; d <= 6; d++) {
    for (let h = 11; h <= 23; h++) {
      heatmap.push({ day: d, hour: h, count: heatmapMap.get(`${d}-${h}`) ?? 0 });
    }
  }

  return { hours, days, heatmap };
}

async function fetchTopPlatos(dias: number): Promise<TopPlato[]> {
  const supabase = getSupabaseService();

  const desde = new Date();
  desde.setDate(desde.getDate() - (dias - 1));
  const fechaDesde = desde.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const fechaHasta = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

  const { data: items } = await supabase
    .from('pedido_items')
    .select('nombre_plato, cantidad, subtotal, pedidos!inner(estado, fecha_dia)')
    .eq('pedidos.estado', 'cobrado')
    .gte('pedidos.fecha_dia', fechaDesde)
    .lte('pedidos.fecha_dia', fechaHasta);

  if (!items?.length) return [];

  const map = new Map<string, { cantidad: number; ingresos: number }>();
  for (const item of items) {
    const prev = map.get(item.nombre_plato) ?? { cantidad: 0, ingresos: 0 };
    map.set(item.nombre_plato, {
      cantidad: prev.cantidad + item.cantidad,
      ingresos: prev.ingresos + Number(item.subtotal),
    });
  }

  return Array.from(map.entries())
    .map(([nombre, stats]) => ({ nombre, ...stats }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

async function fetchDashboardMetrics(dias: number): Promise<MetricaDia[]> {
  const supabase = getSupabaseService();

  const desde = new Date();
  desde.setDate(desde.getDate() - (dias - 1));
  const fechaDesde = desde.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const fechaHasta = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('fecha_dia, tipo, total')
    .eq('estado', 'cobrado')
    .gte('fecha_dia', fechaDesde)
    .lte('fecha_dia', fechaHasta)
    .order('fecha_dia', { ascending: false });

  const map = new Map<string, MetricaDia>();
  for (const p of pedidos ?? []) {
    const fecha = p.fecha_dia as string;
    const existing = map.get(fecha) ?? { fecha, total_mesas: 0, total_llevar: 0, total_general: 0, num_pedidos: 0 };
    if (p.tipo === 'mesa') {
      existing.total_mesas = Number((existing.total_mesas + Number(p.total)).toFixed(2));
    } else {
      existing.total_llevar = Number((existing.total_llevar + Number(p.total)).toFixed(2));
    }
    existing.total_general = Number((existing.total_mesas + existing.total_llevar).toFixed(2));
    existing.num_pedidos += 1;
    map.set(fecha, existing);
  }

  const result: MetricaDia[] = [];
  for (let i = 0; i < dias; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const fecha = d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    result.push(map.get(fecha) ?? { fecha, total_mesas: 0, total_llevar: 0, total_general: 0, num_pedidos: 0 });
  }

  return result;
}

const METODO_CONFIG: Record<string, { label: string; emoji: string }> = {
  efectivo: { label: 'Efectivo', emoji: '💵' },
  yape:     { label: 'Yape',     emoji: '📱' },
  tarjeta:  { label: 'Tarjeta',  emoji: '💳' },
  mixto:    { label: 'Mixto',    emoji: '🔀' },
};

async function fetchMetodosPagoStats(dias: number): Promise<MetodoPagoStat[]> {
  const supabase = getSupabaseService();

  const desde = new Date();
  desde.setDate(desde.getDate() - (dias - 1));
  const fechaDesde = desde.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const fechaHasta = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('metodo_pago, total')
    .eq('estado', 'cobrado')
    .gte('fecha_dia', fechaDesde)
    .lte('fecha_dia', fechaHasta)
    .not('metodo_pago', 'is', null);

  if (!pedidos?.length) return [];

  const map = new Map<string, { count: number; total: number }>();
  for (const p of pedidos) {
    const key = p.metodo_pago as string;
    const prev = map.get(key) ?? { count: 0, total: 0 };
    map.set(key, { count: prev.count + 1, total: Number((prev.total + Number(p.total)).toFixed(2)) });
  }

  return Array.from(map.entries())
    .map(([key, stats]) => ({
      metodo: key,
      label:  METODO_CONFIG[key]?.label ?? key,
      emoji:  METODO_CONFIG[key]?.emoji ?? '💳',
      ...stats,
    }))
    .sort((a, b) => b.count - a.count);
}

// ─────────────────────────────────────────────────────────────
// Versiones cacheadas — TTL 5 minutos, tag 'dashboard'
// Para invalidar manualmente: revalidateTag('dashboard')
// ─────────────────────────────────────────────────────────────

export const getTopPlatosCached = unstable_cache(
  fetchTopPlatos,
  ['dashboard-top-platos'],
  { revalidate: 300, tags: ['dashboard'] }
);

export const getDashboardMetricasCached = unstable_cache(
  fetchDashboardMetrics,
  ['dashboard-metricas'],
  { revalidate: 300, tags: ['dashboard'] }
);

export const getMetodosPagoCached = unstable_cache(
  fetchMetodosPagoStats,
  ['dashboard-metodos'],
  { revalidate: 300, tags: ['dashboard'] }
);

export const getDetailedPeakCached = unstable_cache(
  fetchDetailedPeakStats,
  ['dashboard-peak-detailed'],
  { revalidate: 300, tags: ['dashboard'] }
);
