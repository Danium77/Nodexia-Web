/**
 * API para gestionar estados de carga de viaje
 * Incluye validación de roles y transiciones de estado
 */

import { supabase } from '../supabaseClient';
import type { EstadoCargaViaje as EstadoCargaViajeType, UUID } from '../types';

export interface ActualizarEstadoCargaInput {
  viaje_id: UUID;
  nuevo_estado: EstadoCargaViajeType;
  observaciones?: string;
  datos_carga?: {
    producto?: string;
    peso_estimado_kg?: number;  // Peso estimado al planificar/iniciar
    peso_real_kg?: number;       // Peso real al completar
    cantidad_bultos?: number;
    temperatura_carga?: number;
  };
  documentacion?: {
    remito_numero?: string;
    remito_url?: string;
    carta_porte_url?: string;
    certificado_calidad_url?: string;
  };
  faltantes_rechazos?: {
    tiene_faltante?: boolean;
    detalle_faltante?: string;
    peso_faltante_kg?: number;
    tiene_rechazo?: boolean;
    detalle_rechazo?: string;
  };
}

/**
 * Obtiene el estado actual de la carga de un viaje
 */
export async function obtenerEstadoCarga(viaje_id: UUID) {
  const { data, error } = await supabase
    .from('estado_carga_viaje')
    .select('*')
    .eq('viaje_id', viaje_id)
    .single();

  if (error) {
    console.error('Error al obtener estado carga:', error);
    return null;
  }

  return data;
}

/**
 * Obtiene los próximos estados válidos de carga desde el estado actual
 */
export async function obtenerProximosEstadosCarga(viaje_id: UUID) {
  const { data, error } = await supabase.rpc('obtener_proximos_estados_carga', {
    p_viaje_id: viaje_id,
  });

  if (error) {
    console.error('Error al obtener próximos estados carga:', error);
    return null;
  }

  return data;
}

/**
 * Actualiza el estado de la carga con validación de roles
 */
export async function actualizarEstadoCarga(
  input: ActualizarEstadoCargaInput
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    // Preparar datos adicionales para actualizar
    const updateData: any = {
      estado_carga: input.nuevo_estado,
      observaciones_carga: input.observaciones || null,
    };

    // Agregar datos de carga si se proporcionaron
    if (input.datos_carga) {
      Object.assign(updateData, input.datos_carga);
    }

    // Agregar documentación si se proporcionó
    if (input.documentacion) {
      Object.assign(updateData, input.documentacion);
    }

    // Agregar faltantes/rechazos si se proporcionaron
    if (input.faltantes_rechazos) {
      Object.assign(updateData, input.faltantes_rechazos);
    }

    // Llamar a la función SQL que valida roles
    const { data, error } = await supabase.rpc('actualizar_estado_carga', {
      p_viaje_id: input.viaje_id,
      p_nuevo_estado: input.nuevo_estado,
      p_datos_json: updateData,
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Error al actualizar estado de carga',
      };
    }

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    console.error('Error en actualizarEstadoCarga:', err);
    return {
      success: false,
      error: err.message || 'Error desconocido',
    };
  }
}

/**
 * Registra llamado a carga (DEPRECATED - usar iniciarCarga)
 * El estado 'llamado_carga' fue eliminado
 */
export async function registrarLlamadoCarga(
  viaje_id: UUID,
  bay_carga?: string
): Promise<{ success: boolean; error?: string }> {
  // Directamente inicia el proceso de carga
  return await actualizarEstadoCarga({
    viaje_id,
    nuevo_estado: 'cargando',
    observaciones: bay_carga ? `Llamado a carga - Bay: ${bay_carga}` : 'Llamado a carga',
  });
}

/**
 * Registra posicionamiento en bay de carga (DEPRECATED - usar iniciarCarga)
 * Este estado se fusiona con cargando
 */
export async function registrarPosicionadoCarga(
  viaje_id: UUID
): Promise<{ success: boolean; error?: string }> {
  // Simplemente inicia el proceso de carga
  return await actualizarEstadoCarga({
    viaje_id,
    nuevo_estado: 'cargando',
    observaciones: 'Vehículo posicionado en bay de carga'
  });
}

/**
 * Inicia proceso de carga
 */
export async function iniciarCarga(
  viaje_id: UUID,
  producto: string,
  peso_estimado_kg?: number
): Promise<{ success: boolean; error?: string }> {
  return await actualizarEstadoCarga({
    viaje_id,
    nuevo_estado: 'cargando',
    datos_carga: {
      producto,
      ...(peso_estimado_kg !== undefined && { peso_estimado_kg }),
    },
  });
}

/**
 * Registra progreso de carga (DEPRECATED - usar iniciarCarga)
 * Usa el estado 'cargando' estándar
 */
export async function registrarCargando(
  viaje_id: UUID,
  observaciones?: string
): Promise<{ success: boolean; error?: string }> {
  // Mantener en estado cargando con observaciones actualizadas
  return await actualizarEstadoCarga({
    viaje_id,
    nuevo_estado: 'cargando',
    ...(observaciones && { observaciones }),
  });
}

/**
 * Completa la carga con datos finales
 */
export async function completarCarga(
  viaje_id: UUID,
  peso_real_kg: number,
  cantidad_bultos?: number,
  temperatura_carga?: number
): Promise<{ success: boolean; error?: string }> {
  return await actualizarEstadoCarga({
    viaje_id,
    nuevo_estado: 'cargado',
    datos_carga: {
      peso_real_kg,
      ...(cantidad_bultos !== undefined && { cantidad_bultos }),
      ...(temperatura_carga !== undefined && { temperatura_carga }),
    },
  });
}

/**
 * Valida documentación de salida (Control Acceso)
 */
export async function validarDocumentacion(
  viaje_id: UUID,
  remito_numero: string,
  remito_url?: string,
  carta_porte_url?: string
): Promise<{ success: boolean; error?: string }> {
  return await actualizarEstadoCarga({
    viaje_id,
    nuevo_estado: 'cargado',
    documentacion: {
      remito_numero,
      ...(remito_url && { remito_url }),
      ...(carta_porte_url && { carta_porte_url }),
    },
  });
}

/**
 * Inicia descarga en destino (Operador Descarga)
 */
export async function iniciarDescarga(
  viaje_id: UUID
): Promise<{ success: boolean; error?: string }> {
  return await actualizarEstadoCarga({
    viaje_id,
    nuevo_estado: 'en_proceso_descarga',
  });
}

/**
 * Registra progreso de descarga (DEPRECATED - usar iniciarDescarga)
 * El estado 'descargando' fue eliminado, solo existe 'en_proceso_descarga'
 */
export async function registrarDescargando(
  viaje_id: UUID,
  observaciones?: string
): Promise<{ success: boolean; error?: string }> {
  // Mantener en estado en_proceso_descarga con observaciones actualizadas
  return await actualizarEstadoCarga({
    viaje_id,
    nuevo_estado: 'en_proceso_descarga',
    ...(observaciones && { observaciones }),
  });
}

/**
 * Completa descarga con reporte de faltantes/rechazos
 */
export async function completarDescarga(
  viaje_id: UUID,
  tiene_faltante: boolean = false,
  tiene_rechazo: boolean = false,
  detalle_faltante?: string,
  peso_faltante_kg?: number,
  detalle_rechazo?: string
): Promise<{ success: boolean; error?: string }> {
  return await actualizarEstadoCarga({
    viaje_id,
    nuevo_estado: 'descargado',
    faltantes_rechazos: {
      tiene_faltante,
      tiene_rechazo,
      ...(detalle_faltante && { detalle_faltante }),
      ...(peso_faltante_kg !== undefined && { peso_faltante_kg }),
      ...(detalle_rechazo && { detalle_rechazo }),
    },
  });
}

/**
 * Confirma entrega final con firma
 */
export async function confirmarEntrega(
  viaje_id: UUID,
  certificado_entrega_url?: string
): Promise<{ success: boolean; error?: string }> {
  return await actualizarEstadoCarga({
    viaje_id,
    nuevo_estado: 'completado',
    ...(certificado_entrega_url && {
      documentacion: {
        certificado_calidad_url: certificado_entrega_url,
      },
    }),
  });
}
