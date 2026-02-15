// lib/hooks/useUbicacionActual.ts
// Hook para manejar la ubicación actual del usuario de Control de Acceso

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useUserRole } from '../contexts/UserRoleContext';

export interface Ubicacion {
  id: string;
  nombre: string;
  cuit: string;
  tipo: 'planta' | 'deposito' | 'cliente';
}

export function useUbicacionActual() {
  const { user, empresaId, role } = useUserRole();
  const [ubicacionActualId, setUbicacionActualIdState] = useState<string | null>(null);
  const [ubicacionActual, setUbicacionActual] = useState<Ubicacion | null>(null);
  const [ubicacionesDisponibles, setUbicionesDisponibles] = useState<Ubicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar ubicación actual del usuario desde BD
  useEffect(() => {
    if (!user?.id || !empresaId) return;

    const cargarUbicacion = async () => {
      try {
        setLoading(true);

        // 1. Obtener ubicacion_actual_id de usuarios_empresa
        const { data: usuarioEmpresa, error: errorUsuario } = await supabase
          .from('usuarios_empresa')
          .select('ubicacion_actual_id')
          .eq('user_id', user.id)
          .eq('empresa_id', empresaId)
          .single();

        if (errorUsuario) {
          console.error('Error obteniendo ubicacion_actual_id:', errorUsuario);
          setError(errorUsuario.message);
          return;
        }

        const ubicacionId = usuarioEmpresa?.ubicacion_actual_id;
        setUbicacionActualIdState(ubicacionId);

        // 2. Si tiene ubicación, cargar sus datos
        if (ubicacionId) {
          const { data: ubicacion, error: errorUbicacion } = await supabase
            .from('ubicaciones')
            .select('id, nombre, cuit, tipo')
            .eq('id', ubicacionId)
            .single();

          if (errorUbicacion) {
            console.error('Error cargando datos de ubicación:', errorUbicacion);
          } else {
            setUbicacionActual(ubicacion);
          }
        }

        // 3. Cargar todas las ubicaciones disponibles de la empresa via empresa_ubicaciones
        const { data: empresaUbicaciones, error: errorEU } = await supabase
          .from('empresa_ubicaciones')
          .select('ubicacion_id')
          .eq('empresa_id', empresaId)
          .eq('activo', true);

        if (errorEU) {
          console.error('Error cargando empresa_ubicaciones:', errorEU);
        } else if (empresaUbicaciones && empresaUbicaciones.length > 0) {
          const ubicacionIds = empresaUbicaciones.map(eu => eu.ubicacion_id);
          const { data: ubicaciones, error: errorUbicaciones } = await supabase
            .from('ubicaciones')
            .select('id, nombre, cuit, tipo')
            .in('id', ubicacionIds)
            .order('nombre');

          if (errorUbicaciones) {
            console.error('Error cargando ubicaciones disponibles:', errorUbicaciones);
          } else {
            setUbicionesDisponibles(ubicaciones || []);
          }
        } else {
          // Fallback: buscar ubicaciones por CUIT de la empresa
          const { data: empresa } = await supabase
            .from('empresas')
            .select('cuit')
            .eq('id', empresaId)
            .single();

          if (empresa?.cuit) {
            const { data: ubicaciones } = await supabase
              .from('ubicaciones')
              .select('id, nombre, cuit, tipo')
              .eq('cuit', empresa.cuit)
              .eq('activo', true)
              .order('nombre');
            setUbicionesDisponibles(ubicaciones || []);
          }
        }

      } catch (err: any) {
        console.error('Error en useUbicacionActual:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    cargarUbicacion();
  }, [user?.id, empresaId]);

  // Actualizar ubicación actual
  const setUbicacionActualId = async (ubicacionId: string | null) => {
    if (!user?.id || !empresaId) {
      console.error('No hay usuario o empresa');
      return false;
    }

    try {
      // Actualizar en BD
      const { error } = await supabase
        .from('usuarios_empresa')
        .update({ ubicacion_actual_id: ubicacionId })
        .eq('user_id', user.id)
        .eq('empresa_id', empresaId);

      if (error) {
        console.error('Error actualizando ubicacion_actual_id:', error);
        setError(error.message);
        return false;
      }

      // Actualizar estado local
      setUbicacionActualIdState(ubicacionId);

      // Cargar datos de la nueva ubicación
      if (ubicacionId) {
        const { data: ubicacion } = await supabase
          .from('ubicaciones')
          .select('id, nombre, cuit, tipo')
          .eq('id', ubicacionId)
          .single();

        setUbicacionActual(ubicacion);
      } else {
        setUbicacionActual(null);
      }

      // Guardar en localStorage también para persistencia
      if (ubicacionId) {
        localStorage.setItem('ubicacion_actual_id', ubicacionId);
      } else {
        localStorage.removeItem('ubicacion_actual_id');
      }

      return true;
    } catch (err: any) {
      console.error('Error en setUbicacionActualId:', err);
      setError(err.message);
      return false;
    }
  };

  return {
    ubicacionActualId,
    ubicacionActual,
    ubicacionesDisponibles,
    setUbicacionActualId,
    loading,
    error,
    requiereUbicacion: role === 'control_acceso' && !ubicacionActualId,
  };
}
