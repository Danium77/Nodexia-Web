/**
 * Servicio para validar transiciones de estados
 * y registrar cambios con auditoría
 */

import { createClient } from '@supabase/supabase-js';
import type { EstadoUnidadViaje, EstadoCargaViaje } from '../types';

interface TransicionValidacion {
  valido: boolean;
  mensaje: string;
}

interface CambioEstadoParams {
  viajeId: number;
  tipo: 'unidad' | 'carga';
  estadoNuevo: EstadoUnidadViaje | EstadoCargaViaje;
  notas?: string;
  ubicacionLat?: number;
  ubicacionLng?: number;
}

interface CambioEstadoResult {
  success: boolean;
  mensaje: string;
  error?: string;
}

/**
 * Transiciones permitidas para estados de UNIDAD
 */
export const TRANSICIONES_UNIDAD: Record<EstadoUnidadViaje, EstadoUnidadViaje[]> = {
  pendiente: ['asignado', 'cancelado'],
  asignado: ['confirmado_chofer', 'cancelado'],
  confirmado_chofer: ['en_transito_origen', 'cancelado'],
  en_transito_origen: ['arribado_origen', 'en_incidencia'],
  arribado_origen: ['en_playa_espera', 'llamado_carga'],
  en_playa_espera: ['llamado_carga'],
  llamado_carga: ['posicionado_carga'],
  posicionado_carga: ['carga_completada', 'en_incidencia'],
  carga_completada: ['saliendo_origen'],
  saliendo_origen: ['en_transito_destino'],
  en_transito_destino: ['arribado_destino', 'en_incidencia'],
  arribado_destino: ['descarga_completada'],
  descarga_completada: ['viaje_completado'],
  viaje_completado: [],
  en_incidencia: ['en_transito_origen', 'en_transito_destino', 'cancelado'],
  cancelado: [],
};

/**
 * Transiciones permitidas para estados de CARGA
 */
export const TRANSICIONES_CARGA: Record<EstadoCargaViaje, EstadoCargaViaje[]> = {
  pendiente: ['planificado', 'cancelado_sin_carga'],
  planificado: ['documentacion_preparada'],
  documentacion_preparada: ['en_proceso_carga'],
  en_proceso_carga: ['cargado', 'con_faltante'],
  cargado: ['documentacion_validada'],
  documentacion_validada: ['en_transito'],
  en_transito: ['en_proceso_descarga'],
  en_proceso_descarga: ['descargado', 'con_rechazo', 'con_faltante'],
  descargado: ['documentacion_cierre'],
  documentacion_cierre: ['completado'],
  completado: [],
  con_faltante: ['en_proceso_carga', 'en_proceso_descarga', 'completado'],
  con_rechazo: ['completado'],
  cancelado_sin_carga: [],
};

/**
 * Valida si una transición de estado es permitida (cliente)
 */
export function validarTransicionLocal(
  tipo: 'unidad' | 'carga',
  estadoActual: string,
  estadoNuevo: string
): TransicionValidacion {
  if (tipo === 'unidad') {
    const transiciones = TRANSICIONES_UNIDAD[estadoActual as EstadoUnidadViaje];
    if (!transiciones) {
      return {
        valido: false,
        mensaje: `Estado actual desconocido: ${estadoActual}`
      };
    }

    if (transiciones.includes(estadoNuevo as EstadoUnidadViaje)) {
      return {
        valido: true,
        mensaje: 'Transición válida'
      };
    }

    return {
      valido: false,
      mensaje: `Transición no permitida: ${estadoActual} → ${estadoNuevo}`
    };
  }

  // Validar carga
  const transiciones = TRANSICIONES_CARGA[estadoActual as EstadoCargaViaje];
  if (!transiciones) {
    return {
      valido: false,
      mensaje: `Estado actual desconocido: ${estadoActual}`
    };
  }

  if (transiciones.includes(estadoNuevo as EstadoCargaViaje)) {
    return {
      valido: true,
      mensaje: 'Transición válida'
    };
  }

  return {
    valido: false,
    mensaje: `Transición no permitida: ${estadoActual} → ${estadoNuevo}`
  };
}

/**
 * Valida transición usando la función SQL (servidor)
 */
export async function validarTransicionServidor(
  tipo: 'unidad' | 'carga',
  estadoActual: string,
  estadoNuevo: string
): Promise<TransicionValidacion> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data, error } = await supabase.rpc('validar_transicion_estado', {
    tipo,
    estado_actual: estadoActual,
    estado_nuevo: estadoNuevo
  });

  if (error) {
    console.error('Error al validar transición:', error);
    return {
      valido: false,
      mensaje: `Error al validar: ${error.message}`
    };
  }

  return data[0] || { valido: false, mensaje: 'Sin respuesta del servidor' };
}

/**
 * Cambia el estado de un viaje con validación y auditoría
 */
export async function cambiarEstadoViaje(
  params: CambioEstadoParams
): Promise<CambioEstadoResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // 1. Obtener estado actual
    const { data: viaje, error: fetchError } = await supabase
      .from('viajes_despacho')
      .select('estado_unidad_viaje, estado_carga_viaje')
      .eq('id', params.viajeId)
      .single();

    if (fetchError) {
      return {
        success: false,
        mensaje: 'Error al obtener viaje',
        error: fetchError.message
      };
    }

    const estadoActual = params.tipo === 'unidad' 
      ? (viaje as any).estado_unidad_viaje 
      : (viaje as any).estado_carga_viaje;

    // 2. Validar transición
    const validacion = validarTransicionLocal(params.tipo, estadoActual, params.estadoNuevo);

    if (!validacion.valido) {
      return {
        success: false,
        mensaje: validacion.mensaje
      };
    }

    // 3. Actualizar estado
    const updateData = params.tipo === 'unidad'
      ? { 
          estado_unidad_viaje: params.estadoNuevo,
          fecha_actualizacion_estado_unidad: new Date().toISOString()
        }
      : { 
          estado_carga_viaje: params.estadoNuevo 
        };

    const { error: updateError } = await supabase
      .from('viajes_despacho')
      .update(updateData)
      .eq('id', params.viajeId);

    if (updateError) {
      return {
        success: false,
        mensaje: 'Error al actualizar estado',
        error: updateError.message
      };
    }

    // 4. El trigger SQL ya registra en auditoría automáticamente
    // Si hay notas o ubicación adicional, actualizarlas
    if (params.notas || params.ubicacionLat) {
      await supabase
        .from('viajes_estados_audit')
        .update({
          notas: params.notas,
          ubicacion_lat: params.ubicacionLat,
          ubicacion_lng: params.ubicacionLng
        })
        .eq('viaje_id', params.viajeId)
        .eq('estado_nuevo', params.estadoNuevo)
        .order('fecha_cambio', { ascending: false })
        .limit(1);
    }

    return {
      success: true,
      mensaje: `Estado actualizado correctamente a: ${params.estadoNuevo}`
    };

  } catch (error: any) {
    return {
      success: false,
      mensaje: 'Error inesperado',
      error: error.message
    };
  }
}

/**
 * Obtiene los próximos estados permitidos
 */
export function getProximosEstadosPermitidos(
  tipo: 'unidad' | 'carga',
  estadoActual: string
): string[] {
  if (tipo === 'unidad') {
    return TRANSICIONES_UNIDAD[estadoActual as EstadoUnidadViaje] || [];
  }
  return TRANSICIONES_CARGA[estadoActual as EstadoCargaViaje] || [];
}

/**
 * Verifica si un estado es final (no tiene transiciones)
 */
export function esEstadoFinal(
  tipo: 'unidad' | 'carga',
  estado: string
): boolean {
  const proximosEstados = getProximosEstadosPermitidos(tipo, estado);
  return proximosEstados.length === 0;
}

/**
 * Genera descripción de la transición
 */
export function getDescripcionTransicion(
  _tipo: 'unidad' | 'carga',
  estadoActual: string,
  estadoNuevo: string
): string {
  const transiciones: Record<string, string> = {
    'pendiente->asignado': 'Se asigna chofer al viaje',
    'asignado->confirmado_chofer': 'Chofer confirma el viaje',
    'confirmado_chofer->en_transito_origen': 'Chofer inicia viaje hacia planta',
    'en_transito_origen->arribado_origen': 'Chofer arriba a planta de carga',
    'arribado_origen->en_playa_espera': 'Unidad espera en playa',
    'en_playa_espera->llamado_carga': 'Unidad es llamada a carga',
    'llamado_carga->posicionado_carga': 'Unidad se posiciona para carga',
    'posicionado_carga->carga_completada': 'Carga completada',
    'carga_completada->saliendo_origen': 'Unidad sale de planta',
    'saliendo_origen->en_transito_destino': 'Unidad en ruta a destino',
    'en_transito_destino->arribado_destino': 'Unidad arriba a destino',
    'arribado_destino->descarga_completada': 'Descarga completada',
    'descarga_completada->viaje_completado': 'Viaje finalizado',
    'planificacion->cargando': 'Inicia proceso de carga',
    'cargando->carga_completada': 'Mercadería cargada',
    'carga_completada->descargando': 'Inicia proceso de descarga',
    'descargando->entregado': 'Mercadería entregada'
  };

  const key = `${estadoActual}->${estadoNuevo}`;
  return transiciones[key] || `Cambio de ${estadoActual} a ${estadoNuevo}`;
}
