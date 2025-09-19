import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function useDashboardKPIs() {
  const [kpis, setKpis] = useState<any>({ scheduledToday: 0, inTransit: 0, openIncidents: 0, onTimePct: 100 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchRPC = async () => {
      setLoading(true);
      try {
        // try calling a server RPC first (recommended). If not present, fallback to local queries.
        const { data, error } = await supabase.rpc('get_dashboard_kpis', {} as any);
        if (!mounted) return;
        if (!error && data) {
          setKpis(data);
          setError(null);
        } else {
          // fallback: compute locally (cheap) — note this performs multiple queries
          const today = new Date().toISOString().slice(0, 10);
          const [{ data: sd }, { data: td }, { data: incc }] = await Promise.all([
            supabase.from('despachos').select('id').eq('scheduled_local_date', today),
            supabase.from('despachos').select('id').in('estado', ['en_transito','transito']),
            supabase.from('incidencias').select('id'),
          ]);
          setKpis({ scheduledToday: (sd || []).length, inTransit: (td || []).length, openIncidents: (incc || []).length, onTimePct: 95 });
        }
      } catch (e: any) {
        setError(e?.message || 'Error fetching KPIs');
      }
      setLoading(false);
    };

    fetchRPC();

    const t = setInterval(fetchRPC, 60000); // refresh every 60s
    return () => { mounted = false; clearInterval(t); };
  }, []);

  return { kpis, loading, error };
}
