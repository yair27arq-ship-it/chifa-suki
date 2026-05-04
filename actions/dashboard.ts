'use server';

import { getSupabaseServer } from '@/lib/supabase-server';

export type TopPlato = {
  nombre: string;
  cantidad: number;
  ingresos: number;
};

export type MetricaDia = {
  fecha: string;
  total_mesas: number;
  total_llevar: number;
  total_general: number;
  num_pedidos: number;
};

/**
 * Devuelve los 5 platos más vendidos (por unidades) de los pedidos cobrados en los últimos N días.
 * Usa un join para evitar el límite de URL de PostgREST con arrays de IDs grandes.
 */
export async function getTopPlatos(dias = 30): Promise<TopPlato[]> {
  const supabase = await getSupabaseServer();

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

export type PeakHourStat = {
  hora: number;
  count: number;
};

export type DayOfWeekStat = {
  day: number; // 0-6 (Dom-Sab)
  count: number;
  total: number;
};

export type HeatmapStat = {
  day: number;
  hour: number;
  count: number;
};

export type DetailedPeakStats = {
  hours: PeakHourStat[];
  days: DayOfWeekStat[];
  heatmap: HeatmapStat[];
};

/**
 * Devuelve un análisis detallado de pedidos por hora y día de la semana.
 */
export async function getDetailedPeakStats(dias = 30): Promise<DetailedPeakStats> {
  const supabase = await getSupabaseServer();

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

  if (!pedidos?.length) {
    return { hours: [], days: [], heatmap: [] };
  }

  const hoursMap = new Map<number, number>();
  const daysMap = new Map<number, { count: number; total: number }>();
  const heatmapMap = new Map<string, number>();

  // Inicializar estructuras
  for (let h = 11; h <= 23; h++) hoursMap.set(h, 0);
  for (let d = 0; d <= 6; d++) daysMap.set(d, { count: 0, total: 0 });

  for (const p of pedidos) {
    const date = new Date(p.created_at);
    // Ajustar a zona horaria local para extraer componentes
    const localDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Lima' }));
    
    const hour = localDate.getHours();
    const day = localDate.getDay(); // 0=Dom, 1=Lun...

    // Horas (total)
    if (hour >= 11 && hour <= 23) {
      hoursMap.set(hour, (hoursMap.get(hour) ?? 0) + 1);
    }

    // Días (total)
    const dStat = daysMap.get(day)!;
    daysMap.set(day, { count: dStat.count + 1, total: dStat.total + Number(p.total) });

    // Heatmap (Día x Hora)
    if (hour >= 11 && hour <= 23) {
      const key = `${day}-${hour}`;
      heatmapMap.set(key, (heatmapMap.get(key) ?? 0) + 1);
    }
  }

  const hours = Array.from(hoursMap.entries()).map(([hora, count]) => ({ hora, count })).sort((a,b) => a.hora - b.hora);
  const days = Array.from(daysMap.entries()).map(([day, stats]) => ({ day, ...stats })).sort((a,b) => a.day - b.day);
  
  const heatmap: HeatmapStat[] = [];
  for (let d = 0; d <= 6; d++) {
    for (let h = 11; h <= 23; h++) {
      heatmap.push({ day: d, hour: h, count: heatmapMap.get(`${d}-${h}`) ?? 0 });
    }
  }

  return { hours, days, heatmap };
}

// Eliminar getPeakHoursStats ya que DetailedPeakStats lo incluye

export type MetodoPagoStat = {
  metodo: string;
  label: string;
  emoji: string;
  count: number;
  total: number;
};

const METODO_CONFIG: Record<string, { label: string; emoji: string }> = {
  efectivo: { label: 'Efectivo', emoji: '💵' },
  yape:     { label: 'Yape',     emoji: '📱' },
  tarjeta:  { label: 'Tarjeta',  emoji: '💳' },
  mixto:    { label: 'Mixto',    emoji: '🔀' },
};

/**
 * Conteo y monto por método de pago en los últimos N días.
 * Los pedidos sin método registrado se ignoran.
 */
export async function getMetodosPagoStats(dias = 7): Promise<MetodoPagoStat[]> {
  const supabase = await getSupabaseServer();

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

/**
 * Calcula métricas diarias de los últimos N días directamente desde pedidos cobrados.
 * Siempre devuelve exactamente N entradas (una por día), rellenando con ceros los días sin ventas.
 * Orden: desc (más reciente primero), para que el dashboard pueda hacer slice(0, X) por período.
 */
export async function getDashboardMetrics(dias = 14): Promise<MetricaDia[]> {
  const supabase = await getSupabaseServer();

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

  // Agrupar por fecha_dia
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

  // Generar todas las fechas del rango (sin huecos), desc
  const result: MetricaDia[] = [];
  for (let i = 0; i < dias; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const fecha = d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    result.push(map.get(fecha) ?? { fecha, total_mesas: 0, total_llevar: 0, total_general: 0, num_pedidos: 0 });
  }

  return result;
}
