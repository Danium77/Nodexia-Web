/**
 * ============================================================================
 * NotificacionService — Envío de notificaciones internas
 * ============================================================================
 *
 * Centraliza la creación de notificaciones para chofer y otros roles.
 * Elimina duplicación en confirmar-accion.ts, iniciar-carga.ts, etc.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { EstadoViajeType } from '../estados';

// ============================================================================
// Tipos
// ============================================================================

export type TipoNotificacion =
  | 'viaje_asignado'
  | 'llamado_carga'
  | 'viaje_cancelado'
  | 'incidencia_reportada'
  | 'demora_detectada'
  | 'documentacion_rechazada'
  | 'viaje_completado'
  | 'ingreso_confirmado'
  | 'egreso_confirmado'
  | 'cambio_estado'
  | 'otro';

export interface NotificacionInput {
  viaje_id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  datos_adicionales?: Record<string, unknown>;
}

// ============================================================================
// Plantillas de mensajes por tipo de cambio de estado
// ============================================================================

const MENSAJES_ESTADO: Partial<Record<EstadoViajeType, { titulo: string; mensaje: string }>> = {
  ingresado_origen: {
    titulo: 'Ingreso registrado',
    mensaje: 'Tu ingreso a la planta de origen ha sido registrado. Aguardá el llamado a carga.',
  },
  llamado_carga: {
    titulo: 'Llamado a carga',
    mensaje: 'Dirigite a la posición de carga asignada.',
  },
  cargado: {
    titulo: 'Carga completada',
    mensaje: 'La carga fue completada. Aguardá la autorización de egreso.',
  },
  egreso_origen: {
    titulo: 'Egreso autorizado',
    mensaje: 'Egreso de planta autorizado. Iniciá el viaje hacia el destino.',
  },
  ingresado_destino: {
    titulo: 'Ingreso a destino',
    mensaje: 'Tu ingreso al destino ha sido registrado. Aguardá el llamado a descarga.',
  },
  llamado_descarga: {
    titulo: 'Llamado a descarga',
    mensaje: 'Dirigite a la posición de descarga asignada.',
  },
  descargado: {
    titulo: 'Descarga completada',
    mensaje: 'La descarga fue completada. Aguardá la autorización de egreso.',
  },
  egreso_destino: {
    titulo: 'Egreso de destino',
    mensaje: 'Egreso de destino autorizado.',
  },
  completado: {
    titulo: 'Viaje completado',
    mensaje: '¡Viaje completado exitosamente! Buen trabajo.',
  },
  cancelado: {
    titulo: 'Viaje cancelado',
    mensaje: 'El viaje ha sido cancelado.',
  },
};

// ============================================================================
// Funciones del servicio
// ============================================================================

/**
 * Envía una notificación al chofer de un viaje cuando cambia el estado.
 * Busca automáticamente el user_id del chofer.
 */
export async function notificarCambioEstado(
  supabase: SupabaseClient,
  viaje_id: string,
  nuevo_estado: EstadoViajeType
): Promise<void> {
  const plantilla = MENSAJES_ESTADO[nuevo_estado];
  if (!plantilla) return; // No todos los estados necesitan notificación

  try {
    // Buscar el user_id del chofer asignado al viaje
    const user_id = await obtenerUserIdChofer(supabase, viaje_id);
    if (!user_id) return;

    await crearNotificacion(supabase, {
      user_id,
      viaje_id,
      tipo: mapearTipoNotificacion(nuevo_estado),
      titulo: plantilla.titulo,
      mensaje: plantilla.mensaje,
    });
  } catch (err) {
    console.error(`⚠️ Error notificando cambio estado ${nuevo_estado}:`, err);
  }
}

/**
 * Envía una notificación personalizada a un usuario específico.
 */
export async function notificarUsuario(
  supabase: SupabaseClient,
  user_id: string,
  input: NotificacionInput
): Promise<void> {
  try {
    await crearNotificacion(supabase, {
      user_id,
      viaje_id: input.viaje_id,
      tipo: input.tipo,
      titulo: input.titulo,
      mensaje: input.mensaje,
      datos_adicionales: input.datos_adicionales,
    });
  } catch (err) {
    console.error(`⚠️ Error notificando usuario ${user_id}:`, err);
  }
}

// ============================================================================
// Funciones internas
// ============================================================================

async function obtenerUserIdChofer(
  supabase: SupabaseClient,
  viaje_id: string
): Promise<string | null> {
  const { data: viaje } = await supabase
    .from('viajes_despacho')
    .select('chofer_id')
    .eq('id', viaje_id)
    .single();

  if (!viaje?.chofer_id) return null;

  const { data: chofer } = await supabase
    .from('choferes')
    .select('usuario_id')
    .eq('id', viaje.chofer_id)
    .single();

  return chofer?.usuario_id || null;
}

async function crearNotificacion(
  supabase: SupabaseClient,
  data: {
    user_id: string;
    viaje_id: string;
    tipo: TipoNotificacion;
    titulo: string;
    mensaje: string;
    datos_adicionales?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase.from('notificaciones').insert({
    user_id: data.user_id,
    viaje_id: data.viaje_id,
    tipo: data.tipo,
    titulo: data.titulo,
    mensaje: data.mensaje,
    datos_adicionales: data.datos_adicionales || {},
    leida: false,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error(`⚠️ Error inserting notification:`, error);
  }
}

function mapearTipoNotificacion(estado: EstadoViajeType): TipoNotificacion {
  switch (estado) {
    case 'llamado_carga':
      return 'llamado_carga';
    case 'completado':
      return 'viaje_completado';
    case 'cancelado':
      return 'viaje_cancelado';
    default:
      return 'cambio_estado';
  }
}
