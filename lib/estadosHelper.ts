/**
 * ⚠️ DEPRECATED — NO USAR EN CÓDIGO NUEVO
 * 
 * Importar desde '@/lib/estados' directamente:
 *   import { calcularEstadoOperativo, getColorEstadoOperativo, ... } from '@/lib/estados';
 *   import { esEstadoEnMovimiento, esEstadoFinal, ... } from '@/lib/estados';
 * 
 * Este archivo solo existe por backward-compatibility.
 * Todos los importadores existentes ya fueron migrados (13-Feb-2026).
 * Para eliminar: verificar que ningún import lo referencia y borrar.
 */

// Re-exportar todo desde la fuente de verdad
export {
  EstadoViaje,
  ESTADOS_ASIGNACION as ESTADOS_FASE_ASIGNACION,
  ESTADOS_EN_MOVIMIENTO,
  ESTADOS_EN_PLANTA,
  ESTADOS_FINALES,
  VENTANA_TOLERANCIA_HORAS,
  calcularMinutosRetraso,
  esEstadoAsignacion as estaEnAsignacion,
  esEstadoEnPlanta as estaEnPlanta,
  esEstadoEnMovimiento as estaEnMovimiento,
  esEstadoFinal as esFinal,
  calcularTab,
  type TabDespacho,
  type DatosParaTab,
} from './estados';

// Re-export operativo functions
export {
  calcularEstadoOperativo,
  getColorEstadoOperativo,
  getIconoEstadoOperativo,
  getLabelEstadoOperativo,
  tieneRecursosAsignados,
  estaDentroVentana,
  type EstadoOperativo,
  type DatosViaje,
  type ResultadoEstadoOperativo,
} from './estados';

// Backward-compatible aliases
export { ESTADOS_EN_MOVIMIENTO as ESTADOS_CARGA_EN_PROGRESO } from './estados';
export { ESTADOS_ASIGNACION as ESTADOS_CARGA_PENDIENTES } from './estados';
export { ESTADOS_FINALES as ESTADOS_CARGA_FINALES } from './estados';

// Backward-compatible function aliases
export { esEstadoEnMovimiento as estaEnProgreso } from './estados';
export { esEstadoAsignacion as estaPendiente } from './estados';
