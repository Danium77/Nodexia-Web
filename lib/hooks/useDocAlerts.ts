// lib/hooks/useDocAlerts.ts
// Hook para consultar alertas de documentación (vencidos, por vencer, faltantes)

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export interface DocAlerta {
  tipo: 'vencido' | 'por_vencer' | 'faltante';
  entidad_tipo: string;
  entidad_nombre: string;
  documento: string;
  fecha_vencimiento?: string;
  dias_restantes?: number;
}

export interface DocAlertasResumen {
  vencidos: number;
  por_vencer: number;
  faltantes: number;
  total: number;
}

export interface UseDocAlertsReturn {
  alertas: DocAlerta[];
  resumen: DocAlertasResumen;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Número total de alertas críticas (vencidos + por_vencer) */
  badgeCount: number;
}

/**
 * Hook para obtener alertas de documentación de la empresa del usuario.
 * Refresca automáticamente cada `intervalMs` (default: 5 min).
 * 
 * @example
 * const { alertas, resumen, badgeCount, loading } = useDocAlerts();
 */
export function useDocAlerts(intervalMs = 5 * 60 * 1000): UseDocAlertsReturn {
  const [alertas, setAlertas] = useState<DocAlerta[]>([]);
  const [resumen, setResumen] = useState<DocAlertasResumen>({ vencidos: 0, por_vencer: 0, faltantes: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlertas = useCallback(async () => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      const res = await fetch('/api/documentacion/alertas', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      // Si es 401, el usuario no tiene acceso (ej: control_acceso) - ignorar silenciosamente
      if (res.status === 401 || res.status === 403) {
        setAlertas([]);
        setResumen({ vencidos: 0, por_vencer: 0, faltantes: 0, total: 0 });
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }

      const json = await res.json();
      if (json.data) {
        setAlertas(json.data.alertas || []);
        setResumen(json.data.resumen || { vencidos: 0, por_vencer: 0, faltantes: 0, total: 0 });
      }
    } catch (err: any) {
      console.error('useDocAlerts error:', err);
      setError(err.message || 'Error cargando alertas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlertas();

    if (intervalMs > 0) {
      const timer = setInterval(fetchAlertas, intervalMs);
      return () => clearInterval(timer);
    }
  }, [fetchAlertas, intervalMs]);

  const badgeCount = resumen.vencidos + resumen.por_vencer;

  return {
    alertas,
    resumen,
    loading,
    error,
    refresh: fetchAlertas,
    badgeCount,
  };
}
