/**
 * 📊 ESTADOS HELPER - Sistema de Estados Operativos (DEFINITIVO)
 * 
 * Esquema de 22 estados + cancelado para el ciclo de vida del viaje.
 * 
 * FASES:
 *   0 - Creación:        pendiente
 *   1 - Asignación:      transporte_asignado → camion_asignado → confirmado_chofer
 *   2 - Tránsito Origen: en_transito_origen → arribo_origen
 *   3 - En Planta Origen: ingresado_origen → en_playa_origen → llamado_carga → cargando → cargado → egreso_origen
 *   4 - Tránsito Destino: en_transito_destino → arribo_destino
 *   5 - En Destino:      ingresado_destino → llamado_descarga → descargando → descargado → egreso_destino
 *   6 - Cierre:          vacio → viaje_completado (auto)
 *   X - Cancelado:       cancelado (final)
 * 
 * Categorización para tabs de despachos:
 *   - PENDIENTES:  Sin chofer+camión, dentro de ventana 2h
 *   - ASIGNADOS:   Con chofer+camión, Fase 1, dentro de ventana
 *   - EN PROCESO:  En movimiento real (Fases 2-5)
 *   - DEMORADOS:   Con recursos en Fases 2-5, fuera de ventana 2h (excepto en planta)
 *   - EXPIRADOS:   Sin recursos, fuera  de ventana 2h
 *   - COMPLETADOS: viaje_completado o cancelado
 * 
 * Red Nodexia: Cuando origen_asignacion='red_nodexia' y el viaje no está en
 * movimiento físico (Fases 2-6), se ignoran chofer_id/camion_id (datos stale).
 * 
 * Fecha: 11-Feb-2026
 */

// ============================================================================
// CONSTANTES — ESQUEMA DEFINITIVO
// ============================================================================

/** Ventana de tolerancia: 2 horas */
export const VENTANA_TOLERANCIA_HORAS = 2;

/**
 * FASE 0-1: Estados donde el viaje aún NO inició movimiento.
 * Sin chofer+camión → Pendiente. Con chofer+camión → Asignado.
 */
export const ESTADOS_FASE_ASIGNACION = [
  'pendiente',
  'pendiente_asignacion',
  'transporte_asignado',
  'camion_asignado',
  'confirmado_chofer',
] as const;

/**
 * FASES 2-5: Estados donde el viaje está en movimiento real.
 * Con recursos dentro de ventana → En Proceso.
 * Con recursos fuera de ventana → Demorado.
 * Sin recursos fuera de ventana → Expirado.
 */
export const ESTADOS_EN_MOVIMIENTO = [
  // Fase 2: Tránsito a origen
  'en_transito_origen',
  'arribo_origen',
  // Fase 3: En planta origen
  'ingresado_origen',
  'en_playa_origen',
  'llamado_carga',
  'cargando',
  'cargado',
  'egreso_origen',
  // Fase 4: Tránsito a destino
  'en_transito_destino',
  'arribo_destino',
  'arribado_destino',
  // Fase 5: En destino
  'ingresado_destino',
  'llamado_descarga',
  'descargando',
  'descargado',
  'egreso_destino',
  // Fase 6: Cierre (pre-completado)
  'vacio',
] as const;

/**
 * Estados donde el camión está FÍSICAMENTE en una planta.
 * Siempre = ACTIVO, sin importar la ventana de tiempo.
 */
export const ESTADOS_EN_PLANTA = [
  // Origen
  'ingresado_origen',
  'en_playa_origen',
  'llamado_carga',
  'cargando',
  'cargado',
  // Destino
  'ingresado_destino',
  'llamado_descarga',
  'descargando',
  'descargado',
] as const;

/**
 * FASE 6 + Finales: El viaje terminó.
 */
export const ESTADOS_FINALES = [
  'viaje_completado',
  'completado',
  'disponible',
  'cancelado',
  'expirado',
] as const;

// ============================================================================
// ALIASES para backward-compatible (usados en otros archivos)
// ============================================================================
export const ESTADOS_CARGA_EN_PROGRESO = ESTADOS_EN_MOVIMIENTO;
export const ESTADOS_CARGA_PENDIENTES = ESTADOS_FASE_ASIGNACION;
export const ESTADOS_CARGA_FINALES = ESTADOS_FINALES;

// ============================================================================
// TIPOS
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
// FUNCIONES HELPER
// ============================================================================

export function tieneRecursosAsignados(viaje: DatosViaje): boolean {
  return !!(viaje.chofer_id && viaje.camion_id);
}

export function estaEnPlanta(estado: string): boolean {
  return (ESTADOS_EN_PLANTA as readonly string[]).includes(estado);
}

export function estaEnMovimiento(estado: string): boolean {
  return (ESTADOS_EN_MOVIMIENTO as readonly string[]).includes(estado);
}

export function estaEnAsignacion(estado: string): boolean {
  return (ESTADOS_FASE_ASIGNACION as readonly string[]).includes(estado);
}

export function esFinal(estado: string): boolean {
  return (ESTADOS_FINALES as readonly string[]).includes(estado);
}

// Backward-compatible aliases
export function estaEnProgreso(estado: string): boolean {
  return estaEnMovimiento(estado);
}

export function estaPendiente(estado: string): boolean {
  return estaEnAsignacion(estado);
}

export function calcularMinutosRetraso(viaje: DatosViaje): number | null {
  const ahora = new Date();
  
  if (viaje.scheduled_at) {
    const fechaProgramada = new Date(viaje.scheduled_at);
    if (ahora > fechaProgramada) {
      return Math.floor((ahora.getTime() - fechaProgramada.getTime()) / 1000 / 60);
    }
    return null;
  }
  
  if (!viaje.scheduled_local_date) return null;
  
  const fechaStr = viaje.scheduled_local_time 
    ? `${viaje.scheduled_local_date}T${viaje.scheduled_local_time}:00`
    : `${viaje.scheduled_local_date}T00:00:00`;
  
  const fechaProgramada = new Date(fechaStr);
  
  if (ahora > fechaProgramada) {
    return Math.floor((ahora.getTime() - fechaProgramada.getTime()) / 1000 / 60);
  }
  
  return null;
}

export function estaDentroVentana(minutosRetraso: number | null): boolean {
  if (minutosRetraso === null) return true;
  return minutosRetraso <= (VENTANA_TOLERANCIA_HORAS * 60);
}

// ============================================================================
// FUNCIÓN PRINCIPAL — ESQUEMA DEFINITIVO
// ============================================================================

/**
 * Calcula el estado operativo de un viaje para categorización en tabs.
 * 
 * Árbol de decisión:
 * 1. Final (viaje_completado, cancelado, etc.) → 'completado' (neutral)
 * 2. En planta física (ingresado, cargando, descargando...) → SIEMPRE 'activo'
 * 3. En movimiento (Fases 2-6) con recursos:
 *    - Dentro de ventana → 'activo'
 *    - Fuera de ventana → 'demorado'
 * 4. En asignación (Fases 0-1) o sin recursos:
 *    - Con chofer+camión, dentro ventana → 'activo' (asignado)
 *    - Con chofer+camión, fuera ventana → 'demorado'
 *    - Sin chofer o sin camión, dentro ventana → 'activo' (pendiente)
 *    - Sin chofer o sin camión, fuera ventana → 'expirado'
 */
export function calcularEstadoOperativo(viaje: DatosViaje): ResultadoEstadoOperativo {
  const tieneRecursos = tieneRecursosAsignados(viaje);
  const minutosRetraso = calcularMinutosRetraso(viaje);
  const dentroVentana = estaDentroVentana(minutosRetraso);
  const estado = viaje.estado_carga;

  // 1. FINAL → neutral
  if (esFinal(estado)) {
    return {
      estadoOperativo: 'activo',
      razon: `Estado final: ${estado}`,
      tieneRecursos,
      estaDemorado: false,
      minutosRetraso
    };
  }

  // 2. EN PLANTA → siempre activo (camión presente físicamente)
  if (estaEnPlanta(estado) && tieneRecursos) {
    return {
      estadoOperativo: 'activo',
      razon: `En planta (${estado})`,
      tieneRecursos: true,
      estaDemorado: false,
      minutosRetraso
    };
  }

  // 3. EN MOVIMIENTO (Fases 2-6) con recursos
  if (estaEnMovimiento(estado) && tieneRecursos) {
    return {
      estadoOperativo: dentroVentana ? 'activo' : 'demorado',
      razon: dentroVentana
        ? `En curso (${estado})`
        : `Demorado ${minutosRetraso} min (${estado})`,
      tieneRecursos: true,
      estaDemorado: !dentroVentana,
      minutosRetraso
    };
  }

  // 4. EN ASIGNACIÓN (Fases 0-1) o sin recursos
  if (tieneRecursos) {
    // Tiene recursos pero en fase de asignación (camion_asignado, confirmado_chofer)
    return {
      estadoOperativo: dentroVentana ? 'activo' : 'demorado',
      razon: dentroVentana
        ? `Asignado, esperando inicio (${estado})`
        : `Asignado pero demorado ${minutosRetraso} min (${estado})`,
      tieneRecursos: true,
      estaDemorado: !dentroVentana,
      minutosRetraso
    };
  }

  // Sin recursos (pendiente, transporte_asignado, o cualquier estado sin chofer+camión)
  return {
    estadoOperativo: dentroVentana ? 'activo' : 'expirado',
    razon: dentroVentana
      ? `Pendiente asignación (${estado})`
      : `Expirado sin recursos ${minutosRetraso} min (${estado})`,
    tieneRecursos: false,
    estaDemorado: false,
    minutosRetraso
  };
}

// ============================================================================
// FUNCIONES DE UI
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
