import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';

interface DispatchRow {
  id?: string | number;
  transport_id?: string | number | null;
  driver_id?: string | number | null;
  transporte_data?: any;
  chofer?: any;
  [key: string]: any;
}

export default function useDispatches() {
  const [dispatches, setDispatches] = useState<DispatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subRef = useRef<{ unsubscribe?: () => void } | null>(null);

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
          const transportIds = Array.from(new Set((fallback.data || []).map((d) => (d as Record<string, any>).transport_id).filter(Boolean)));
          const driverIds = Array.from(new Set((fallback.data || []).map((d) => (d as Record<string, any>).driver_id).filter(Boolean)));

          let transportsMap: Record<string, any> = {};
          let driversMap: Record<string, any> = {};
          try {
            if (transportIds.length > 0) {
              const { data: tdata, error: terr } = await supabase.from('transportes').select('id,nombre').in('id', transportIds);
              if (!terr && tdata) transportsMap = Object.fromEntries((tdata as Array<Record<string, any>>).map((t) => [t.id, t]));
            }
            if (driverIds.length > 0) {
              const { data: ddata, error: derr } = await supabase.from('usuarios').select('id,nombre_completo').in('id', driverIds);
              if (!derr && ddata) driversMap = Object.fromEntries((ddata as Array<Record<string, any>>).map((d) => [d.id, d]));
            }
          } catch (e) {
            console.error('Error fetching transport/driver names:', e);
          }

          setDispatches((fallback.data || []).map((d) => {
            const item = d as Record<string, any>;
            return ({
              ...item,
              transporte_data: item.transport_id ? transportsMap[String(item.transport_id)] : null,
              chofer: item.driver_id ? driversMap[String(item.driver_id)] : null,
            } as DispatchRow);
          }));
          setError(null);
        }
      } else {
        setDispatches((res.data || []).map((d) => {
          const item = d as Record<string, any>;
          return ({
            ...item,
            transporte_data: Array.isArray(item.transporte_data) ? item.transporte_data[0] : item.transporte_data,
          } as DispatchRow);
        }));
        setError(null);
      }
      setLoading(false);
    };

    fetch();

    // subscribe to changes
    try {
      subRef.current = supabase
        .channel('public:despachos')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'despachos' }, (payload: unknown) => {
          const p = payload as { new?: unknown; old?: unknown; event?: string } | null;
          const rec = p?.new || p?.old;
          if (!rec || typeof rec !== 'object') return;
          const recObj = rec as Record<string, any>;
          setDispatches(prev => {
            // naive reconciler: replace or add
            const idx = prev.findIndex((pItem) => pItem.id === recObj.id);
            const ev = p?.event;
            if (ev === 'DELETE') return prev.filter((pItem) => pItem.id !== recObj.id);
            if (idx === -1) return [...prev, recObj as DispatchRow];
            const copy = [...prev]; copy[idx] = { ...copy[idx], ...recObj }; return copy;
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
