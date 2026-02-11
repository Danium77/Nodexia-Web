/**
 * 📊 ESTADOS HELPER - Sistema de Estados Operativos
 * 
 * Define la lógica para diferenciar entre viajes:
 * - ACTIVO: En curso dentro de ventana horaria
 * - DEMORADO: En curso fuera de ventana horaria (pero avanzando)
 * - EXPIRADO: Sin recursos asignados fuera de ventana horaria
 * 
 * Basado en: docs/SISTEMA-DUAL-ESTADOS-DEFINITIVO.md
 * Fecha: 04-Feb-2026
 */

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Ventana de tolerancia en horas para considerar un viaje "a tiempo"
 * Si pasa más de este tiempo, el viaje se considera "demorado" (si tiene recursos)
 */
export const VENTANA_TOLERANCIA_HORAS = 2;

/**
 * Estados de CARGA que indican que el viaje está EN PROGRESO
 * (no son ni pendientes ni finalizados)
 */
export const ESTADOS_CARGA_EN_PROGRESO = [
  'camion_asignado',
  'confirmado_chofer',
  'en_transito_origen',
  'ingresado_origen',
  'en_playa_origen',
  'llamado_carga',
  'cargando',
  'cargado',
  'egresado_origen',
  'egreso_origen',
  'en_transito_destino',
  'arribado_destino',
  'ingresado_destino',
  'llamado_descarga',
  'descargando',
  'entregado',
  'vacio',
] as const;

/**
 * Estados de CARGA que indican que el viaje aún no comenzó
 */
export const ESTADOS_CARGA_PENDIENTES = [
  'pendiente',
  'pendiente_asignacion',
  'transporte_asignado',
] as const;

/**
 * Estados de CARGA finales (el viaje ya terminó)
 */
export const ESTADOS_CARGA_FINALES = [
  'disponible',
  'completado',
  'cancelado',
  'expirado', // Estado final de BD (no debería usarse con nueva lógica)
] as const;

/**
 * Estados que indican presencia FÍSICA en una planta/ubicación
 * Estos estados siempre son "activo" operativamente, independientemente
 * de la ventana de tiempo, porque el camión ya está donde debe estar.
 */
export const ESTADOS_EN_PLANTA = [
  'ingresado_origen',
  'en_playa_origen',
  'llamado_carga',
  'cargando',
  'cargado',
  'ingresado_destino',
  'llamado_descarga',
  'descargando',
] as const;

/**
 * Verifica si el estado indica presencia física en una planta
 */
export function estaEnPlanta(estadoCarga: string): boolean {
  return ESTADOS_EN_PLANTA.includes(estadoCarga as any);
}

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Estado operativo calculado en tiempo real
 */
export type EstadoOperativo = 'activo' | 'demorado' | 'expirado';

/**
 * Datos mínimos necesarios para calcular el estado operativo
 */
export interface DatosViaje {
  estado_carga: string;
  estado_unidad?: string | null;
  chofer_id?: string | null;
  camion_id?: string | null;
  scheduled_local_date?: string | null;
  scheduled_local_time?: string | null;
  scheduled_at?: string | null; // Timestamp combinado
}

/**
 * Resultado del cálculo de estado operativo
 */
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

/**
 * Verifica si un viaje tiene recursos asignados (chofer y camión)
 */
export function tieneRecursosAsignados(viaje: DatosViaje): boolean {
  return !!(viaje.chofer_id && viaje.camion_id);
}

/**
 * Verifica si el estado de carga indica que el viaje está en progreso
 */
export function estaEnProgreso(estadoCarga: string): boolean {
  return ESTADOS_CARGA_EN_PROGRESO.includes(estadoCarga as any);
}

/**
 * Verifica si el estado de carga indica que el viaje está pendiente
 */
export function estaPendiente(estadoCarga: string): boolean {
  return ESTADOS_CARGA_PENDIENTES.includes(estadoCarga as any);
}

/**
 * Verifica si el estado de carga indica que el viaje finalizó
 */
export function esFinal(estadoCarga: string): boolean {
  return ESTADOS_CARGA_FINALES.includes(estadoCarga as any);
}

/**
 * Calcula los minutos de retraso respecto a la hora programada
 * Retorna null si no hay hora programada o aún no se pasó la hora
 */
export function calcularMinutosRetraso(viaje: DatosViaje): number | null {
  const ahora = new Date();
  
  // Intentar obtener timestamp combinado primero
  if (viaje.scheduled_at) {
    const fechaProgramada = new Date(viaje.scheduled_at);
    if (ahora > fechaProgramada) {
      return Math.floor((ahora.getTime() - fechaProgramada.getTime()) / 1000 / 60);
    }
    return null;
  }
  
  // Fallback: combinar fecha + hora manualmente
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

/**
 * Verifica si el viaje está dentro de la ventana de tolerancia
 */
export function estaDentroVentana(minutosRetraso: number | null): boolean {
  if (minutosRetraso === null) return true; // No hay retraso
  return minutosRetraso <= (VENTANA_TOLERANCIA_HORAS * 60);
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

/**
 * 🎯 FUNCIÓN PRINCIPAL: Calcula el estado operativo de un viaje
 * 
 * Lógica de decisión:
 * 
 * 1. Si el viaje está FINALIZADO → NO aplica estado operativo
 * 2. Si el viaje está EN PROGRESO (tiene recursos y estado activo):
 *    - Dentro de ventana de tolerancia → ACTIVO
 *    - Fuera de ventana de tolerancia → DEMORADO
 * 3. Si el viaje está PENDIENTE (sin recursos o sin iniciar):
 *    - Dentro de ventana de tolerancia → ACTIVO (aún puede asignarse)
 *    - Fuera de ventana de tolerancia → EXPIRADO
 * 
 * @param viaje Datos del viaje a evaluar
 * @returns Estado operativo calculado con metadata
 * 
 * @example
 * ```typescript
 * const viaje = {
 *   estado_carga: 'en_transito_origen',
 *   chofer_id: 'abc-123',
 *   camion_id: 'def-456',
 *   scheduled_at: '2026-02-04T20:00:00Z'
 * };
 * 
 * const resultado = calcularEstadoOperativo(viaje);
 * // Si es 00:00 (4h de retraso):
 * // { estadoOperativo: 'demorado', razon: 'Viaje en curso con 240 min de retraso', ... }
 * ```
 */
export function calcularEstadoOperativo(viaje: DatosViaje): ResultadoEstadoOperativo {
  const tieneRecursos = tieneRecursosAsignados(viaje);
  const enProgreso = estaEnProgreso(viaje.estado_carga);
  const pendiente = estaPendiente(viaje.estado_carga);
  const final = esFinal(viaje.estado_carga);
  const minutosRetraso = calcularMinutosRetraso(viaje);
  const dentroVentana = estaDentroVentana(minutosRetraso);
  
  // 🔴 CASO 1: Viaje finalizado → No aplica estado operativo
  if (final) {
    return {
      estadoOperativo: 'activo', // Neutral, no se muestra
      razon: `Viaje en estado final: ${viaje.estado_carga}`,
      tieneRecursos,
      estaDemorado: false,
      minutosRetraso
    };
  }
  
  // 🏭 CASO 1.5: Viaje EN PLANTA → Siempre ACTIVO
  // Si el camión está físicamente en una planta (ingresado, cargando, descargando, etc.)
  // no debe clasificarse como "demorado" sin importar el tiempo transcurrido.
  if (estaEnPlanta(viaje.estado_carga) && tieneRecursos) {
    return {
      estadoOperativo: 'activo',
      razon: `Viaje en planta (${viaje.estado_carga}) — camión presente`,
      tieneRecursos: true,
      estaDemorado: false,
      minutosRetraso
    };
  }
  
  // 🟢 CASO 2: Viaje EN PROGRESO (tiene recursos y estado activo)
  if (enProgreso && tieneRecursos) {
    if (dentroVentana) {
      return {
        estadoOperativo: 'activo',
        razon: 'Viaje en curso dentro de horario programado',
        tieneRecursos: true,
        estaDemorado: false,
        minutosRetraso
      };
    } else {
      return {
        estadoOperativo: 'demorado',
        razon: `Viaje en curso con ${minutosRetraso} min de retraso (fuera de ventana de ${VENTANA_TOLERANCIA_HORAS}h)`,
        tieneRecursos: true,
        estaDemorado: true,
        minutosRetraso
      };
    }
  }
  
  // 🟡 CASO 3: Viaje PENDIENTE (sin recursos o sin iniciar)
  if (pendiente || !tieneRecursos) {
    if (dentroVentana) {
      return {
        estadoOperativo: 'activo',
        razon: 'Viaje pendiente dentro de ventana de asignación',
        tieneRecursos,
        estaDemorado: false,
        minutosRetraso
      };
    } else {
      return {
        estadoOperativo: 'expirado',
        razon: `Viaje sin recursos asignados con ${minutosRetraso} min de retraso`,
        tieneRecursos,
        estaDemorado: false,
        minutosRetraso
      };
    }
  }
  
  // 🔵 CASO 4: Estados edge case (ej: tiene recursos pero estado pendiente)
  // Esto indica inconsistencia en datos, pero priorizamos el estado de recursos
  if (tieneRecursos && dentroVentana) {
    return {
      estadoOperativo: 'activo',
      razon: `Viaje con recursos asignados en estado: ${viaje.estado_carga}`,
      tieneRecursos: true,
      estaDemorado: false,
      minutosRetraso
    };
  }
  
  if (tieneRecursos && !dentroVentana) {
    return {
      estadoOperativo: 'demorado',
      razon: `Viaje con recursos pero en estado inconsistente: ${viaje.estado_carga}`,
      tieneRecursos: true,
      estaDemorado: true,
      minutosRetraso
    };
  }
  
  // Default: Expirado
  return {
    estadoOperativo: 'expirado',
    razon: `Viaje sin recursos en estado: ${viaje.estado_carga}`,
    tieneRecursos: false,
    estaDemorado: false,
    minutosRetraso
  };
}

// ============================================================================
// FUNCIONES DE UI HELPER
// ============================================================================

/**
 * Obtiene el color del badge según el estado operativo
 */
export function getColorEstadoOperativo(estado: EstadoOperativo): string {
  switch (estado) {
    case 'activo':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'demorado':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'expirado':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

/**
 * Obtiene el ícono del badge según el estado operativo
 */
export function getIconoEstadoOperativo(estado: EstadoOperativo): string {
  switch (estado) {
    case 'activo':
      return '✓';
    case 'demorado':
      return '⏰';
    case 'expirado':
      return '❌';
    default:
      return '•';
  }
}

/**
 * Obtiene la label del badge según el estado operativo
 */
export function getLabelEstadoOperativo(estado: EstadoOperativo): string {
  switch (estado) {
    case 'activo':
      return 'Activo';
    case 'demorado':
      return 'Demorado';
    case 'expirado':
      return 'Expirado';
    default:
      return 'Desconocido';
  }
}

// ============================================================================
// TESTS INLINE (para debugging)
// ============================================================================

/**
 * 🧪 Tests básicos de la función (ejecutar en consola para verificar)
 */
export function runTests() {
  console.log('🧪 Testing calcularEstadoOperativo...\n');
  
  // Test 1: Viaje activo con recursos dentro de horario
  const test1: DatosViaje = {
    estado_carga: 'en_transito_origen',
    chofer_id: 'abc-123',
    camion_id: 'def-456',
    scheduled_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 min atrás
  };
  console.log('Test 1: Viaje en_transito_origen, con recursos, 30 min retraso');
  console.log(calcularEstadoOperativo(test1));
  console.log('✅ Esperado: activo\n');
  
  // Test 2: Viaje demorado con recursos fuera de horario
  const test2: DatosViaje = {
    estado_carga: 'en_transito_origen',
    chofer_id: 'abc-123',
    camion_id: 'def-456',
    scheduled_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // 4h atrás
  };
  console.log('Test 2: Viaje en_transito_origen, con recursos, 4h retraso');
  console.log(calcularEstadoOperativo(test2));
  console.log('✅ Esperado: demorado\n');
  
  // Test 3: Viaje expirado sin recursos
  const test3: DatosViaje = {
    estado_carga: 'pendiente_asignacion',
    chofer_id: null,
    camion_id: null,
    scheduled_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // 5h atrás
  };
  console.log('Test 3: Viaje pendiente_asignacion, sin recursos, 5h retraso');
  console.log(calcularEstadoOperativo(test3));
  console.log('✅ Esperado: expirado\n');
  
  // Test 4: Viaje pendiente dentro de ventana
  const test4: DatosViaje = {
    estado_carga: 'pendiente_asignacion',
    chofer_id: null,
    camion_id: null,
    scheduled_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 min atrás
  };
  console.log('Test 4: Viaje pendiente_asignacion, sin recursos, 30 min retraso');
  console.log(calcularEstadoOperativo(test4));
  console.log('✅ Esperado: activo (aún dentro de ventana)\n');
}
