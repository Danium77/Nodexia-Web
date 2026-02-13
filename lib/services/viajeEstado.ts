/**
 * ============================================================================
 * ViajeEstadoService — Transiciones de estado + sincronización despacho
 * ============================================================================
 *
 * FUENTE DE VERDAD para estados: lib/estados/config.ts
 *
 * Este servicio centraliza:
 *   1. Validación de transiciones (delega a lib/estados)
 *   2. Actualización de viaje
 *   3. Sincronización 1:1 despacho ← estado viaje
 *   4. Próximos estados disponibles
 *
 * Usado por:
 *   - pages/api/viajes/[id]/estado-unidad.ts
 *   - pages/api/viajes/actualizar-estado.ts  (LEGACY — migrar)
 *   - pages/api/transporte/asignar-unidad.ts
 *   - pages/api/control-acceso/confirmar-accion.ts
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  validarTransicion,
  getProximosEstados,
  esEstadoFinal,
  type EstadoViajeType,
} from '../estados';

// ============================================================================
// Tipos del servicio
// ============================================================================

export interface CambioEstadoInput {
  viaje_id: string;
  nuevo_estado: EstadoViajeType;
  user_id: string;
  observaciones?: string;
}

export interface AsignarUnidadInput {
  viaje_id: string;
  despacho_id?: string;
  chofer_id: string;
  camion_id: string;
  acoplado_id?: string;
  user_id: string;
  unidad_nombre?: string;
  pedido_id?: string;
}

export interface CambioEstadoResult {
  exitoso: boolean;
  mensaje: string;
  estado_anterior?: EstadoViajeType;
  estado_nuevo?: EstadoViajeType;
  proximos_estados?: EstadoViajeType[];
  data?: Record<string, unknown>;
}

// Estados que no permiten asignación de unidad
const ESTADOS_BLOQUEO_ASIGNACION: EstadoViajeType[] = [
  'completado',
  'cancelado',
];

// ============================================================================
// Mapeo: estado → columna de timestamp en estado_unidad_viaje
// ============================================================================
// La tabla estado_unidad_viaje tiene una columna timestamp por cada fase.
// Los nombres de las columnas corresponden a la migración 011 original.

const ESTADO_A_TIMESTAMP: Partial<Record<EstadoViajeType, string>> = {
  transporte_asignado: 'fecha_asignacion',
  camion_asignado: 'fecha_asignacion',
  confirmado_chofer: 'fecha_confirmacion_chofer',
  en_transito_origen: 'fecha_inicio_transito_origen',
  ingresado_origen: 'fecha_ingreso_planta',
  llamado_carga: 'fecha_ingreso_playa',
  cargando: 'fecha_inicio_proceso_carga',
  cargado: 'fecha_cargado',
  egreso_origen: 'fecha_egreso_planta',
  en_transito_destino: 'fecha_inicio_transito_destino',
  ingresado_destino: 'fecha_ingreso_destino',
  llamado_descarga: 'fecha_llamado_descarga',
  descargando: 'fecha_inicio_descarga',
  descargado: 'fecha_vacio',
  egreso_destino: 'fecha_egreso_destino',
  completado: 'fecha_viaje_completado',
  cancelado: 'fecha_cancelacion',
};

// ============================================================================
// Funciones del servicio
// ============================================================================

/**
 * Cambia el estado de un viaje con validación completa.
 * Sincroniza automáticamente el despacho asociado (1:1).
 */
export async function cambiarEstadoViaje(
  supabase: SupabaseClient,
  input: CambioEstadoInput
): Promise<CambioEstadoResult> {
  const { viaje_id, nuevo_estado, user_id, observaciones } = input;

  // 1. Obtener viaje actual
  const { data: viaje, error: fetchError } = await supabase
    .from('viajes_despacho')
    .select('id, estado, estado_unidad, chofer_id, camion_id, despacho_id')
    .eq('id', viaje_id)
    .single();

  if (fetchError || !viaje) {
    return { exitoso: false, mensaje: 'Viaje no encontrado' };
  }

  // Prefer estado (canonical) over estado_unidad (legacy sync)
  const estadoAnterior = (viaje.estado || viaje.estado_unidad) as EstadoViajeType;

  // 2. Validar transición
  const resultado = validarTransicion(estadoAnterior, nuevo_estado);
  if (!resultado.valido) {
    return {
      exitoso: false,
      mensaje: resultado.mensaje || `Transición inválida: ${estadoAnterior} → ${nuevo_estado}`,
      estado_anterior: estadoAnterior,
      estado_nuevo: nuevo_estado,
    };
  }

  // 3. Actualizar viaje
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('viajes_despacho')
    .update({
      estado: nuevo_estado,
      estado_unidad: nuevo_estado,
      updated_at: now,
    })
    .eq('id', viaje_id);

  if (updateError) {
    return {
      exitoso: false,
      mensaje: `Error al actualizar: ${updateError.message}`,
    };
  }

  console.log(`✅ Viaje ${viaje_id}: ${estadoAnterior} → ${nuevo_estado} (por ${user_id})`);

  // 4. Sincronizar despacho (1:1)
  await sincronizarDespacho(supabase, viaje.despacho_id, nuevo_estado);

  // 5. Registrar timestamp en estado_unidad_viaje
  await registrarTimestampEstado(supabase, viaje_id, nuevo_estado, now);

  // 6. Sincronizar estado_carga_viaje (si aplica)
  await sincronizarEstadoCarga(supabase, viaje_id, nuevo_estado, now);

  // 7. Próximos estados
  const proximos = getProximosEstados(nuevo_estado);

  return {
    exitoso: true,
    mensaje: `Estado actualizado: ${estadoAnterior} → ${nuevo_estado}`,
    estado_anterior: estadoAnterior,
    estado_nuevo: nuevo_estado,
    proximos_estados: proximos,
  };
}

/**
 * Asigna unidad operativa (chofer + camión + acoplado) a un viaje.
 * Determina automáticamente el nuevo estado.
 */
export async function asignarUnidad(
  supabase: SupabaseClient,
  input: AsignarUnidadInput
): Promise<CambioEstadoResult> {
  const {
    viaje_id, despacho_id, chofer_id, camion_id,
    acoplado_id, user_id, unidad_nombre, pedido_id
  } = input;

  // 1. Verificar viaje
  const { data: viaje, error: viajeError } = await supabase
    .from('viajes_despacho')
    .select('id, estado, despacho_id')
    .eq('id', viaje_id)
    .single();

  if (viajeError || !viaje) {
    return { exitoso: false, mensaje: 'Viaje no encontrado' };
  }

  // 2. Validar que no esté bloqueado
  if (ESTADOS_BLOQUEO_ASIGNACION.includes(viaje.estado as EstadoViajeType)) {
    return {
      exitoso: false,
      mensaje: `No se puede asignar unidad a un viaje en estado: ${viaje.estado}`,
    };
  }

  // 3. Determinar nuevo estado
  const nuevoEstado: EstadoViajeType =
    chofer_id && camion_id ? 'camion_asignado' : 'transporte_asignado';

  // 4. Actualizar viaje
  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    chofer_id,
    camion_id,
    estado: nuevoEstado,
    estado_unidad: nuevoEstado,
    updated_at: now,
  };
  if (acoplado_id) updateData.acoplado_id = acoplado_id;

  const { error: updateError } = await supabase
    .from('viajes_despacho')
    .update(updateData)
    .eq('id', viaje_id);

  if (updateError) {
    return { exitoso: false, mensaje: `Error al asignar: ${updateError.message}` };
  }

  console.log(`✅ Viaje ${viaje_id}: unidad asignada → ${nuevoEstado}`);

  // 5. Sincronizar despacho
  const despachoIdFinal = despacho_id || viaje.despacho_id;
  await sincronizarDespacho(supabase, despachoIdFinal, nuevoEstado);

  // 6. Registrar historial
  if (despachoIdFinal) {
    await supabase
      .from('historial_despachos')
      .insert({
        despacho_id: despachoIdFinal,
        viaje_id,
        accion: 'unidad_asignada',
        descripcion: unidad_nombre
          ? `Unidad operativa asignada: ${unidad_nombre}`
          : 'Unidad operativa asignada (chofer + camión)',
        metadata: { chofer_id, camion_id, acoplado_id: acoplado_id || null },
      })
      .then(({ error }) => {
        if (error) console.error('⚠️ Error registrando historial:', error);
      });
  }

  return {
    exitoso: true,
    mensaje: 'Unidad operativa asignada correctamente',
    estado_nuevo: nuevoEstado,
    proximos_estados: getProximosEstados(nuevoEstado),
    data: { viaje_id, despacho_id: despachoIdFinal },
  };
}

/**
 * Verifica que el user_id corresponde al chofer asignado al viaje.
 * Retorna el chofer_id si es válido, o null.
 */
export async function verificarChoferViaje(
  supabase: SupabaseClient,
  user_id: string,
  viaje_id: string
): Promise<{ valido: boolean; chofer_id?: string; mensaje?: string }> {
  const { data: chofer } = await supabase
    .from('choferes')
    .select('id')
    .eq('usuario_id', user_id)
    .single();

  if (!chofer) {
    return { valido: false, mensaje: 'Chofer no encontrado' };
  }

  const { data: viaje } = await supabase
    .from('viajes_despacho')
    .select('id, chofer_id')
    .eq('id', viaje_id)
    .single();

  if (!viaje || viaje.chofer_id !== chofer.id) {
    return { valido: false, mensaje: 'No autorizado para este viaje' };
  }

  return { valido: true, chofer_id: chofer.id };
}

// ============================================================================
// Función interna: sincronizar estado_carga_viaje
// ============================================================================

/**
 * Estados que corresponden a operaciones de carga/descarga.
 * Cuando el viaje pasa a uno de estos estados, se sincroniza la tabla
 * estado_carga_viaje.estado_carga automáticamente.
 */
const ESTADOS_CON_CARGA: Set<EstadoViajeType> = new Set([
  'ingresado_origen',
  'llamado_carga',
  'cargando',
  'cargado',
  'egreso_origen',
  'en_transito_destino',
  'ingresado_destino',
  'llamado_descarga',
  'descargando',
  'descargado',
  'egreso_destino',
  'completado',
  'cancelado',
]);

/** Mapeo de estado viaje → columna timestamp en estado_carga_viaje */
const ESTADO_A_TIMESTAMP_CARGA: Partial<Record<EstadoViajeType, string>> = {
  llamado_carga: 'fecha_llamado_carga',
  cargando: 'fecha_cargando',
  cargado: 'fecha_cargado',
  llamado_descarga: 'fecha_iniciando_descarga',
  descargando: 'fecha_descargando',
  descargado: 'fecha_descargado',
  completado: 'fecha_completado',
  cancelado: 'fecha_cancelacion',
};

/**
 * Sincroniza estado_carga_viaje cuando el estado del viaje cambia.
 * No bloquea el flujo si falla (logging only).
 */
async function sincronizarEstadoCarga(
  supabase: SupabaseClient,
  viaje_id: string,
  nuevo_estado: EstadoViajeType,
  timestamp: string
): Promise<void> {
  if (!ESTADOS_CON_CARGA.has(nuevo_estado)) return;

  try {
    const updateData: Record<string, unknown> = {
      estado_carga: nuevo_estado,
      updated_at: timestamp,
    };

    // Agregar timestamp específico si aplica
    const columnaTs = ESTADO_A_TIMESTAMP_CARGA[nuevo_estado];
    if (columnaTs) {
      updateData[columnaTs] = timestamp;
    }

    // Cancelación: agregar motivo
    if (nuevo_estado === 'cancelado') {
      updateData.motivo_cancelacion = 'Viaje cancelado';
    }

    const { error } = await supabase
      .from('estado_carga_viaje')
      .upsert(
        { viaje_id, ...updateData },
        { onConflict: 'viaje_id' }
      );

    if (error) {
      console.error(`⚠️ Error sincronizando estado_carga_viaje:`, error.message);
    } else {
      console.log(`📦 estado_carga_viaje ${viaje_id}: estado_carga → ${nuevo_estado}`);
    }
  } catch (err) {
    console.error(`⚠️ Error en sincronizarEstadoCarga:`, err);
  }
}

// ============================================================================
// Función interna: sincronizar despacho (1:1)
// ============================================================================

async function sincronizarDespacho(
  supabase: SupabaseClient,
  despacho_id: string | null | undefined,
  nuevo_estado: EstadoViajeType
): Promise<void> {
  if (!despacho_id) return;

  try {
    const { error } = await supabase
      .from('despachos')
      .update({
        estado: nuevo_estado,
        updated_at: new Date().toISOString(),
      })
      .eq('id', despacho_id);

    if (error) {
      console.error(`⚠️ Error sincronizando despacho ${despacho_id}:`, error);
    } else {
      console.log(`📊 Despacho ${despacho_id}: estado → ${nuevo_estado}`);
    }
  } catch (err) {
    console.error(`⚠️ Error sincronizando despacho ${despacho_id}:`, err);
  }
}

// ============================================================================
// Función interna: registrar timestamp en estado_unidad_viaje
// ============================================================================

/**
 * Upsert en estado_unidad_viaje: actualiza estado_unidad + timestamp de la fase.
 * No bloquea el cambio de estado si falla (logging only).
 */
async function registrarTimestampEstado(
  supabase: SupabaseClient,
  viaje_id: string,
  nuevo_estado: EstadoViajeType,
  timestamp: string
): Promise<void> {
  const columnaTimestamp = ESTADO_A_TIMESTAMP[nuevo_estado];
  if (!columnaTimestamp) return; // pendiente no tiene timestamp (usa fecha_creacion DEFAULT)

  try {
    // Construir datos del upsert
    const updateData: Record<string, unknown> = {
      estado_unidad: nuevo_estado,
      updated_at: timestamp,
      [columnaTimestamp]: timestamp,
    };

    // Intentar upsert (INSERT o UPDATE si ya existe)
    const { error } = await supabase
      .from('estado_unidad_viaje')
      .upsert(
        {
          viaje_id,
          ...updateData,
        },
        { onConflict: 'viaje_id' }
      );

    if (error) {
      console.error(`⚠️ Error registrando timestamp ${columnaTimestamp}:`, error.message);
    } else {
      console.log(`📋 estado_unidad_viaje ${viaje_id}: ${columnaTimestamp} = ${timestamp}`);
    }
  } catch (err) {
    console.error(`⚠️ Error en registrarTimestampEstado:`, err);
  }
}
