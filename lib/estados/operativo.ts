/**
 * ============================================================================
 * ESTADO OPERATIVO — Cálculos de UI para categorización de viajes
 * ============================================================================
 * 
 * Funciones para determinar si un viaje está "activo", "demorado" o "expirado"
 * y helpers de UI (colores, iconos, labels).
 * 
 * Importar desde '@/lib/estados':
 *   import { calcularEstadoOperativo, getColorEstadoOperativo } from '@/lib/estados';
 * 
 * Fecha: 13-Feb-2026
 */

import {
  VENTANA_TOLERANCIA_HORAS,
  esEstadoFinal,
  esEstadoEnPlanta,
  esEstadoEnMovimiento,
} from './config';

// ============================================================================
// Tipos
// ============================================================================

export type EstadoOperativo = 'activo' | 'demorado' | 'expirado';

export interface DatosViaje {
  estado_carga: string;
  estado_unidad?: string | null;
  chofer_id?: string | null;
  camion_id?: string | null;
  scheduled_local_date?: string | null;
  scheduled_local_time?: string | null;
  scheduled_at?: string | null;
}

export interface ResultadoEstadoOperativo {
  estadoOperativo: EstadoOperativo;
  razon: string;
  tieneRecursos: boolean;
  estaDemorado: boolean;
  minutosRetraso: number | null;
}

// ============================================================================
// Funciones de cálculo
// ============================================================================

export function tieneRecursosAsignados(viaje: DatosViaje): boolean {
  return !!(viaje.chofer_id && viaje.camion_id);
}

export function estaDentroVentana(minutosRetraso: number | null): boolean {
  if (minutosRetraso === null) return true;
  return minutosRetraso <= (VENTANA_TOLERANCIA_HORAS * 60);
}

/**
 * Calcula el estado operativo de un viaje para categorización en tabs.
 */
export function calcularEstadoOperativo(viaje: DatosViaje): ResultadoEstadoOperativo {
  const tieneRecursos = tieneRecursosAsignados(viaje);
  const estado = viaje.estado_carga || viaje.estado_unidad || '';

  // Calcular retraso
  let minutosRetraso: number | null = null;
  const ahora = new Date();

  if (viaje.scheduled_at) {
    const fechaProgramada = new Date(viaje.scheduled_at);
    if (ahora > fechaProgramada) {
      minutosRetraso = Math.floor((ahora.getTime() - fechaProgramada.getTime()) / 1000 / 60);
    }
  } else if (viaje.scheduled_local_date) {
    const fechaStr = viaje.scheduled_local_time
      ? `${viaje.scheduled_local_date}T${viaje.scheduled_local_time}:00`
      : `${viaje.scheduled_local_date}T00:00:00`;
    const fechaProgramada = new Date(fechaStr);
    if (ahora > fechaProgramada) {
      minutosRetraso = Math.floor((ahora.getTime() - fechaProgramada.getTime()) / 1000 / 60);
    }
  }

  const dentroVentana = estaDentroVentana(minutosRetraso);

  // 1. FINAL → neutral
  if (esEstadoFinal(estado)) {
    return { estadoOperativo: 'activo', razon: `Estado final: ${estado}`, tieneRecursos, estaDemorado: false, minutosRetraso };
  }

  // 2. EN PLANTA → siempre activo
  if (esEstadoEnPlanta(estado)) {
    return { estadoOperativo: 'activo', razon: `En planta (${estado})`, tieneRecursos: true, estaDemorado: false, minutosRetraso };
  }

  // 3. EN MOVIMIENTO → activo/demorado
  if (esEstadoEnMovimiento(estado)) {
    return {
      estadoOperativo: dentroVentana ? 'activo' : 'demorado',
      razon: dentroVentana ? `En curso (${estado})` : `Demorado ${minutosRetraso} min (${estado})`,
      tieneRecursos: true, estaDemorado: !dentroVentana, minutosRetraso,
    };
  }

  // 4. EN ASIGNACIÓN
  if (tieneRecursos) {
    return {
      estadoOperativo: dentroVentana ? 'activo' : 'demorado',
      razon: dentroVentana ? `Asignado (${estado})` : `Demorado ${minutosRetraso} min (${estado})`,
      tieneRecursos: true, estaDemorado: !dentroVentana, minutosRetraso,
    };
  }

  return {
    estadoOperativo: dentroVentana ? 'activo' : 'expirado',
    razon: dentroVentana ? `Pendiente (${estado})` : `Expirado sin recursos ${minutosRetraso} min`,
    tieneRecursos: false, estaDemorado: false, minutosRetraso,
  };
}

// ============================================================================
// Helpers de UI
// ============================================================================

export function getColorEstadoOperativo(estado: EstadoOperativo): string {
  switch (estado) {
    case 'activo': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'demorado': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'expirado': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

export function getIconoEstadoOperativo(estado: EstadoOperativo): string {
  switch (estado) {
    case 'activo': return '✓';
    case 'demorado': return '⏰';
    case 'expirado': return '❌';
    default: return '•';
  }
}

export function getLabelEstadoOperativo(estado: EstadoOperativo): string {
  switch (estado) {
    case 'activo': return 'Activo';
    case 'demorado': return 'Demorado';
    case 'expirado': return 'Expirado';
    default: return 'Desconocido';
  }
}
