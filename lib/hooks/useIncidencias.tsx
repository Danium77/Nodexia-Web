import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';

interface IncidenciaRow {
  id?: string | number;
  created_at?: string;
  [key: string]: any;
}

export default function useIncidencias() {
  const [incidencias, setIncidencias] = useState<IncidenciaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subRef = useRef<{ unsubscribe?: () => void } | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('incidencias')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!mounted) return;
      if (error) setError(error.message);
      else setIncidencias(data || []);
      setLoading(false);
    };

    fetch();

    try {
      subRef.current = supabase
        .channel('public:incidencias')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'incidencias' }, (payload: unknown) => {
          const p = payload as { new?: unknown; old?: unknown; event?: string } | null;
          const rec = p?.new || p?.old;
          if (!rec || typeof rec !== 'object') return;
          const recObj = rec as IncidenciaRow;
          setIncidencias(prev => {
            if ((p as any)?.event === 'DELETE') return prev.filter((item) => item.id !== recObj.id);
            const idx = prev.findIndex((item) => item.id === recObj.id);
            if (idx === -1) return [recObj, ...prev].slice(0, 50);
            const copy = [...prev]; copy[idx] = { ...copy[idx], ...recObj }; return copy;
          });
        })
        .subscribe();
    } catch (e) {
      const t = setInterval(fetch, 30000);
      return () => clearInterval(t);
    }

    return () => { mounted = false; try { subRef.current?.unsubscribe(); } catch (e) {} };
  }, []);

  return { incidencias, loading, error };
}
