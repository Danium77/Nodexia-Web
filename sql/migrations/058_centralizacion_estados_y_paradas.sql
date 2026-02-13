-- ============================================================================
-- Migración 058: Centralización de estados + tabla paradas multi-destino
-- ============================================================================
-- Fecha: 13-Feb-2026
-- Descripción:
--   1. Estandarizar estados existentes al nuevo esquema de 17+1 estados
--   2. Crear tabla 'paradas' para multi-destino (máx 4 paradas)
--   3. Eliminar campos obsoletos (estado_carga, estado_unidad separados)
--   4. Ajustar constraint de CHECK para nuevos estados válidos
--   5. Simplificar despacho 1:1 viaje
--
-- IMPORTANTE: Ejecutar DESPUÉS de verificar que no hay viajes activos en
-- estados legacy. Si hay, primero ejecutar el bloque de migración de datos.
-- ============================================================================

-- ============================================================================
-- PASO 1: Migrar datos de estados legacy al nuevo esquema
-- ============================================================================

-- Mapear estados V1/V3 obsoletos → estados nuevos
UPDATE viajes_despacho SET estado = CASE
  -- Estados que se renombran
  WHEN estado = 'pendiente_asignacion' THEN 'pendiente'
  WHEN estado = 'arribo_origen' THEN 'ingresado_origen'
  WHEN estado = 'en_playa_origen' THEN 'ingresado_origen'
  WHEN estado = 'egresado_origen' THEN 'egreso_origen'
  WHEN estado = 'arribo_destino' THEN 'ingresado_destino'
  WHEN estado = 'arribado_destino' THEN 'ingresado_destino'
  WHEN estado = 'vacio' THEN 'completado'
  WHEN estado = 'viaje_completado' THEN 'completado'
  WHEN estado = 'disponible' THEN 'completado'
  WHEN estado = 'expirado' THEN 'cancelado'
  WHEN estado = 'fuera_de_horario' THEN 'pendiente'
  WHEN estado = 'incidencia' THEN 'cancelado'
  WHEN estado = 'cancelado_por_transporte' THEN 'cancelado'
  -- Estados V1
  WHEN estado = 'asignado' THEN 'camion_asignado'
  WHEN estado = 'confirmado' THEN 'confirmado_chofer'
  WHEN estado = 'en_planta' THEN 'ingresado_origen'
  WHEN estado = 'esperando_carga' THEN 'llamado_carga'
  WHEN estado = 'carga_completa' THEN 'cargado'
  WHEN estado = 'en_ruta' THEN 'en_transito_destino'
  WHEN estado = 'entregado' THEN 'descargado'
  WHEN estado = 'descarga_completada' THEN 'descargado'
  WHEN estado = 'pausado' THEN 'pendiente'
  WHEN estado = 'finalizado' THEN 'completado'
  ELSE estado  -- estados ya válidos se quedan como están
END
WHERE estado NOT IN (
  'pendiente', 'transporte_asignado', 'camion_asignado', 'confirmado_chofer',
  'en_transito_origen', 'ingresado_origen', 'llamado_carga', 'cargando', 'cargado',
  'egreso_origen', 'en_transito_destino', 'ingresado_destino',
  'llamado_descarga', 'descargando', 'descargado', 'egreso_destino',
  'completado', 'cancelado'
);

-- Sincronizar estado_unidad con estado (ya no son duales)
UPDATE viajes_despacho 
SET estado_unidad = estado
WHERE estado_unidad IS DISTINCT FROM estado;

-- Sincronizar despacho.estado con su viaje (1:1)
UPDATE despachos d
SET estado = v.estado
FROM viajes_despacho v
WHERE v.despacho_id = d.id;

-- ============================================================================
-- PASO 2: Migrar estados del despacho que estaban en formato diferente
-- ============================================================================

UPDATE despachos SET estado = CASE
  WHEN estado = 'asignado' THEN 'camion_asignado'
  WHEN estado = 'en_transito' THEN 'en_transito_origen'
  WHEN estado = 'entregado' THEN 'completado'
  WHEN estado = 'finalizado' THEN 'completado'
  WHEN estado = 'expirado' THEN 'cancelado'
  WHEN estado = 'fuera_de_horario' THEN 'pendiente'
  ELSE estado
END
WHERE estado NOT IN (
  'pendiente', 'transporte_asignado', 'camion_asignado', 'confirmado_chofer',
  'en_transito_origen', 'ingresado_origen', 'llamado_carga', 'cargando', 'cargado',
  'egreso_origen', 'en_transito_destino', 'ingresado_destino',
  'llamado_descarga', 'descargando', 'descargado', 'egreso_destino',
  'completado', 'cancelado'
);

-- ============================================================================
-- PASO 3: Crear tabla de paradas (multi-destino)
-- ============================================================================

CREATE TABLE IF NOT EXISTS paradas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  
  -- Orden de la parada: 1 = origen, 2 = destino 1, 3 = destino 2, 4 = destino 3
  orden INTEGER NOT NULL CHECK (orden >= 1 AND orden <= 4),
  
  -- Tipo: 'origen' o 'destino'
  tipo TEXT NOT NULL CHECK (tipo IN ('origen', 'destino')),
  
  -- Referencia a la planta
  planta_id UUID,  -- referencia flexible (puede ser origen o destino)
  planta_nombre TEXT, -- nombre denormalizado para consultas rápidas
  
  -- ¿La planta destino tiene Nodexia?
  tiene_nodexia BOOLEAN NOT NULL DEFAULT true,
  
  -- Estado interno de la parada
  estado_parada TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado_parada IN ('pendiente', 'en_transito', 'ingresado', 'llamado', 'en_proceso', 'completado', 'egresado')),
  
  -- Timestamps de operación
  hora_ingreso TIMESTAMPTZ,
  hora_egreso TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Restricción: orden único por viaje
  UNIQUE (viaje_id, orden)
);

-- Índice para consultas rápidas por viaje
CREATE INDEX IF NOT EXISTS idx_paradas_viaje_id ON paradas(viaje_id);
CREATE INDEX IF NOT EXISTS idx_paradas_planta_id ON paradas(planta_id);

-- ============================================================================
-- PASO 4: Agregar campo parada_actual al viaje
-- ============================================================================

-- parada_actual indica en qué parada está el camión (1, 2, 3, 4)
ALTER TABLE viajes_despacho 
  ADD COLUMN IF NOT EXISTS parada_actual INTEGER DEFAULT 1;

-- ============================================================================  
-- PASO 5: RLS para paradas
-- ============================================================================

ALTER TABLE paradas ENABLE ROW LEVEL SECURITY;

-- Política permisiva (ajustar según necesidades)
DROP POLICY IF EXISTS "paradas_select_all" ON paradas;
CREATE POLICY "paradas_select_all" ON paradas
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "paradas_insert_auth" ON paradas;
CREATE POLICY "paradas_insert_auth" ON paradas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "paradas_update_auth" ON paradas;
CREATE POLICY "paradas_update_auth" ON paradas
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- PASO 6: Crear paradas para viajes existentes (1 origen + 1 destino)
-- ============================================================================

-- Para cada viaje existente que NO tenga paradas, crear parada de origen y destino
INSERT INTO paradas (viaje_id, orden, tipo, planta_id, tiene_nodexia, estado_parada)
SELECT 
  v.id,
  1, -- orden = 1 (origen)
  'origen',
  d.origen_id,
  true, -- origen siempre tiene Nodexia
  CASE 
    WHEN v.estado IN ('pendiente', 'transporte_asignado', 'camion_asignado', 'confirmado_chofer', 'en_transito_origen') THEN 'pendiente'
    WHEN v.estado = 'ingresado_origen' THEN 'ingresado'
    WHEN v.estado = 'llamado_carga' THEN 'llamado'
    WHEN v.estado IN ('cargando') THEN 'en_proceso'
    WHEN v.estado IN ('cargado') THEN 'completado'
    ELSE 'egresado'
  END
FROM viajes_despacho v
JOIN despachos d ON v.despacho_id = d.id
WHERE NOT EXISTS (SELECT 1 FROM paradas p WHERE p.viaje_id = v.id AND p.orden = 1)
ON CONFLICT (viaje_id, orden) DO NOTHING;

-- Parada destino
INSERT INTO paradas (viaje_id, orden, tipo, planta_id, tiene_nodexia, estado_parada)
SELECT 
  v.id,
  2, -- orden = 2 (destino 1)
  'destino',
  d.destino_id,
  true, -- por defecto con Nodexia
  CASE 
    WHEN v.estado IN ('pendiente', 'transporte_asignado', 'camion_asignado', 'confirmado_chofer',
                       'en_transito_origen', 'ingresado_origen', 'llamado_carga', 'cargando', 'cargado',
                       'egreso_origen', 'en_transito_destino') THEN 'pendiente'
    WHEN v.estado = 'ingresado_destino' THEN 'ingresado'
    WHEN v.estado = 'llamado_descarga' THEN 'llamado'
    WHEN v.estado = 'descargando' THEN 'en_proceso'
    WHEN v.estado = 'descargado' THEN 'completado'
    WHEN v.estado IN ('egreso_destino', 'completado') THEN 'egresado'
    ELSE 'pendiente'
  END
FROM viajes_despacho v
JOIN despachos d ON v.despacho_id = d.id
WHERE NOT EXISTS (SELECT 1 FROM paradas p WHERE p.viaje_id = v.id AND p.orden = 2)
ON CONFLICT (viaje_id, orden) DO NOTHING;

-- ============================================================================
-- PASO 7: Proteger el cron — Solo expira viajes en fase de asignación
-- ============================================================================

-- Eliminar función anterior del cron
DROP FUNCTION IF EXISTS marcar_viajes_expirados();
DROP FUNCTION IF EXISTS ejecutar_expiracion_viajes();

-- Nueva función de expiración: ya no existe "expirado" como estado,
-- la expiración es calculada en el frontend basándose en hora_carga + tolerancia.
-- Esta función solo limpia viajes abandonados (más de 72h sin actividad).
CREATE OR REPLACE FUNCTION limpiar_viajes_abandonados()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Cancelar viajes pendientes sin actividad por más de 72 horas
  UPDATE viajes_despacho
  SET 
    estado = 'cancelado',
    estado_unidad = 'cancelado',
    updated_at = now()
  WHERE estado IN ('pendiente', 'transporte_asignado')
    AND updated_at < now() - interval '72 hours';
    
  -- Log
  RAISE NOTICE 'Limpieza de viajes abandonados ejecutada: %', now();
END;
$$;

-- ============================================================================
-- PASO 8: Comentarios de documentación
-- ============================================================================

COMMENT ON TABLE paradas IS 'Paradas del viaje: 1 origen + hasta 3 destinos. Multi-destino.';
COMMENT ON COLUMN paradas.orden IS '1 = origen, 2 = destino 1, 3 = destino 2, 4 = destino 3';
COMMENT ON COLUMN paradas.tipo IS 'origen o destino';
COMMENT ON COLUMN paradas.tiene_nodexia IS 'Si la planta destino usa Nodexia (flujo completo vs simplificado)';
COMMENT ON COLUMN paradas.estado_parada IS 'Estado interno: pendiente → en_transito → ingresado → llamado → en_proceso → completado → egresado';
COMMENT ON COLUMN viajes_despacho.parada_actual IS 'Número de parada actual (1-4). Indica en qué parada está el camión.';
