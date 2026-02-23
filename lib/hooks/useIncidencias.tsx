// Hook para consultar incidencias_viaje via API (con RLS)
// Reescrito: consulta tabla canónica incidencias_viaje via /api/incidencias

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import type { IncidenciaViaje, EstadoIncidencia } from '../types';

interface UseIncidenciasOptions {
  /** Filtrar por estado */
  estado?: EstadoIncidencia | EstadoIncidencia[];
  /** Filtrar por viaje_id  */
  viajeId?: string;
  /** Auto-refresh interval en ms (0 = deshabilitado) */
  refreshInterval?: number;
}

export default function useIncidencias(options?: UseIncidenciasOptions) {
  const [incidencias, setIncidencias] = useState<IncidenciaViaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ abiertas: 0, en_proceso: 0, resueltas: 0, cerradas: 0, total: 0 });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchIncidencias = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No hay sesión activa');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (options?.estado) {
        const estados = Array.isArray(options.estado) ? options.estado : [options.estado];
        estados.forEach(e => params.append('estado', e));
      }
      if (options?.viajeId) {
        params.set('viaje_id', options.viajeId);
      }

      const response = await fetch(`/api/incidencias?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Error ${response.status}`);
      }

      const json = await response.json();
      setIncidencias(json.data || []);
      setCounts(json.counts || { abiertas: 0, en_proceso: 0, resueltas: 0, cerradas: 0, total: 0 });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar incidencias');
    } finally {
      setLoading(false);
    }
  }, [options?.estado, options?.viajeId]);

  useEffect(() => {
    fetchIncidencias();

    // Auto-refresh cada 30s por defecto
    const interval = options?.refreshInterval ?? 30000;
    if (interval > 0) {
      intervalRef.current = setInterval(fetchIncidencias, interval);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchIncidencias, options?.refreshInterval]);

  return { incidencias, loading, error, counts, refetch: fetchIncidencias };
}
