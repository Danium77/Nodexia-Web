/**
 * Helpers para validación de estados y transiciones
 * Incluye mapeo de colores, labels y lógica de negocio
 */

import type { EstadoUnidadViaje, EstadoCargaViaje, RolInterno } from '../types';

// =====================================================
// MAPEO DE ESTADOS UNIDAD - Colores y Labels
// =====================================================

export const ESTADOS_UNIDAD_COLORS: Record<EstadoUnidadViaje, string> = {
  pendiente: 'bg-gray-400',
  asignado: 'bg-blue-500',
  confirmado_chofer: 'bg-blue-600',
  en_transito_origen: 'bg-indigo-500',
  arribado_origen: 'bg-indigo-600',
  en_playa_espera: 'bg-yellow-500',
  llamado_carga: 'bg-yellow-600',
  posicionado_carga: 'bg-orange-500',
  carga_completada: 'bg-purple-500',
  saliendo_origen: 'bg-purple-600',
  en_transito_destino: 'bg-teal-500',
  arribado_destino: 'bg-teal-600',
  descarga_completada: 'bg-cyan-600',
  viaje_completado: 'bg-green-800',
  en_incidencia: 'bg-orange-600',
  cancelado: 'bg-red-600',
};

export const ESTADOS_UNIDAD_LABELS: Record<EstadoUnidadViaje, string> = {
  pendiente: '⏳ Pendiente',
  asignado: '📋 Asignado',
  confirmado_chofer: '✅ Confirmado',
  en_transito_origen: '🚚 En tránsito a planta',
  arribado_origen: '📍 Arribó a planta',
  en_playa_espera: '⏸️ En playa de espera',
  llamado_carga: '📢 Llamado a carga',
  posicionado_carga: '🎯 Posicionado',
  carga_completada: '✅ Carga completa',
  saliendo_origen: '🚪 Saliendo de planta',
  en_transito_destino: '🚛 En tránsito a destino',
  arribado_destino: '📍 Arribó a destino',
  descarga_completada: '✅ Descarga completa',
  viaje_completado: '🎉 Completado',
  en_incidencia: '⚠️ Con incidencia',
  cancelado: '❌ Cancelado',
};

// =====================================================
// MAPEO DE ESTADOS CARGA - Colores y Labels
// =====================================================

export const ESTADOS_CARGA_COLORS: Record<EstadoCargaViaje, string> = {
  pendiente: 'bg-gray-400',
  planificado: 'bg-blue-500',
  documentacion_preparada: 'bg-blue-600',
  en_proceso_carga: 'bg-orange-600',
  cargado: 'bg-purple-500',
  documentacion_validada: 'bg-purple-600',
  en_transito: 'bg-teal-500',
  en_proceso_descarga: 'bg-cyan-600',
  descargado: 'bg-indigo-500',
  documentacion_cierre: 'bg-green-600',
  completado: 'bg-green-700',
  con_faltante: 'bg-amber-600',
  con_rechazo: 'bg-red-500',
  cancelado_sin_carga: 'bg-red-600',
};

export const ESTADOS_CARGA_LABELS: Record<EstadoCargaViaje, string> = {
  pendiente: '⏳ Pendiente',
  planificado: '📋 Planificado',
  documentacion_preparada: '📄 Docs preparados',
  en_proceso_carga: '⚙️ En proceso de carga',
  cargado: '📦 Cargado',
  documentacion_validada: '📝 Docs validados',
  en_transito: '🚛 En tránsito',
  en_proceso_descarga: '📤 En proceso descarga',
  descargado: '✅ Descargado',
  documentacion_cierre: '📝 Docs de cierre',
  completado: '🎉 Completado',
  con_faltante: '⚠️ Con faltante',
  con_rechazo: '❌ Con rechazo',
  cancelado_sin_carga: '❌ Cancelado',
};

// =====================================================
// VALIDACIÓN DE ROLES POR ESTADO
// =====================================================

/**
 * Roles autorizados para actualizar cada estado de unidad
 */
export const ROLES_AUTORIZADOS_UNIDAD: Record<
  EstadoUnidadViaje,
  RolInterno[] | 'AUTOMATIC'
> = {
  pendiente: ['coordinador'],
  asignado: ['coordinador'],
  confirmado_chofer: ['chofer'],
  en_transito_origen: ['chofer'],
  arribado_origen: ['chofer'],
  en_playa_espera: 'AUTOMATIC',
  llamado_carga: ['supervisor'],
  posicionado_carga: ['supervisor'],
  carga_completada: 'AUTOMATIC',
  saliendo_origen: ['control_acceso'],
  en_transito_destino: ['chofer'],
  arribado_destino: ['chofer'],
  descarga_completada: 'AUTOMATIC',
  viaje_completado: ['chofer', 'coordinador'],
  en_incidencia: ['chofer', 'coordinador'],
  cancelado: ['coordinador'],
};

/**
 * Roles autorizados para actualizar cada estado de carga
 */
export const ROLES_AUTORIZADOS_CARGA: Record<
  EstadoCargaViaje,
  RolInterno[] | 'AUTOMATIC'
> = {
  pendiente: ['coordinador'],
  planificado: ['coordinador', 'supervisor'],
  documentacion_preparada: 'AUTOMATIC',
  en_proceso_carga: ['supervisor'],
  cargado: ['supervisor'],
  documentacion_validada: ['control_acceso'],
  en_transito: 'AUTOMATIC',
  en_proceso_descarga: ['supervisor'],
  descargado: ['supervisor'],
  documentacion_cierre: ['supervisor', 'control_acceso'],
  completado: ['supervisor', 'coordinador'],
  con_faltante: ['supervisor'],
  con_rechazo: ['supervisor'],
  cancelado_sin_carga: ['coordinador'],
};

// =====================================================
// HELPERS DE VALIDACIÓN
// =====================================================

/**
 * Verifica si un rol puede actualizar un estado de unidad
 */
export function puedeActualizarEstadoUnidad(
  rol: RolInterno,
  estado: EstadoUnidadViaje
): boolean {
  const rolesAutorizados = ROLES_AUTORIZADOS_UNIDAD[estado];

  if (rolesAutorizados === 'AUTOMATIC') {
    return false; // Estados automáticos no se pueden actualizar manualmente
  }

  return rolesAutorizados.includes(rol);
}

/**
 * Verifica si un rol puede actualizar un estado de carga
 */
export function puedeActualizarEstadoCarga(
  rol: RolInterno,
  estado: EstadoCargaViaje
): boolean {
  const rolesAutorizados = ROLES_AUTORIZADOS_CARGA[estado];

  if (rolesAutorizados === 'AUTOMATIC') {
    return false; // Estados automáticos no se pueden actualizar manualmente
  }

  return rolesAutorizados.includes(rol);
}

/**
 * Filtra estados de unidad que el rol puede actualizar
 */
export function filtrarEstadosUnidadPorRol(
  rol: RolInterno,
  estados: EstadoUnidadViaje[]
): EstadoUnidadViaje[] {
  return estados.filter((estado) => puedeActualizarEstadoUnidad(rol, estado));
}

/**
 * Filtra estados de carga que el rol puede actualizar
 */
export function filtrarEstadosCargaPorRol(
  rol: RolInterno,
  estados: EstadoCargaViaje[]
): EstadoCargaViaje[] {
  return estados.filter((estado) => puedeActualizarEstadoCarga(rol, estado));
}

/**
 * Identifica si un estado es automático
 */
export function esEstadoAutomatico(
  tipo: 'unidad' | 'carga',
  estado: EstadoUnidadViaje | EstadoCargaViaje
): boolean {
  if (tipo === 'unidad') {
    return ROLES_AUTORIZADOS_UNIDAD[estado as EstadoUnidadViaje] === 'AUTOMATIC';
  }
  return ROLES_AUTORIZADOS_CARGA[estado as EstadoCargaViaje] === 'AUTOMATIC';
}

/**
 * Obtiene el color para un estado de unidad
 */
export function getColorEstadoUnidad(estado: EstadoUnidadViaje): string {
  return ESTADOS_UNIDAD_COLORS[estado] || 'bg-gray-400';
}

/**
 * Obtiene el label para un estado de unidad
 */
export function getLabelEstadoUnidad(estado: EstadoUnidadViaje): string {
  return ESTADOS_UNIDAD_LABELS[estado] || estado;
}

/**
 * Obtiene el color para un estado de carga
 */
export function getColorEstadoCarga(estado: EstadoCargaViaje): string {
  return ESTADOS_CARGA_COLORS[estado] || 'bg-gray-400';
}

/**
 * Obtiene el label para un estado de carga
 */
export function getLabelEstadoCarga(estado: EstadoCargaViaje): string {
  return ESTADOS_CARGA_LABELS[estado] || estado;
}

/**
 * Calcula progreso del viaje (0-100)
 */
export function calcularProgresoViaje(
  estadoUnidad: EstadoUnidadViaje
): number {
  const progresoUnidad: Record<EstadoUnidadViaje, number> = {
    pendiente: 0,
    asignado: 5,
    confirmado_chofer: 10,
    en_transito_origen: 20,
    arribado_origen: 30,
    en_playa_espera: 35,
    llamado_carga: 40,
    posicionado_carga: 45,
    carga_completada: 55,
    saliendo_origen: 60,
    en_transito_destino: 70,
    arribado_destino: 80,
    descarga_completada: 90,
    viaje_completado: 100,
    en_incidencia: 50,
    cancelado: 0,
  };

  return progresoUnidad[estadoUnidad] || 0;
}
