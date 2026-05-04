import { getTopPlatosCached, getDashboardMetricasCached, getMetodosPagoCached, getDetailedPeakCached } from '@/lib/dashboard-cache';
import { DashboardClient } from './DashboardClient';

// Server Component: pre-fetcha los datos del período por defecto (7d).
// Sirve desde caché (TTL 5 min) — 0 queries a Supabase en visitas repetidas.
export default async function DashboardPage() {
  const [topPlatos, metricas, metodos, peakStats] = await Promise.all([
    getTopPlatosCached(7),
    getDashboardMetricasCached(14),
    getMetodosPagoCached(7),
    getDetailedPeakCached(7),
  ]);

  return (
    <DashboardClient
      initialTopPlatos={topPlatos}
      initialMetricas={metricas}
      initialMetodos={metodos}
      initialPeakStats={peakStats}
    />
  );
}
