/**
 * API para gestionar estados de unidad de viaje
 * Incluye validación de roles y transiciones de estado
 */

import { supabase } from '../supabaseClient';
import type { EstadoUnidadViaje as EstadoUnidadViajeType, UUID } from '../types';

export interface ActualizarEstadoUnidadInput {
  viaje_id: UUID;
  nuevo_estado: EstadoUnidadViajeType;
  observaciones?: string;
  ubicacion?: {
    lat: number;
    lon: number;
    precision?: number;
    velocidad?: number;
  };
}

export interface ObtenerProximosEstadosOutput {
  estado_actual: EstadoUnidadViajeType;
  proximos_estados: EstadoUnidadViajeType[];
}

/**
 * Obtiene el estado actual de la unidad de un viaje
 */
export async function obtenerEstadoUnidad(viaje_id: UUID) {
  const { data, error } = await supabase
    .from('estado_unidad_viaje')
    .select('*')
    .eq('viaje_id', viaje_id)
    .single();

  if (error) {
    console.error('Error al obtener estado unidad:', error);
    return null;
  }

  return data;
}

/**
 * Obtiene los próximos estados válidos desde el estado actual
 * Usa la función SQL que valida las transiciones permitidas
 */
export async function obtenerProximosEstados(
  viaje_id: UUID
): Promise<ObtenerProximosEstadosOutput | null> {
  const { data, error } = await supabase.rpc('obtener_proximos_estados_unidad', {
    p_viaje_id: viaje_id,
  });

  if (error) {
    console.error('Error al obtener próximos estados:', error);
    return null;
  }

  return data;
}

/**
 * Actualiza el estado de la unidad de viaje
 * Valida roles y transiciones automáticamente en el backend
 */
export async function actualizarEstadoUnidad(
  input: ActualizarEstadoUnidadInput
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    // Llamar a la función SQL que valida roles y transiciones
    const { data, error } = await supabase.rpc('validar_transicion_estado_unidad', {
      p_viaje_id: input.viaje_id,
      p_nuevo_estado: input.nuevo_estado,
      p_observaciones: input.observaciones || null,
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Error al actualizar estado',
      };
    }

    // Si se proporcionó ubicación GPS, registrarla
    if (input.ubicacion) {
      await registrarUbicacionGPS({
        viaje_id: input.viaje_id,
        lat: input.ubicacion.lat,
        lon: input.ubicacion.lon,
        ...(input.ubicacion.precision !== undefined && { precision_metros: input.ubicacion.precision }),
        ...(input.ubicacion.velocidad !== undefined && { velocidad_kmh: input.ubicacion.velocidad }),
      });
    }

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    console.error('Error en actualizarEstadoUnidad:', err);
    return {
      success: false,
      error: err.message || 'Error desconocido',
    };
  }
}

/**
 * Registra ubicación GPS del chofer
 */
export async function registrarUbicacionGPS(input: {
  viaje_id: UUID;
  lat: number;
  lon: number;
  precision_metros?: number;
  velocidad_kmh?: number;
  rumbo_grados?: number;
  altitud_metros?: number;
}) {
  const { data, error } = await supabase.rpc('registrar_ubicacion_gps', {
    p_viaje_id: input.viaje_id,
    p_latitud: input.lat,
    p_longitud: input.lon,
    p_precision_metros: input.precision_metros || null,
    p_velocidad_kmh: input.velocidad_kmh || null,
    p_rumbo_grados: input.rumbo_grados || null,
    p_altitud_metros: input.altitud_metros || null,
  });

  if (error) {
    console.error('Error al registrar ubicación GPS:', error);
    return null;
  }

  return data;
}

/**
 * Obtiene el historial de ubicaciones de un viaje
 */
export async function obtenerHistorialUbicaciones(viaje_id: UUID) {
  const { data, error } = await supabase
    .from('historial_ubicaciones')
    .select('*')
    .eq('viaje_id', viaje_id)
    .order('fecha_registro', { ascending: true });

  if (error) {
    console.error('Error al obtener historial ubicaciones:', error);
    return [];
  }

  return data || [];
}

/**
 * Cancela un viaje con motivo
 */
export async function cancelarViaje(
  viaje_id: UUID,
  motivo: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('estado_unidad_viaje')
      .update({
        estado_unidad: 'cancelado',
        motivo_cancelacion: motivo,
        fecha_cancelacion: new Date().toISOString(),
      })
      .eq('viaje_id', viaje_id);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    // También cancelar el estado de carga
    await supabase
      .from('estado_carga_viaje')
      .update({
        estado_carga: 'cancelado',
        motivo_cancelacion: motivo,
        fecha_cancelacion: new Date().toISOString(),
      })
      .eq('viaje_id', viaje_id);

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
    };
  }
}
