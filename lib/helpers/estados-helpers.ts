/**
 * Helpers para validación de estados y transiciones
 * Incluye mapeo de colores, labels y lógica de negocio
 */

import type { EstadoUnidadViaje, EstadoCargaViaje, RolInterno } from '../types';

// =====================================================
// MAPEO DE ESTADOS UNIDAD - Colores y Labels
// =====================================================

export const ESTADOS_UNIDAD_COLORS: Record<EstadoUnidadViaje, string> = {
  camion_asignado: 'bg-blue-500',
  confirmado_chofer: 'bg-blue-600',
  en_transito_origen: 'bg-indigo-500',
  arribo_origen: 'bg-indigo-500',
  ingresado_origen: 'bg-indigo-600',
  en_playa_origen: 'bg-yellow-500',
  llamado_carga: 'bg-yellow-600',
  cargando: 'bg-orange-500',
  cargado: 'bg-purple-500',
  egreso_origen: 'bg-purple-600',
  en_transito_destino: 'bg-teal-500',
  arribo_destino: 'bg-teal-500',
  arribado_destino: 'bg-teal-600',
  ingresado_destino: 'bg-teal-700',
  llamado_descarga: 'bg-cyan-500',
  descargando: 'bg-cyan-600',
  descargado: 'bg-emerald-500',
  egreso_destino: 'bg-emerald-600',
  vacio: 'bg-indigo-500',
  viaje_completado: 'bg-green-700',
  disponible: 'bg-green-800',
  cancelado: 'bg-red-600',
  expirado: 'bg-gray-600',
  incidencia: 'bg-orange-600',
};

export const ESTADOS_UNIDAD_LABELS: Record<EstadoUnidadViaje, string> = {
  camion_asignado: '📋 Camión asignado',
  confirmado_chofer: '✅ Chofer confirmado',
  en_transito_origen: '🚚 En tránsito a planta',
  arribo_origen: '📍 Arribó a planta',
  ingresado_origen: '📍 Ingresado a planta',
  en_playa_origen: '⏸️ En playa de espera',
  llamado_carga: '📢 Llamado a carga',
  cargando: '⚙️ Cargando',
  cargado: '📦 Cargado',
  egreso_origen: '🚪 Egresando de planta',
  en_transito_destino: '🚛 En tránsito a destino',
  arribo_destino: '📍 Arribó a destino',
  arribado_destino: '📍 Arribó a destino',
  ingresado_destino: '🏁 Ingresado a destino',
  llamado_descarga: '📢 Llamado a descarga',
  descargando: '📤 Descargando',
  descargado: '✅ Descargado',
  egreso_destino: '🚪 Egresando de destino',
  vacio: '⚪ Vacío',
  viaje_completado: '🏆 Viaje completado',
  disponible: '🎉 Disponible',
  cancelado: '❌ Cancelado',
  expirado: '⏰ Expirado',
  incidencia: '⚠️ Con incidencia',
};

// =====================================================
// MAPEO DE ESTADOS CARGA - Colores y Labels
// =====================================================

export const ESTADOS_CARGA_COLORS: Record<EstadoCargaViaje, string> = {
  pendiente_asignacion: 'bg-gray-400',
  transporte_asignado: 'bg-blue-500',
  camion_asignado: 'bg-blue-600',
  en_transito_origen: 'bg-indigo-500',
  en_playa_origen: 'bg-yellow-400',
  llamado_carga: 'bg-yellow-600',
  cargando: 'bg-orange-600',
  cargado: 'bg-purple-500',
  egresado_origen: 'bg-purple-600',
  en_transito_destino: 'bg-teal-500',
  arribado_destino: 'bg-teal-600',
  llamado_descarga: 'bg-cyan-500',
  descargando: 'bg-cyan-600',
  entregado: 'bg-indigo-500',
  disponible: 'bg-green-600',
  completado: 'bg-green-700',
  cancelado: 'bg-red-600',
  expirado: 'bg-gray-600',
};

export const ESTADOS_CARGA_LABELS: Record<EstadoCargaViaje, string> = {
  pendiente_asignacion: '⏳ Pendiente asignación',
  transporte_asignado: '📋 Transporte asignado',
  camion_asignado: '🚛 Camión asignado',
  en_transito_origen: '🚚 En tránsito a origen',
  en_playa_origen: '⏸️ En playa origen',
  llamado_carga: '📢 Llamado a carga',
  cargando: '⚙️ Cargando',
  cargado: '📦 Cargado',
  egresado_origen: '🚪 Egresado origen',
  en_transito_destino: '🚛 En tránsito a destino',
  arribado_destino: '📍 Arribado destino',
  llamado_descarga: '📢 Llamado a descarga',
  descargando: '📤 Descargando',
  entregado: '✅ Entregado',
  disponible: '🟢 Disponible',
  completado: '🎉 Completado',
  cancelado: '❌ Cancelado',
  expirado: '⏰ Expirado',
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
  camion_asignado: ['coordinador'],
  confirmado_chofer: ['chofer'],
  en_transito_origen: ['chofer'],
  arribo_origen: ['chofer'],
  ingresado_origen: ['control_acceso'],
  en_playa_origen: 'AUTOMATIC',
  llamado_carga: ['supervisor'],
  cargando: ['supervisor'],
  cargado: ['supervisor'],
  egreso_origen: ['control_acceso'],
  en_transito_destino: ['chofer'],
  arribo_destino: ['chofer'],
  arribado_destino: ['chofer'],
  ingresado_destino: ['control_acceso'],
  llamado_descarga: ['supervisor', 'control_acceso'],
  descargando: ['supervisor'],
  descargado: ['supervisor'],
  egreso_destino: ['control_acceso'],
  vacio: 'AUTOMATIC',
  viaje_completado: 'AUTOMATIC',
  disponible: ['coordinador'],
  cancelado: ['coordinador'],
  expirado: 'AUTOMATIC',
  incidencia: ['chofer', 'coordinador'],
};

/**
 * Roles autorizados para actualizar cada estado de carga
 */
export const ROLES_AUTORIZADOS_CARGA: Record<
  EstadoCargaViaje,
  RolInterno[] | 'AUTOMATIC'
> = {
  pendiente_asignacion: ['coordinador'],
  transporte_asignado: ['coordinador'],
  camion_asignado: ['coordinador'],
  en_transito_origen: 'AUTOMATIC',
  en_playa_origen: 'AUTOMATIC',
  llamado_carga: ['supervisor'],
  cargando: ['supervisor'],
  cargado: ['supervisor'],
  egresado_origen: ['control_acceso'],
  en_transito_destino: 'AUTOMATIC',
  arribado_destino: 'AUTOMATIC',
  llamado_descarga: ['supervisor'],
  descargando: ['supervisor'],
  entregado: ['supervisor'],
  disponible: 'AUTOMATIC',
  completado: ['supervisor', 'coordinador'],
  cancelado: ['coordinador'],
  expirado: 'AUTOMATIC',
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
    camion_asignado: 5,
    confirmado_chofer: 10,
    en_transito_origen: 15,
    arribo_origen: 20,
    ingresado_origen: 25,
    en_playa_origen: 30,
    llamado_carga: 35,
    cargando: 40,
    cargado: 50,
    egreso_origen: 55,
    en_transito_destino: 60,
    arribo_destino: 70,
    arribado_destino: 70,
    ingresado_destino: 75,
    llamado_descarga: 80,
    descargando: 85,
    descargado: 90,
    egreso_destino: 93,
    vacio: 95,
    viaje_completado: 100,
    disponible: 100,
    cancelado: 0,
    expirado: 0,
    incidencia: 50,
  };

  return progresoUnidad[estadoUnidad] || 0;
}
