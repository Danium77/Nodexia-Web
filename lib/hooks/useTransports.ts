import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export interface TransportOption {
  id: string;
  nombre: string;
  tipo: string;
  capacidad?: string;
  ubicacion?: string;
  disponible: boolean;
}

export function useTransports(empresaId: string | null) {
  const [transports, setTransports] = useState<TransportOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTransports = useCallback(async () => {
    if (!empresaId) {
      setError('No se encontró la empresa del usuario');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Buscando transportes para empresa:', empresaId);
      
      // Obtener transportes vinculados desde la tabla correcta
      const { data: relaciones, error: relacionesError } = await supabase
        .from('relaciones_empresa')
        .select('id, empresa_transporte_id, estado')
        .eq('empresa_coordinadora_id', empresaId)
        .eq('estado', 'activa')
        .eq('activo', true);

      console.log('📋 Relaciones encontradas:', relaciones);
      if (relacionesError) {
        console.error('❌ Error en query relaciones:', relacionesError);
        throw relacionesError;
      }

      if (!relaciones || relaciones.length === 0) {
        setError('No hay transportes vinculados. Ve a Configuración → Transportes.');
        setTransports([]);
        return;
      }

      const transportIds = relaciones
        .map(r => r.empresa_transporte_id)
        .filter(Boolean);

      if (transportIds.length === 0) {
        setError('No se encontraron transportes válidos.');
        setTransports([]);
        return;
      }

      const { data: empresasTransporte, error: empresasError } = await supabase
        .from('empresas')
        .select('id, nombre, cuit, tipo_empresa')
        .in('id', transportIds);

      if (empresasError) throw empresasError;

      const transportes: TransportOption[] = (empresasTransporte || [])
        .filter(empresa => empresa && empresa.id)
        .map(empresa => ({
          id: empresa.id,
          nombre: empresa.nombre,
          tipo: 'Transporte - Según disponibilidad',
          capacidad: 'Disponible',
          ubicacion: '',
          disponible: true
        }));

      setTransports(transportes);
      setError(null);
    } catch (err) {
      console.error('Error cargando transportes:', err);
      setError('Error al cargar transportes disponibles');
      setTransports([]);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    if (empresaId) {
      loadTransports();
    }
  }, [empresaId, loadTransports]);

  return {
    transports,
    loading,
    error,
    reload: loadTransports
  };
}
