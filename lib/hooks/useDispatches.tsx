import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';

export default function useDispatches() {
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      setLoading(true);
      // Try the detailed select (with FK joins). If it fails (schema/constraints differ after restore),
      // fall back to a simpler select so the UI still shows rows.
      const res = await supabase
        .from('despachos')
        .select(`id,destino,estado,scheduled_at,scheduled_local_date,scheduled_local_time,transporte_data:transportes!despachos_transporte_id_fkey(nombre)`)
        .order('scheduled_at', { ascending: true });

      if (!mounted) return;
      if (res.error) {
        console.error('Error loading despachos (detailed select), falling back to simple select:', res.error);
        setError(res.error.message);
        const fallback = await supabase
          .from('despachos')
          .select('id,pedido_id,origen,destino,estado,scheduled_at,scheduled_local_date,scheduled_local_time,transport_id,driver_id')
          .order('scheduled_at', { ascending: true });
        if (fallback.error) {
          console.error('Fallback select also failed for despachos:', fallback.error);
          setError(fallback.error.message);
        } else {
          // Try to fetch transport/driver names in bulk if those tables exist
          const transportIds = Array.from(new Set((fallback.data || []).map((d: any) => d.transport_id).filter(Boolean)));
          const driverIds = Array.from(new Set((fallback.data || []).map((d: any) => d.driver_id).filter(Boolean)));

          let transportsMap: Record<string, any> = {};
          let driversMap: Record<string, any> = {};
          try {
            if (transportIds.length > 0) {
              const { data: tdata, error: terr } = await supabase.from('transportes').select('id,nombre').in('id', transportIds);
              if (!terr && tdata) transportsMap = Object.fromEntries(tdata.map((t: any) => [t.id, t]));
            }
            if (driverIds.length > 0) {
              const { data: ddata, error: derr } = await supabase.from('usuarios').select('id,nombre_completo').in('id', driverIds);
              if (!derr && ddata) driversMap = Object.fromEntries(ddata.map((d: any) => [d.id, d]));
            }
          } catch (e) {
            console.error('Error fetching transport/driver names:', e);
          }

          setDispatches((fallback.data || []).map((d: any) => ({
            ...d,
            transporte_data: d.transport_id ? transportsMap[d.transport_id] : null,
            chofer: d.driver_id ? driversMap[d.driver_id] : null,
          })));
          setError(null);
        }
      } else {
        setDispatches((res.data || []).map((d: any) => ({
          ...d,
          transporte_data: Array.isArray(d.transporte_data) ? d.transporte_data[0] : d.transporte_data,
        })));
        setError(null);
      }
      setLoading(false);
    };

    fetch();

    // subscribe to changes
    try {
      subRef.current = supabase
        .channel('public:despachos')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'despachos' }, payload => {
          const rec = payload.new || payload.old;
          setDispatches(prev => {
            // naive reconciler: replace or add
            const idx = prev.findIndex(p => p.id === rec.id);
            if (payload.event === 'DELETE') return prev.filter(p => p.id !== rec.id);
            if (idx === -1) return [...prev, rec];
            const copy = [...prev]; copy[idx] = { ...copy[idx], ...rec }; return copy;
          });
        })
        .subscribe();
    } catch (e) {
      // fallback: poll every 30s
      const t = setInterval(fetch, 30000);
      return () => clearInterval(t);
    }

    return () => {
      mounted = false;
      try { subRef.current?.unsubscribe(); } catch (e) {}
    };
  }, []);

  return { dispatches, loading, error };
}
