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
      // Try the new despachos_red table first
      const res = await supabase
        .from('despachos_red')
        .select(`
          id,
          origen,
          destino,
          estado,
          fecha_despacho,
          fecha_creacion,
          observaciones,
          empresa_cliente:empresas!despachos_red_empresa_cliente_id_fkey(nombre, cuit),
          empresa_transporte:empresas!despachos_red_empresa_transporte_id_fkey(nombre, cuit)
        `)
        .order('fecha_creacion', { ascending: false });

      if (!mounted) return;
      if (res.error) {
        console.error('Error loading despachos from despachos_red, falling back to old despachos table:', res.error);
        setError(res.error.message);
        
        // Fallback to old despachos table
        const fallback = await supabase
          .from('despachos')
          .select('id,pedido_id,origen,destino,estado,scheduled_at,scheduled_local_date,scheduled_local_time')
          .order('scheduled_at', { ascending: false });
          
        if (fallback.error) {
          console.error('Fallback to old despachos table also failed:', fallback.error);
          setError(fallback.error.message);
        } else {
          setDispatches((fallback.data || []).map((d) => ({
            ...d,
            destino: d.destino,
            scheduled_at: d.scheduled_at,
            scheduled_local_date: d.scheduled_local_date
          } as DispatchRow)));
          setError(null);
        }
      } else {
        // Process despachos_red data
        setDispatches((res.data || []).map((d) => {
          const item = d as any;
          return ({
            id: item.id,
            destino: item.destino,
            origen: item.origen,
            estado: item.estado,
            scheduled_at: item.fecha_despacho,
            scheduled_local_date: item.fecha_despacho,
            observaciones: item.observaciones,
            empresa_cliente: item.empresa_cliente,
            empresa_transporte: item.empresa_transporte,
            fecha_creacion: item.fecha_creacion
          } as DispatchRow);
        }));
        setError(null);
      }
      setLoading(false);
    };

    fetch();

    // subscribe to changes for despachos_red table
    try {
      subRef.current = supabase
        .channel('public:despachos_red')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'despachos_red' }, (payload: unknown) => {
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
