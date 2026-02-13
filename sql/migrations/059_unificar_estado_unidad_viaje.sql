-- ============================================================================
-- Migración 059: Unificar estados en tabla estado_unidad_viaje
-- ============================================================================
-- Fecha: Feb-2026
-- Descripción:
--   1. Migrar estado_unidad_viaje.estado_unidad de nombres V1/V3 a nuevos 17+1
--   2. Actualizar CHECK constraint para aceptar nombres centralizados
--   3. Asegurar que estado_unidad_viaje.estado_unidad sincroniza con
--      viajes_despacho.estado (fuente canónica)
--
-- DEPENDE DE: 058_centralizacion_estados_y_paradas.sql
-- ============================================================================

-- ============================================================================
-- PASO 1: Migrar datos de estado_unidad de nombres legacy → nuevos
-- ============================================================================

UPDATE estado_unidad_viaje SET estado_unidad = CASE
  WHEN estado_unidad = 'asignado' THEN 'camion_asignado'
  WHEN estado_unidad = 'arribo_origen' THEN 'ingresado_origen'
  WHEN estado_unidad = 'ingreso_planta' THEN 'ingresado_origen'
  WHEN estado_unidad = 'en_playa_espera' THEN 'llamado_carga'
  WHEN estado_unidad = 'en_proceso_carga' THEN 'cargando'
  WHEN estado_unidad = 'arribo_destino' THEN 'ingresado_destino'
  WHEN estado_unidad = 'ingreso_destino' THEN 'ingresado_destino'
  WHEN estado_unidad = 'en_descarga' THEN 'descargando'
  WHEN estado_unidad = 'vacio' THEN 'descargado'
  WHEN estado_unidad = 'disponible_carga' THEN 'egreso_destino'
  WHEN estado_unidad = 'viaje_completado' THEN 'completado'
  ELSE estado_unidad
END
WHERE estado_unidad NOT IN (
  'pendiente', 'transporte_asignado', 'camion_asignado', 'confirmado_chofer',
  'en_transito_origen', 'ingresado_origen', 'llamado_carga', 'cargando', 'cargado',
  'egreso_origen', 'en_transito_destino', 'ingresado_destino',
  'llamado_descarga', 'descargando', 'descargado', 'egreso_destino',
  'completado', 'cancelado'
);

-- ============================================================================
-- PASO 2: Sincronizar con viajes_despacho.estado (fuente canónica)
-- ============================================================================

UPDATE estado_unidad_viaje euv
SET estado_unidad = vd.estado
FROM viajes_despacho vd
WHERE euv.viaje_id = vd.id
  AND euv.estado_unidad IS DISTINCT FROM vd.estado;

-- ============================================================================
-- PASO 3: Actualizar CHECK constraint
-- ============================================================================

-- Eliminar constraint viejo (nombre puede variar)
ALTER TABLE estado_unidad_viaje
  DROP CONSTRAINT IF EXISTS estado_unidad_viaje_estado_unidad_check;

-- Crear constraint con los 17 + cancelado estados centralizados
ALTER TABLE estado_unidad_viaje
  ADD CONSTRAINT estado_unidad_viaje_estado_unidad_check
  CHECK (estado_unidad IN (
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
    'cancelado'
  ));

-- ============================================================================
-- PASO 4: Comentarios de documentación
-- ============================================================================

COMMENT ON COLUMN estado_unidad_viaje.estado_unidad IS
  'Estado centralizado (17+1). Sincronizado con viajes_despacho.estado. '
  'Ver lib/estados/config.ts para fuente de verdad.';

-- ============================================================================
-- FIN
-- ============================================================================
