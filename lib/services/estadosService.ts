/**
 * Servicio de Estados — PUENTE DE COMPATIBILIDAD
 * 
 * ⚠️ Fuente de verdad: lib/estados/config.ts
 *    Este archivo re-exporta las funciones de transición y validación
 *    para que los imports existentes sigan funcionando.
 */

import {
  TRANSICIONES_VALIDAS,
  validarTransicion,
  getProximosEstados,
  esEstadoFinal as _esEstadoFinal,
  getEstadoDisplay,
  ESTADO_DISPLAY,
  type EstadoViajeType,
  type ResultadoTransicion,
} from '../estados';

// Re-export tipos para compatibilidad 
export type EstadoUnidadViaje = EstadoViajeType;
export type EstadoCargaViaje = EstadoViajeType;

interface TransicionValidacion {
  valido: boolean;
  mensaje: string;
}

// =====================================================
// TRANSICIONES — Ahora ambas apuntan a la misma tabla
// =====================================================

export const TRANSICIONES_UNIDAD = TRANSICIONES_VALIDAS;
export const TRANSICIONES_CARGA = TRANSICIONES_VALIDAS;

// =====================================================
// VALIDACIÓN
// =====================================================

/**
 * Valida si una transición de estado es permitida (cliente)
 */
export function validarTransicionLocal(
  _tipo: 'unidad' | 'carga',
  estadoActual: string,
  estadoNuevo: string
): TransicionValidacion {
  return validarTransicion(estadoActual, estadoNuevo);
}

/**
 * Obtiene los próximos estados permitidos
 */
export function getProximosEstadosPermitidos(
  _tipo: 'unidad' | 'carga',
  estadoActual: string
): string[] {
  return getProximosEstados(estadoActual);
}

/**
 * Verifica si un estado es final (no tiene transiciones)
 */
export function esEstadoFinal(
  _tipo: 'unidad' | 'carga',
  estado: string
): boolean {
  return _esEstadoFinal(estado);
}

/**
 * Genera descripción de la transición
 */
export function getDescripcionTransicion(
  _tipo: 'unidad' | 'carga',
  estadoActual: string,
  estadoNuevo: string
): string {
  const displayActual = getEstadoDisplay(estadoActual);
  const displayNuevo = getEstadoDisplay(estadoNuevo);
  return `${displayActual.label} → ${displayNuevo.label}`;
}
