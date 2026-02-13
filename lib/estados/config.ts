/**
 * ============================================================================
 * 🎯 FUENTE DE VERDAD — ESTADOS DE NODEXIA
 * ============================================================================
 * 
 * Este archivo es la ÚNICA definición de estados, transiciones, colores,
 * labels, roles autorizados y reglas de negocio del sistema.
 * 
 * REGLA: Ningún otro archivo debe definir estados como strings hardcodeados.
 *        Todos importan de aquí.
 * 
 * Flujo definitivo (17 estados + cancelado):
 *   F0 Creación:        pendiente
 *   F1 Asignación:      transporte_asignado → camion_asignado → confirmado_chofer
 *   F2 Tránsito Origen: en_transito_origen
 *   F3 Planta Origen:   ingresado_origen → llamado_carga → cargando → cargado
 *   F4 Egreso:          egreso_origen
 *   F5 Tránsito Destino:en_transito_destino
 *   F6 Planta Destino:  ingresado_destino → llamado_descarga → descargando → descargado → egreso_destino
 *                        (Sin Nodexia: ingresado_destino → descargado)
 *   F7 Cierre:          completado
 *   X  Cancelado:       cancelado
 * 
 * Despacho 1:1 Viaje — El despacho NO tiene estado propio.
 * Los tabs (Pendiente, Asignado, En Proceso, Completado, Demorado, Expirado)
 * se calculan a partir del estado del viaje + horarios.
 * 
 * Multi-destino: Tabla `paradas` con orden 1..N (máx 4).
 *   parada_actual en el viaje indica en qué parada está el camión.
 * 
 * Fecha: 13-Feb-2026
 */

// ============================================================================
// ESTADOS — Enum como fuente de verdad
// ============================================================================

/**
 * Todos los estados posibles del viaje.
 * Usar siempre E.PENDIENTE en vez de 'pendiente' como string.
 */
export enum EstadoViaje {
  // F0: Creación
  PENDIENTE = 'pendiente',

  // F1: Asignación
  TRANSPORTE_ASIGNADO = 'transporte_asignado',
  CAMION_ASIGNADO = 'camion_asignado',
  CONFIRMADO_CHOFER = 'confirmado_chofer',

  // F2: Tránsito Origen
  EN_TRANSITO_ORIGEN = 'en_transito_origen',

  // F3: Planta Origen
  INGRESADO_ORIGEN = 'ingresado_origen',
  LLAMADO_CARGA = 'llamado_carga',
  CARGANDO = 'cargando',
  CARGADO = 'cargado',

  // F4: Egreso Origen
  EGRESO_ORIGEN = 'egreso_origen',

  // F5: Tránsito Destino
  EN_TRANSITO_DESTINO = 'en_transito_destino',

  // F6: Planta Destino
  INGRESADO_DESTINO = 'ingresado_destino',
  LLAMADO_DESCARGA = 'llamado_descarga',
  DESCARGANDO = 'descargando',
  DESCARGADO = 'descargado',
  EGRESO_DESTINO = 'egreso_destino',

  // F7: Cierre
  COMPLETADO = 'completado',

  // Estados especiales
  CANCELADO = 'cancelado',
}

/** Tipo string literal union derivado del enum */
export type EstadoViajeType = `${EstadoViaje}`;

/** Array con todos los valores válidos */
export const TODOS_LOS_ESTADOS = Object.values(EstadoViaje) as EstadoViajeType[];

// ============================================================================
// FASES — Agrupación lógica
// ============================================================================

export enum Fase {
  CREACION = 0,
  ASIGNACION = 1,
  TRANSITO_ORIGEN = 2,
  PLANTA_ORIGEN = 3,
  EGRESO_ORIGEN = 4,
  TRANSITO_DESTINO = 5,
  PLANTA_DESTINO = 6,
  CIERRE = 7,
}

/** Fase a la que pertenece cada estado */
export const FASE_POR_ESTADO: Record<EstadoViajeType, Fase> = {
  [EstadoViaje.PENDIENTE]: Fase.CREACION,
  [EstadoViaje.TRANSPORTE_ASIGNADO]: Fase.ASIGNACION,
  [EstadoViaje.CAMION_ASIGNADO]: Fase.ASIGNACION,
  [EstadoViaje.CONFIRMADO_CHOFER]: Fase.ASIGNACION,
  [EstadoViaje.EN_TRANSITO_ORIGEN]: Fase.TRANSITO_ORIGEN,
  [EstadoViaje.INGRESADO_ORIGEN]: Fase.PLANTA_ORIGEN,
  [EstadoViaje.LLAMADO_CARGA]: Fase.PLANTA_ORIGEN,
  [EstadoViaje.CARGANDO]: Fase.PLANTA_ORIGEN,
  [EstadoViaje.CARGADO]: Fase.PLANTA_ORIGEN,
  [EstadoViaje.EGRESO_ORIGEN]: Fase.EGRESO_ORIGEN,
  [EstadoViaje.EN_TRANSITO_DESTINO]: Fase.TRANSITO_DESTINO,
  [EstadoViaje.INGRESADO_DESTINO]: Fase.PLANTA_DESTINO,
  [EstadoViaje.LLAMADO_DESCARGA]: Fase.PLANTA_DESTINO,
  [EstadoViaje.DESCARGANDO]: Fase.PLANTA_DESTINO,
  [EstadoViaje.DESCARGADO]: Fase.PLANTA_DESTINO,
  [EstadoViaje.EGRESO_DESTINO]: Fase.PLANTA_DESTINO,
  [EstadoViaje.COMPLETADO]: Fase.CIERRE,
  [EstadoViaje.CANCELADO]: Fase.CIERRE,
};

// ============================================================================
// CATEGORÍAS — Para agrupación rápida
// ============================================================================

/** Estados de la fase de asignación (F0-F1) */
export const ESTADOS_ASIGNACION: EstadoViajeType[] = [
  EstadoViaje.PENDIENTE,
  EstadoViaje.TRANSPORTE_ASIGNADO,
  EstadoViaje.CAMION_ASIGNADO,
  EstadoViaje.CONFIRMADO_CHOFER,
];

/** Estados donde el camión está EN MOVIMIENTO (F2-F5) */
export const ESTADOS_EN_MOVIMIENTO: EstadoViajeType[] = [
  EstadoViaje.EN_TRANSITO_ORIGEN,
  EstadoViaje.EGRESO_ORIGEN,
  EstadoViaje.EN_TRANSITO_DESTINO,
];

/** Estados donde el camión está FÍSICAMENTE EN PLANTA (F3, F6) */
export const ESTADOS_EN_PLANTA: EstadoViajeType[] = [
  // Origen
  EstadoViaje.INGRESADO_ORIGEN,
  EstadoViaje.LLAMADO_CARGA,
  EstadoViaje.CARGANDO,
  EstadoViaje.CARGADO,
  // Destino
  EstadoViaje.INGRESADO_DESTINO,
  EstadoViaje.LLAMADO_DESCARGA,
  EstadoViaje.DESCARGANDO,
  EstadoViaje.DESCARGADO,
  EstadoViaje.EGRESO_DESTINO,
];

/** Estados "en proceso" = movimiento + planta (todo entre F2 y F6) */
export const ESTADOS_EN_PROCESO: EstadoViajeType[] = [
  ...ESTADOS_EN_MOVIMIENTO,
  ...ESTADOS_EN_PLANTA,
];

/** Estados finales — viaje terminado */
export const ESTADOS_FINALES: EstadoViajeType[] = [
  EstadoViaje.COMPLETADO,
  EstadoViaje.CANCELADO,
];

// ============================================================================
// TRANSICIONES VÁLIDAS — La única tabla de transiciones del sistema
// ============================================================================

/**
 * Desde cada estado, a qué estados se puede pasar.
 * Esta tabla la usa tanto el API server-side como el cliente.
 * 
 * Notas:
 * - pendiente SIEMPRE pasa por transporte_asignado (no salta a camion_asignado)
 * - En planta destino sin Nodexia: ingresado_destino → descargado (atajo)
 * - La última parada: egreso_destino → completado
 * - Paradas intermedias: egreso_destino → en_transito_destino (siguiente parada)
 */
export const TRANSICIONES_VALIDAS: Record<EstadoViajeType, EstadoViajeType[]> = {
  // F0: Creación
  [EstadoViaje.PENDIENTE]: [EstadoViaje.TRANSPORTE_ASIGNADO, EstadoViaje.CANCELADO],

  // F1: Asignación
  [EstadoViaje.TRANSPORTE_ASIGNADO]: [EstadoViaje.CAMION_ASIGNADO, EstadoViaje.CANCELADO],
  [EstadoViaje.CAMION_ASIGNADO]: [EstadoViaje.CONFIRMADO_CHOFER, EstadoViaje.CANCELADO],
  [EstadoViaje.CONFIRMADO_CHOFER]: [EstadoViaje.EN_TRANSITO_ORIGEN, EstadoViaje.CANCELADO],

  // F2: Tránsito Origen
  [EstadoViaje.EN_TRANSITO_ORIGEN]: [EstadoViaje.INGRESADO_ORIGEN],

  // F3: Planta Origen
  [EstadoViaje.INGRESADO_ORIGEN]: [EstadoViaje.LLAMADO_CARGA],
  [EstadoViaje.LLAMADO_CARGA]: [EstadoViaje.CARGANDO],
  [EstadoViaje.CARGANDO]: [EstadoViaje.CARGADO],
  [EstadoViaje.CARGADO]: [EstadoViaje.EGRESO_ORIGEN],

  // F4: Egreso Origen
  [EstadoViaje.EGRESO_ORIGEN]: [EstadoViaje.EN_TRANSITO_DESTINO],

  // F5: Tránsito Destino
  [EstadoViaje.EN_TRANSITO_DESTINO]: [EstadoViaje.INGRESADO_DESTINO],

  // F6: Planta Destino (con Nodexia = flujo completo)
  [EstadoViaje.INGRESADO_DESTINO]: [EstadoViaje.LLAMADO_DESCARGA, EstadoViaje.DESCARGADO],
  // ingresado_destino → descargado = atajo para planta sin Nodexia
  [EstadoViaje.LLAMADO_DESCARGA]: [EstadoViaje.DESCARGANDO],
  [EstadoViaje.DESCARGANDO]: [EstadoViaje.DESCARGADO],
  [EstadoViaje.DESCARGADO]: [EstadoViaje.EGRESO_DESTINO],
  [EstadoViaje.EGRESO_DESTINO]: [EstadoViaje.COMPLETADO, EstadoViaje.EN_TRANSITO_DESTINO],
  // egreso_destino → en_transito_destino = siguiente parada (multi-destino)
  // egreso_destino → completado = última parada

  // F7: Cierre — sin transiciones
  [EstadoViaje.COMPLETADO]: [],
  [EstadoViaje.CANCELADO]: [],
};

// ============================================================================
// ORDEN LINEAL — Para calcular progreso y comparar avance
// ============================================================================

/** Orden numérico de cada estado (0 = inicio, 17 = fin) */
export const ORDEN_ESTADOS: Record<EstadoViajeType, number> = {
  [EstadoViaje.PENDIENTE]: 0,
  [EstadoViaje.TRANSPORTE_ASIGNADO]: 1,
  [EstadoViaje.CAMION_ASIGNADO]: 2,
  [EstadoViaje.CONFIRMADO_CHOFER]: 3,
  [EstadoViaje.EN_TRANSITO_ORIGEN]: 4,
  [EstadoViaje.INGRESADO_ORIGEN]: 5,
  [EstadoViaje.LLAMADO_CARGA]: 6,
  [EstadoViaje.CARGANDO]: 7,
  [EstadoViaje.CARGADO]: 8,
  [EstadoViaje.EGRESO_ORIGEN]: 9,
  [EstadoViaje.EN_TRANSITO_DESTINO]: 10,
  [EstadoViaje.INGRESADO_DESTINO]: 11,
  [EstadoViaje.LLAMADO_DESCARGA]: 12,
  [EstadoViaje.DESCARGANDO]: 13,
  [EstadoViaje.DESCARGADO]: 14,
  [EstadoViaje.EGRESO_DESTINO]: 15,
  [EstadoViaje.COMPLETADO]: 16,
  [EstadoViaje.CANCELADO]: -1,
};

/**
 * Calcula progreso del viaje como porcentaje (0-100)
 */
export function calcularProgreso(estado: EstadoViajeType): number {
  const orden = ORDEN_ESTADOS[estado];
  if (orden < 0) return 0;
  return Math.round((orden / 16) * 100);
}

// ============================================================================
// ROLES AUTORIZADOS — Quién puede cambiar a cada estado
// ============================================================================

export type RolInterno = 'coordinador' | 'supervisor' | 'chofer' | 'control_acceso' | 'admin' | 'superadmin';

/**
 * Roles que pueden actualizar el viaje a cada estado.
 * 'AUTOMATIC' = transición automática del sistema, no manual.
 * 'coordinador' incluye coordinador_planta y coordinador_transporte.
 */
export const ROLES_AUTORIZADOS: Record<EstadoViajeType, RolInterno[] | 'AUTOMATIC'> = {
  [EstadoViaje.PENDIENTE]: ['coordinador', 'admin'],
  [EstadoViaje.TRANSPORTE_ASIGNADO]: ['coordinador', 'admin'],
  [EstadoViaje.CAMION_ASIGNADO]: ['coordinador', 'admin'],
  [EstadoViaje.CONFIRMADO_CHOFER]: ['chofer'],
  [EstadoViaje.EN_TRANSITO_ORIGEN]: ['chofer'],
  [EstadoViaje.INGRESADO_ORIGEN]: ['control_acceso'],
  [EstadoViaje.LLAMADO_CARGA]: ['supervisor'],
  [EstadoViaje.CARGANDO]: ['supervisor'],
  [EstadoViaje.CARGADO]: ['supervisor'],
  [EstadoViaje.EGRESO_ORIGEN]: ['control_acceso'],
  [EstadoViaje.EN_TRANSITO_DESTINO]: ['chofer', 'control_acceso'],
  [EstadoViaje.INGRESADO_DESTINO]: ['control_acceso'],
  [EstadoViaje.LLAMADO_DESCARGA]: ['supervisor', 'control_acceso'],
  [EstadoViaje.DESCARGANDO]: ['supervisor'],
  [EstadoViaje.DESCARGADO]: ['supervisor'],
  [EstadoViaje.EGRESO_DESTINO]: ['control_acceso'],
  [EstadoViaje.COMPLETADO]: 'AUTOMATIC',
  [EstadoViaje.CANCELADO]: ['coordinador', 'admin'],
};

/**
 * Verifica si un rol puede cambiar el viaje al estado indicado
 */
export function puedeActualizar(rol: RolInterno, estado: EstadoViajeType): boolean {
  const autorizados = ROLES_AUTORIZADOS[estado];
  if (autorizados === 'AUTOMATIC') return false;
  return autorizados.includes(rol);
}

/**
 * Filtra una lista de estados a solo los que el rol puede ejecutar
 */
export function filtrarPorRol(rol: RolInterno, estados: EstadoViajeType[]): EstadoViajeType[] {
  return estados.filter(e => puedeActualizar(rol, e));
}

// ============================================================================
// UI — Colores, Labels, Emojis
// ============================================================================

export interface EstadoDisplay {
  label: string;
  emoji: string;
  bgClass: string;
  textClass: string;
  /** Color para gráficos/charts (hex) */
  color: string;
}

/** Display para cada estado del viaje */
export const ESTADO_DISPLAY: Record<EstadoViajeType, EstadoDisplay> = {
  [EstadoViaje.PENDIENTE]: {
    label: 'Pendiente',
    emoji: '⏳',
    bgClass: 'bg-gray-900',
    textClass: 'text-gray-200',
    color: '#6b7280',
  },
  [EstadoViaje.TRANSPORTE_ASIGNADO]: {
    label: 'Transporte asignado',
    emoji: '📋',
    bgClass: 'bg-blue-900',
    textClass: 'text-blue-200',
    color: '#3b82f6',
  },
  [EstadoViaje.CAMION_ASIGNADO]: {
    label: 'Camión asignado',
    emoji: '🚛',
    bgClass: 'bg-yellow-900',
    textClass: 'text-yellow-200',
    color: '#eab308',
  },
  [EstadoViaje.CONFIRMADO_CHOFER]: {
    label: 'Chofer confirmado',
    emoji: '✅',
    bgClass: 'bg-blue-900',
    textClass: 'text-blue-200',
    color: '#2563eb',
  },
  [EstadoViaje.EN_TRANSITO_ORIGEN]: {
    label: 'En tránsito a origen',
    emoji: '🚚',
    bgClass: 'bg-purple-900',
    textClass: 'text-purple-200',
    color: '#9333ea',
  },
  [EstadoViaje.INGRESADO_ORIGEN]: {
    label: 'Ingresado origen',
    emoji: '🏭',
    bgClass: 'bg-cyan-900',
    textClass: 'text-cyan-200',
    color: '#06b6d4',
  },
  [EstadoViaje.LLAMADO_CARGA]: {
    label: 'Llamado a carga',
    emoji: '📢',
    bgClass: 'bg-amber-900',
    textClass: 'text-amber-200',
    color: '#f59e0b',
  },
  [EstadoViaje.CARGANDO]: {
    label: 'Cargando',
    emoji: '⚙️',
    bgClass: 'bg-orange-900',
    textClass: 'text-orange-200',
    color: '#f97316',
  },
  [EstadoViaje.CARGADO]: {
    label: 'Cargado',
    emoji: '📦',
    bgClass: 'bg-indigo-900',
    textClass: 'text-indigo-200',
    color: '#6366f1',
  },
  [EstadoViaje.EGRESO_ORIGEN]: {
    label: 'Egreso origen',
    emoji: '🚪',
    bgClass: 'bg-violet-900',
    textClass: 'text-violet-200',
    color: '#8b5cf6',
  },
  [EstadoViaje.EN_TRANSITO_DESTINO]: {
    label: 'En tránsito a destino',
    emoji: '🚚',
    bgClass: 'bg-purple-900',
    textClass: 'text-purple-200',
    color: '#a855f7',
  },
  [EstadoViaje.INGRESADO_DESTINO]: {
    label: 'Ingresado destino',
    emoji: '🏁',
    bgClass: 'bg-teal-900',
    textClass: 'text-teal-200',
    color: '#14b8a6',
  },
  [EstadoViaje.LLAMADO_DESCARGA]: {
    label: 'Llamado a descarga',
    emoji: '📢',
    bgClass: 'bg-amber-900',
    textClass: 'text-amber-200',
    color: '#d97706',
  },
  [EstadoViaje.DESCARGANDO]: {
    label: 'Descargando',
    emoji: '📤',
    bgClass: 'bg-cyan-900',
    textClass: 'text-cyan-200',
    color: '#0891b2',
  },
  [EstadoViaje.DESCARGADO]: {
    label: 'Descargado',
    emoji: '✅',
    bgClass: 'bg-emerald-900',
    textClass: 'text-emerald-200',
    color: '#10b981',
  },
  [EstadoViaje.EGRESO_DESTINO]: {
    label: 'Egreso destino',
    emoji: '🚪',
    bgClass: 'bg-emerald-900',
    textClass: 'text-emerald-200',
    color: '#059669',
  },
  [EstadoViaje.COMPLETADO]: {
    label: 'Completado',
    emoji: '🏆',
    bgClass: 'bg-emerald-900',
    textClass: 'text-emerald-200',
    color: '#047857',
  },
  [EstadoViaje.CANCELADO]: {
    label: 'Cancelado',
    emoji: '❌',
    bgClass: 'bg-red-900',
    textClass: 'text-red-200',
    color: '#dc2626',
  },
};

/**
 * Obtiene el display de un estado. Compatible con estados legacy.
 * Si recibe un estado que no existe en el sistema nuevo, devuelve un fallback.
 */
export function getEstadoDisplay(estado: string): EstadoDisplay {
  // Mapeo de estados legacy al nuevo sistema
  const LEGACY_MAP: Record<string, EstadoViajeType> = {
    // V1 legacy
    'asignado': EstadoViaje.CAMION_ASIGNADO,
    'confirmado': EstadoViaje.CONFIRMADO_CHOFER,
    'en_planta': EstadoViaje.INGRESADO_ORIGEN,
    'esperando_carga': EstadoViaje.LLAMADO_CARGA,
    'carga_completa': EstadoViaje.CARGADO,
    'en_ruta': EstadoViaje.EN_TRANSITO_DESTINO,
    'entregado': EstadoViaje.DESCARGADO,
    'descarga_completada': EstadoViaje.DESCARGADO,
    // V3 estados eliminados → mapear al nuevo más cercano
    'pendiente_asignacion': EstadoViaje.PENDIENTE,
    'arribo_origen': EstadoViaje.INGRESADO_ORIGEN,
    'en_playa_origen': EstadoViaje.INGRESADO_ORIGEN,
    'egresado_origen': EstadoViaje.EGRESO_ORIGEN,
    'arribo_destino': EstadoViaje.INGRESADO_DESTINO,
    'arribado_destino': EstadoViaje.INGRESADO_DESTINO,
    'vacio': EstadoViaje.COMPLETADO,
    'viaje_completado': EstadoViaje.COMPLETADO,
    'disponible': EstadoViaje.COMPLETADO,
    'incidencia': EstadoViaje.CANCELADO,
    'expirado': EstadoViaje.CANCELADO,
    'fuera_de_horario': EstadoViaje.PENDIENTE,
    'pausado': EstadoViaje.PENDIENTE,
    'cancelado_por_transporte': EstadoViaje.CANCELADO,
    'finalizado': EstadoViaje.COMPLETADO,
  };

  // Primero intentar en el mapa actual
  if (estado in ESTADO_DISPLAY) {
    return ESTADO_DISPLAY[estado as EstadoViajeType];
  }

  // Luego en el mapa legacy
  const mapped = LEGACY_MAP[estado];
  if (mapped) {
    return ESTADO_DISPLAY[mapped];
  }

  // Fallback genérico
  return {
    label: estado,
    emoji: '❓',
    bgClass: 'bg-gray-900',
    textClass: 'text-gray-200',
    color: '#6b7280',
  };
}

/**
 * Obtiene label con emoji para un estado
 */
export function getEstadoLabel(estado: string): string {
  const d = getEstadoDisplay(estado);
  return `${d.emoji} ${d.label}`;
}

/**
 * Obtiene solo el color CSS class para un estado
 */
export function getEstadoColor(estado: string): string {
  return getEstadoDisplay(estado).bgClass;
}

// ============================================================================
// TABS DE DESPACHO — Categorías calculadas (NO almacenadas)
// ============================================================================

/**
 * Los tabs del módulo Despachos no se almacenan en la BD.
 * Se calculan en tiempo real a partir del estado del viaje + horarios.
 */
export type TabDespacho = 'pendientes' | 'asignados' | 'en_proceso' | 'completados' | 'demorado' | 'expirado';

/** Ventana de tolerancia para demorado/expirado */
export const VENTANA_TOLERANCIA_HORAS = 2;

export interface DatosParaTab {
  estado: EstadoViajeType | string;
  chofer_id?: string | null;
  camion_id?: string | null;
  empresa_transporte_id?: string | null;
  /** Fecha/hora programada de carga (ISO string) */
  hora_carga?: string | null;
  fecha_carga?: string | null;
}

/**
 * Calcula a qué tab pertenece un despacho/viaje.
 * 
 * Reglas confirmadas por el usuario:
 * - Pendientes: sin transporte asignado
 * - Asignados: con camión asignado, dentro de horario
 * - En proceso: en tránsito o en planta
 * - Completados: completado
 * - Demorado: con transporte+camión asignado, pasó horario de carga, 
 *   dentro de 2h de tolerancia
 * - Expirado: sin transporte asignado fuera de horario, O con asignación 
 *   completa pero fuera de ventana de tolerancia
 */
export function calcularTab(viaje: DatosParaTab): TabDespacho {
  const estado = viaje.estado as EstadoViajeType;

  // 1. Completado/Cancelado → tab completados
  if (ESTADOS_FINALES.includes(estado)) {
    return 'completados';
  }

  // 2. En proceso (en tránsito o en planta) → siempre en_proceso
  if (ESTADOS_EN_PROCESO.includes(estado)) {
    return 'en_proceso';
  }

  // 3. En fase de asignación → depende de recursos y horario
  const tieneTransporte = !!(viaje.empresa_transporte_id);
  const tieneCamion = !!(viaje.chofer_id && viaje.camion_id);
  const minutosRetraso = calcularMinutosRetraso(viaje);
  const fueraDeHorario = minutosRetraso !== null && minutosRetraso > 0;
  const fueraDeTolerancia = minutosRetraso !== null && minutosRetraso > (VENTANA_TOLERANCIA_HORAS * 60);

  if (!tieneTransporte) {
    // Sin transporte asignado
    return fueraDeHorario ? 'expirado' : 'pendientes';
  }

  if (!tieneCamion) {
    // Con transporte pero sin camión+chofer
    return fueraDeHorario ? 'expirado' : 'pendientes';
  }

  // Tiene transporte + camión + chofer
  if (fueraDeTolerancia) {
    return 'expirado';
  }

  if (fueraDeHorario) {
    return 'demorado';
  }

  return 'asignados';
}

/**
 * Calcula minutos de retraso respecto a la hora de carga programada.
 * null = no hay retraso (aún no pasó el horario).
 */
export function calcularMinutosRetraso(viaje: DatosParaTab): number | null {
  const ahora = new Date();
  let fechaProgramada: Date | null = null;

  if (viaje.hora_carga) {
    // hora_carga puede ser ISO completo o solo hora
    const hcStr = viaje.hora_carga;
    if (hcStr.includes('T') || hcStr.includes('-')) {
      fechaProgramada = new Date(hcStr);
    } else if (viaje.fecha_carga) {
      fechaProgramada = new Date(`${viaje.fecha_carga}T${hcStr}:00`);
    }
  } else if (viaje.fecha_carga) {
    fechaProgramada = new Date(`${viaje.fecha_carga}T00:00:00`);
  }

  if (!fechaProgramada || isNaN(fechaProgramada.getTime())) return null;

  if (ahora > fechaProgramada) {
    return Math.floor((ahora.getTime() - fechaProgramada.getTime()) / 1000 / 60);
  }

  return null;
}

// ============================================================================
// VALIDACIÓN DE TRANSICIONES
// ============================================================================

export interface ResultadoTransicion {
  valido: boolean;
  mensaje: string;
}

/**
 * Valida si una transición de estado es permitida.
 */
export function validarTransicion(
  estadoActual: string,
  estadoNuevo: string
): ResultadoTransicion {
  const actual = estadoActual as EstadoViajeType;
  const nuevo = estadoNuevo as EstadoViajeType;

  const permitidos = TRANSICIONES_VALIDAS[actual];
  if (!permitidos) {
    return { valido: false, mensaje: `Estado actual "${estadoActual}" no reconocido` };
  }

  if (permitidos.includes(nuevo)) {
    return { valido: true, mensaje: `Transición ${estadoActual} → ${estadoNuevo} válida` };
  }

  return {
    valido: false,
    mensaje: `Transición ${estadoActual} → ${estadoNuevo} no permitida. Opciones: ${permitidos.join(', ')}`,
  };
}

/**
 * Obtiene los próximos estados posibles desde el estado actual.
 */
export function getProximosEstados(estadoActual: string): EstadoViajeType[] {
  return TRANSICIONES_VALIDAS[estadoActual as EstadoViajeType] || [];
}

/**
 * Obtiene los próximos estados filtrados por rol.
 */
export function getProximosEstadosPorRol(estadoActual: string, rol: RolInterno): EstadoViajeType[] {
  const proximos = getProximosEstados(estadoActual);
  return filtrarPorRol(rol, proximos);
}

// ============================================================================
// FUNCIONES HELPER — Categorización rápida
// ============================================================================

export function esEstadoAsignacion(estado: string): boolean {
  return ESTADOS_ASIGNACION.includes(estado as EstadoViajeType);
}

export function esEstadoEnPlanta(estado: string): boolean {
  return ESTADOS_EN_PLANTA.includes(estado as EstadoViajeType);
}

export function esEstadoEnMovimiento(estado: string): boolean {
  return ESTADOS_EN_MOVIMIENTO.includes(estado as EstadoViajeType);
}

export function esEstadoEnProceso(estado: string): boolean {
  return ESTADOS_EN_PROCESO.includes(estado as EstadoViajeType);
}

export function esEstadoFinal(estado: string): boolean {
  return ESTADOS_FINALES.includes(estado as EstadoViajeType);
}

// ============================================================================
// PARADAS — Multi-destino (1 origen + hasta 3 destinos)
// ============================================================================

export type TipoParada = 'origen' | 'destino';

export interface Parada {
  id: string;
  viaje_id: string;
  orden: number; // 1 = origen, 2 = destino 1, 3 = destino 2, 4 = destino 3
  tipo: TipoParada;
  planta_id: string;
  tiene_nodexia: boolean;
  estado_parada: EstadoParada;
  hora_ingreso?: string | null;
  hora_egreso?: string | null;
}

/**
 * Estados internos de cada parada.
 * Son un subconjunto del EstadoViaje — los que aplican dentro de una planta.
 */
export type EstadoParada =
  | 'pendiente'        // No llegó todavía
  | 'en_transito'      // Camión en camino a esta parada
  | 'ingresado'        // Ingresó a la planta
  | 'llamado'          // Llamado a carga/descarga
  | 'en_proceso'       // Cargando o descargando
  | 'completado'       // Cargado o descargado
  | 'egresado';        // Salió de la planta

/**
 * Cuando el viaje tiene multi-destino, cada parada avanza independientemente.
 * La parada de ORIGEN usa el flujo: ingresado → llamado → en_proceso → completado → egresado
 * Las paradas DESTINO:
 *   Con Nodexia: ingresado → llamado → en_proceso → completado → egresado
 *   Sin Nodexia: ingresado → completado
 * 
 * El estado del VIAJE principal se mantiene y refleja la parada actual:
 *   parada 1 (origen) ingresado → viaje = ingresado_origen
 *   parada 2 (destino 1) descargando → viaje = descargando
 *   etc.
 */
export const TRANSICIONES_PARADA: Record<EstadoParada, EstadoParada[]> = {
  pendiente: ['en_transito'],
  en_transito: ['ingresado'],
  ingresado: ['llamado', 'completado'], // completado directo = sin Nodexia
  llamado: ['en_proceso'],
  en_proceso: ['completado'],
  completado: ['egresado'],
  egresado: [], // final de la parada
};

/** Máximo de paradas por viaje (1 origen + 3 destinos) */
export const MAX_PARADAS = 4;
