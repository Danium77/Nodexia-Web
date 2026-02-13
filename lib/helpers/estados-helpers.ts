/**
 * Helpers para estados — PUENTE DE COMPATIBILIDAD
 * 
 * ⚠️ Fuente de verdad: lib/estados/config.ts
 *    Este archivo re-exporta lo necesario para que los imports existentes
 *    sigan funcionando sin cambios.
 * 
 * Los nuevos archivos deben importar de '@/lib/estados' directamente.
 */

import {
  ESTADO_DISPLAY,
  ROLES_AUTORIZADOS,
  getEstadoDisplay as getEstadoDisplayNew,
  calcularProgreso,
  puedeActualizar,
  filtrarPorRol,
  type EstadoViajeType,
  type RolInterno,
} from '../estados';

// =====================================================
// BACKWARD-COMPATIBLE TYPES
// =====================================================

// Los tipos antiguos ahora apuntan al nuevo
export type EstadoUnidadViaje = EstadoViajeType;
export type EstadoCargaViaje = EstadoViajeType;

// Re-export RolInterno
export type { RolInterno };

// =====================================================
// MAPEO DE ESTADOS — Derivados de ESTADO_DISPLAY
// =====================================================

/** Color por estado (backward-compatible) */
export const ESTADOS_UNIDAD_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(ESTADO_DISPLAY).map(([k, v]) => [k, v.bgClass])
);

/** Label con emoji por estado (backward-compatible) */
export const ESTADOS_UNIDAD_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(ESTADO_DISPLAY).map(([k, v]) => [k, `${v.emoji} ${v.label}`])
);

// Los mapas de carga eran un espejo del de unidad — ahora son iguales
export const ESTADOS_CARGA_COLORS = ESTADOS_UNIDAD_COLORS;
export const ESTADOS_CARGA_LABELS = ESTADOS_UNIDAD_LABELS;

// =====================================================
// VALIDACIÓN DE ROLES POR ESTADO
// =====================================================

export const ROLES_AUTORIZADOS_UNIDAD = ROLES_AUTORIZADOS;
export const ROLES_AUTORIZADOS_CARGA = ROLES_AUTORIZADOS;

export function puedeActualizarEstadoUnidad(rol: RolInterno, estado: string): boolean {
  return puedeActualizar(rol, estado as EstadoViajeType);
}

export function puedeActualizarEstadoCarga(rol: RolInterno, estado: string): boolean {
  return puedeActualizar(rol, estado as EstadoViajeType);
}

export function filtrarEstadosUnidadPorRol(rol: RolInterno, estados: string[]): string[] {
  return filtrarPorRol(rol, estados as EstadoViajeType[]);
}

export function filtrarEstadosCargaPorRol(rol: RolInterno, estados: string[]): string[] {
  return filtrarPorRol(rol, estados as EstadoViajeType[]);
}

export function esEstadoAutomatico(_tipo: 'unidad' | 'carga', estado: string): boolean {
  const aut = ROLES_AUTORIZADOS[estado as EstadoViajeType];
  return aut === 'AUTOMATIC';
}

// =====================================================
// COLOR/LABEL GETTERS
// =====================================================

export function getColorEstadoUnidad(estado: string): string {
  return ESTADOS_UNIDAD_COLORS[estado] || 'bg-gray-400';
}

export function getLabelEstadoUnidad(estado: string): string {
  return ESTADOS_UNIDAD_LABELS[estado] || estado;
}

export function getColorEstadoCarga(estado: string): string {
  return ESTADOS_CARGA_COLORS[estado] || 'bg-gray-400';
}

export function getLabelEstadoCarga(estado: string): string {
  return ESTADOS_CARGA_LABELS[estado] || estado;
}

// =====================================================
// DISPLAY UNIVERSAL — Badge unificado
// =====================================================

/**
 * Mapa universal de display — derivado de ESTADO_DISPLAY + legacy fallbacks
 */
export const ESTADO_VIAJE_DISPLAY: Record<string, { label: string; bgClass: string; textClass: string }> = Object.fromEntries(
  Object.entries(ESTADO_DISPLAY).map(([k, v]) => [k, { label: `${v.emoji} ${v.label}`, bgClass: v.bgClass, textClass: v.textClass }])
);

/**
 * Obtiene label + clases CSS para cualquier valor de estado.
 */
export function getEstadoDisplay(estado: string): { label: string; bgClass: string; textClass: string } {
  const d = getEstadoDisplayNew(estado);
  return { label: `${d.emoji} ${d.label}`, bgClass: d.bgClass, textClass: d.textClass };
}

/**
 * Calcula progreso del viaje (0-100) — backward compatible
 */
export function calcularProgresoViaje(estadoUnidad: string): number {
  return calcularProgreso(estadoUnidad as EstadoViajeType);
}
