/**
 * ============================================================================
 * Tests: lib/estados/config.ts — 17-state centralized system
 * ============================================================================
 *
 * Validates:
 *   1. All 17 + cancelado states are defined
 *   2. TRANSICIONES_VALIDAS covers every state
 *   3. Happy-path chain: pendiente → completado
 *   4. validarTransicion() allows valid, blocks invalid
 *   5. getProximosEstados() returns correct next states
 *   6. esEstadoFinal() recognizes completado/cancelado
 *   7. calcularProgreso() is monotonically increasing
 *   8. puedeActualizar() role checks
 *   9. getEstadoDisplay() legacy mapping
 *  10. ESTADO_A_TIMESTAMP mapping coverage (viajeEstado service)
 */

import {
  EstadoViaje,
  EstadoViajeType,
  TODOS_LOS_ESTADOS,
  TRANSICIONES_VALIDAS,
  ORDEN_ESTADOS,
  ESTADO_DISPLAY,
  ROLES_AUTORIZADOS,
  validarTransicion,
  getProximosEstados,
  getProximosEstadosPorRol,
  esEstadoFinal,
  esEstadoAsignacion,
  esEstadoEnPlanta,
  esEstadoEnMovimiento,
  esEstadoEnProceso,
  calcularProgreso,
  puedeActualizar,
  filtrarPorRol,
  getEstadoDisplay,
  getEstadoLabel,
  getEstadoColor,
  type RolInterno,
} from '../../lib/estados/config';

// ============================================================================
// 1. Completeness — All 17 + cancelado defined
// ============================================================================

describe('State system completeness', () => {
  const EXPECTED_STATES: EstadoViajeType[] = [
    'pendiente',
    'transporte_asignado',
    'camion_asignado',
    'confirmado_chofer',
    'en_transito_origen',
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
  ];

  test('TODOS_LOS_ESTADOS has exactly 18 states (17 + cancelado)', () => {
    expect(TODOS_LOS_ESTADOS).toHaveLength(18);
  });

  test('all expected states are present', () => {
    for (const state of EXPECTED_STATES) {
      expect(TODOS_LOS_ESTADOS).toContain(state);
    }
  });

  test('no old states leak into TODOS_LOS_ESTADOS', () => {
    const OLD_STATES = [
      'arribo_origen', 'en_playa_origen', 'viaje_completado',
      'entregado', 'vacio', 'disponible_carga', 'en_playa_espera',
      'en_proceso_carga', 'arribo_destino', 'ingreso_planta',
      'ingreso_destino', 'en_descarga', 'asignado',
    ];
    for (const old of OLD_STATES) {
      expect(TODOS_LOS_ESTADOS).not.toContain(old);
    }
  });

  test('EstadoViaje enum matches TODOS_LOS_ESTADOS', () => {
    const enumValues = Object.values(EstadoViaje);
    expect(enumValues.sort()).toEqual([...TODOS_LOS_ESTADOS].sort());
  });
});

// ============================================================================
// 2. TRANSICIONES_VALIDAS covers every state
// ============================================================================

describe('TRANSICIONES_VALIDAS coverage', () => {
  test('every state has a transition entry', () => {
    for (const estado of TODOS_LOS_ESTADOS) {
      expect(TRANSICIONES_VALIDAS).toHaveProperty(estado);
    }
  });

  test('all transition targets are valid states', () => {
    for (const [from, targets] of Object.entries(TRANSICIONES_VALIDAS)) {
      for (const target of targets) {
        expect(TODOS_LOS_ESTADOS).toContain(target);
      }
    }
  });

  test('final states have no transitions', () => {
    expect(TRANSICIONES_VALIDAS['completado']).toEqual([]);
    expect(TRANSICIONES_VALIDAS['cancelado']).toEqual([]);
  });

  test('no state transitions to itself', () => {
    for (const [from, targets] of Object.entries(TRANSICIONES_VALIDAS)) {
      expect(targets).not.toContain(from);
    }
  });
});

// ============================================================================
// 3. Happy path: pendiente → completado
// ============================================================================

describe('Happy path chain', () => {
  const HAPPY_PATH: EstadoViajeType[] = [
    'pendiente',
    'transporte_asignado',
    'camion_asignado',
    'confirmado_chofer',
    'en_transito_origen',
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
  ];

  test('full journey from pendiente to completado is valid', () => {
    for (let i = 0; i < HAPPY_PATH.length - 1; i++) {
      const from = HAPPY_PATH[i];
      const to = HAPPY_PATH[i + 1];
      const result = validarTransicion(from, to);
      expect(result.valido).toBe(true);
    }
  });

  test('progress increases monotonically along happy path', () => {
    let prevProgress = -1;
    for (const estado of HAPPY_PATH) {
      const progress = calcularProgreso(estado);
      expect(progress).toBeGreaterThan(prevProgress);
      prevProgress = progress;
    }
  });

  test('completado has 100% progress', () => {
    expect(calcularProgreso('completado')).toBe(100);
  });

  test('pendiente has 0% progress', () => {
    expect(calcularProgreso('pendiente')).toBe(0);
  });
});

// ============================================================================
// 4. validarTransicion() — valid and invalid
// ============================================================================

describe('validarTransicion()', () => {
  test('allows valid transitions', () => {
    expect(validarTransicion('pendiente', 'transporte_asignado').valido).toBe(true);
    expect(validarTransicion('cargado', 'egreso_origen').valido).toBe(true);
    expect(validarTransicion('egreso_destino', 'completado').valido).toBe(true);
  });

  test('blocks invalid transitions', () => {
    expect(validarTransicion('pendiente', 'completado').valido).toBe(false);
    expect(validarTransicion('cargado', 'pendiente').valido).toBe(false);
    expect(validarTransicion('completado', 'pendiente').valido).toBe(false);
  });

  test('blocks transition from unknown states', () => {
    expect(validarTransicion('estado_inventado', 'pendiente').valido).toBe(false);
  });

  test('allows cancelation from early states', () => {
    expect(validarTransicion('pendiente', 'cancelado').valido).toBe(true);
    expect(validarTransicion('transporte_asignado', 'cancelado').valido).toBe(true);
    expect(validarTransicion('camion_asignado', 'cancelado').valido).toBe(true);
    expect(validarTransicion('confirmado_chofer', 'cancelado').valido).toBe(true);
  });

  test('blocks cancelation from mid-journey states', () => {
    // en_transito_origen onward does not allow direct cancelation
    expect(validarTransicion('en_transito_origen', 'cancelado').valido).toBe(false);
    expect(validarTransicion('cargando', 'cancelado').valido).toBe(false);
    expect(validarTransicion('en_transito_destino', 'cancelado').valido).toBe(false);
  });

  test('returns meaningful error message on invalid transition', () => {
    const result = validarTransicion('pendiente', 'completado');
    expect(result.mensaje).toContain('no permitida');
    expect(result.mensaje).toContain('Opciones');
  });

  test('shortcut: ingresado_destino → descargado (plant without Nodexia)', () => {
    expect(validarTransicion('ingresado_destino', 'descargado').valido).toBe(true);
  });

  test('multi-destino: egreso_destino → en_transito_destino', () => {
    expect(validarTransicion('egreso_destino', 'en_transito_destino').valido).toBe(true);
  });
});

// ============================================================================
// 5. getProximosEstados()
// ============================================================================

describe('getProximosEstados()', () => {
  test('pendiente → [transporte_asignado, cancelado]', () => {
    expect(getProximosEstados('pendiente')).toEqual(
      expect.arrayContaining(['transporte_asignado', 'cancelado'])
    );
  });

  test('completado → [] (no next states)', () => {
    expect(getProximosEstados('completado')).toEqual([]);
  });

  test('cancelado → [] (no next states)', () => {
    expect(getProximosEstados('cancelado')).toEqual([]);
  });

  test('unknown state → []', () => {
    expect(getProximosEstados('nonexistent')).toEqual([]);
  });

  test('egreso_destino has 2 options (completado + en_transito_destino)', () => {
    const proximos = getProximosEstados('egreso_destino');
    expect(proximos).toContain('completado');
    expect(proximos).toContain('en_transito_destino');
    expect(proximos).toHaveLength(2);
  });
});

// ============================================================================
// 6. esEstadoFinal()
// ============================================================================

describe('esEstadoFinal()', () => {
  test('completado is final', () => {
    expect(esEstadoFinal('completado')).toBe(true);
  });

  test('cancelado is final', () => {
    expect(esEstadoFinal('cancelado')).toBe(true);
  });

  test('pendiente is NOT final', () => {
    expect(esEstadoFinal('pendiente')).toBe(false);
  });

  test('en_transito_destino is NOT final', () => {
    expect(esEstadoFinal('en_transito_destino')).toBe(false);
  });
});

// ============================================================================
// 7. ORDEN_ESTADOS + calcularProgreso
// ============================================================================

describe('ORDEN_ESTADOS', () => {
  test('every state has an order entry', () => {
    for (const estado of TODOS_LOS_ESTADOS) {
      expect(ORDEN_ESTADOS).toHaveProperty(estado);
    }
  });

  test('cancelado has order -1', () => {
    expect(ORDEN_ESTADOS['cancelado']).toBe(-1);
  });

  test('cancelado progress is 0', () => {
    expect(calcularProgreso('cancelado')).toBe(0);
  });

  test('order is unique for non-cancelled states', () => {
    const seen = new Set<number>();
    for (const estado of TODOS_LOS_ESTADOS) {
      if (estado === 'cancelado') continue;
      const orden = ORDEN_ESTADOS[estado];
      expect(seen.has(orden)).toBe(false);
      seen.add(orden);
    }
  });
});

// ============================================================================
// 8. ROLES_AUTORIZADOS + puedeActualizar
// ============================================================================

describe('puedeActualizar()', () => {
  test('chofer can confirm', () => {
    expect(puedeActualizar('chofer', 'confirmado_chofer')).toBe(true);
  });

  test('chofer can set en_transito_origen', () => {
    expect(puedeActualizar('chofer', 'en_transito_origen')).toBe(true);
  });

  test('chofer CANNOT set cargando (supervisor only)', () => {
    expect(puedeActualizar('chofer', 'cargando')).toBe(false);
  });

  test('supervisor can set cargando', () => {
    expect(puedeActualizar('supervisor', 'cargando')).toBe(true);
  });

  test('control_acceso can set ingresado_origen', () => {
    expect(puedeActualizar('control_acceso', 'ingresado_origen')).toBe(true);
  });

  test('nobody can manually set completado (AUTOMATIC)', () => {
    const roles: RolInterno[] = ['coordinador', 'supervisor', 'chofer', 'control_acceso', 'admin'];
    for (const rol of roles) {
      expect(puedeActualizar(rol, 'completado')).toBe(false);
    }
  });

  test('every state has a ROLES_AUTORIZADOS entry', () => {
    for (const estado of TODOS_LOS_ESTADOS) {
      expect(ROLES_AUTORIZADOS).toHaveProperty(estado);
    }
  });
});

describe('filtrarPorRol()', () => {
  test('chofer sees only chofer-permitted states', () => {
    const proximos = getProximosEstados('camion_asignado'); // [confirmado_chofer, cancelado]
    const filtered = filtrarPorRol('chofer', proximos);
    expect(filtered).toContain('confirmado_chofer');
    expect(filtered).not.toContain('cancelado');
  });

  test('getProximosEstadosPorRol combines both functions', () => {
    const result = getProximosEstadosPorRol('camion_asignado', 'chofer');
    expect(result).toContain('confirmado_chofer');
    expect(result).not.toContain('cancelado');
  });
});

// ============================================================================
// 9. UI display + legacy mapping
// ============================================================================

describe('ESTADO_DISPLAY', () => {
  test('every state has a display entry', () => {
    for (const estado of TODOS_LOS_ESTADOS) {
      expect(ESTADO_DISPLAY).toHaveProperty(estado);
      const d = ESTADO_DISPLAY[estado];
      expect(d.label).toBeTruthy();
      expect(d.emoji).toBeTruthy();
      expect(d.bgClass).toBeTruthy();
      expect(d.color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('getEstadoDisplay() legacy mapping', () => {
  test('maps old "viaje_completado" → completado display', () => {
    const display = getEstadoDisplay('viaje_completado');
    expect(display.label).toBe('Completado');
  });

  test('maps old "arribo_origen" → ingresado_origen display', () => {
    const display = getEstadoDisplay('arribo_origen');
    expect(display.label).toBe('Ingresado origen');
  });

  test('maps old "vacio" → completado display', () => {
    const display = getEstadoDisplay('vacio');
    expect(display.label).toBe('Completado');
  });

  test('maps old "entregado" → descargado display', () => {
    const display = getEstadoDisplay('entregado');
    expect(display.label).toBe('Descargado');
  });

  test('unknown state returns fallback with emoji ❓', () => {
    const display = getEstadoDisplay('nonexistent_state');
    expect(display.emoji).toBe('❓');
    expect(display.label).toBe('nonexistent_state');
  });

  test('getEstadoLabel returns emoji + label', () => {
    const label = getEstadoLabel('completado');
    expect(label).toContain('🏆');
    expect(label).toContain('Completado');
  });

  test('getEstadoColor returns bgClass', () => {
    const color = getEstadoColor('pendiente');
    expect(color).toMatch(/^bg-/);
  });
});

// ============================================================================
// 10. State categorization helpers
// ============================================================================

describe('State categorization', () => {
  test('assignment states', () => {
    expect(esEstadoAsignacion('pendiente')).toBe(true);
    expect(esEstadoAsignacion('transporte_asignado')).toBe(true);
    expect(esEstadoAsignacion('camion_asignado')).toBe(true);
    expect(esEstadoAsignacion('en_transito_origen')).toBe(false);
  });

  test('plant states', () => {
    expect(esEstadoEnPlanta('ingresado_origen')).toBe(true);
    expect(esEstadoEnPlanta('cargando')).toBe(true);
    expect(esEstadoEnPlanta('ingresado_destino')).toBe(true);
    expect(esEstadoEnPlanta('en_transito_origen')).toBe(false);
  });

  test('movement states', () => {
    expect(esEstadoEnMovimiento('en_transito_origen')).toBe(true);
    expect(esEstadoEnMovimiento('en_transito_destino')).toBe(true);
    expect(esEstadoEnMovimiento('pendiente')).toBe(false);
  });

  test('process states', () => {
    expect(esEstadoEnProceso('cargando')).toBe(true);
    expect(esEstadoEnProceso('descargando')).toBe(true);
    expect(esEstadoEnProceso('pendiente')).toBe(false);
  });
});

// ============================================================================
// 11. Graph integrity — no orphaned states, no unreachable states
// ============================================================================

describe('Graph integrity', () => {
  test('every non-initial state is reachable from at least one other state', () => {
    // Build reverse map: what states can reach each state
    const reachableBy: Record<string, string[]> = {};
    for (const estado of TODOS_LOS_ESTADOS) {
      reachableBy[estado] = [];
    }
    for (const [from, targets] of Object.entries(TRANSICIONES_VALIDAS)) {
      for (const to of targets) {
        reachableBy[to].push(from);
      }
    }

    // pendiente is the start — doesn't need to be reachable from another state
    for (const estado of TODOS_LOS_ESTADOS) {
      if (estado === 'pendiente') continue;
      expect(reachableBy[estado].length).toBeGreaterThan(0);
    }
  });

  test('completado is reachable via BFS from pendiente', () => {
    const visited = new Set<string>();
    const queue: string[] = ['pendiente'];
    visited.add('pendiente');

    while (queue.length > 0) {
      const current = queue.shift()!;
      const targets = TRANSICIONES_VALIDAS[current as EstadoViajeType] || [];
      for (const t of targets) {
        if (!visited.has(t)) {
          visited.add(t);
          queue.push(t);
        }
      }
    }

    expect(visited.has('completado')).toBe(true);
  });
});
