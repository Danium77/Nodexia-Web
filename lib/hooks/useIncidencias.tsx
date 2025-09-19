import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';

export default function useIncidencias() {
  const [incidencias, setIncidencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subRef = useRef<any>(null);

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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'incidencias' }, payload => {
          const rec = payload.new || payload.old;
          setIncidencias(prev => {
            if (payload.event === 'DELETE') return prev.filter(p => p.id !== rec.id);
            const idx = prev.findIndex(p => p.id === rec.id);
            if (idx === -1) return [rec, ...prev].slice(0, 50);
            const copy = [...prev]; copy[idx] = { ...copy[idx], ...rec }; return copy;
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
