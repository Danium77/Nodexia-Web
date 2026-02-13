-- Migración 057: Fix RLS recursion + Proteger viajes activos del cron
-- 
-- Problema 1: La migración 056 creó una política RLS en viajes_red_nodexia
-- que causa "infinite recursion detected" (42P17). La política es redundante
-- con "transportes_select_viajes_con_ofertas" de migración 018.
--
-- Problema 2: El cron marcar_viajes_expirados() puede expirar viajes/despachos
-- que ya están en estados activos (en planta, en tránsito, etc.)
--
-- Fecha: 2026-02-16

-- ============================================================================
-- PARTE 1: Eliminar política RLS problemática de migración 056
-- ============================================================================

-- La política "Transportes ven viajes con sus ofertas" causa recursión infinita
-- Ya existe "transportes_select_viajes_con_ofertas" (migración 018) que hace lo mismo
DROP POLICY IF EXISTS "Transportes ven viajes con sus ofertas" ON viajes_red_nodexia;

-- Verificar que la política correcta sigue existiendo (no tocar)
-- "transportes_select_viajes_con_ofertas" usa: id IN (SELECT viaje_red_id FROM ofertas_red_nodexia WHERE transporte_id IN (SELECT get_user_empresas()))

-- ============================================================================
-- PARTE 2: Actualizar función de expiración para proteger viajes activos
-- ============================================================================

-- Los viajes en estos estados NO deben ser expirados por el cron:
-- - Cualquier estado de planta (ingresado_*, en_playa_*, llamado_*, cargando, etc.)
-- - Cualquier estado de tránsito (en_transito_*, arribo_*, etc.)
-- - Estados finales (viaje_completado, completado, cancelado)

DROP FUNCTION IF EXISTS marcar_viajes_expirados();
CREATE OR REPLACE FUNCTION marcar_viajes_expirados()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  viajes_expirados INTEGER := 0;
  despachos_actualizados INTEGER := 0;
BEGIN
  -- Solo expirar viajes que:
  -- 1. NO tienen chofer Y/O camión asignado
  -- 2. La fecha programada ya pasó (con tolerancia de 2 horas)
  -- 3. NO están en estados activos (en planta, en tránsito, etc.)
  -- 4. NO están en estados finales
  UPDATE viajes_despacho
  SET 
    estado = 'expirado',
    estado_carga = COALESCE(estado_carga, 'expirado'),
    estado_unidad = COALESCE(estado_unidad, 'expirado'),
    fue_expirado = true,
    fecha_expiracion_original = COALESCE(fecha_expiracion_original, NOW()),
    updated_at = NOW()
  WHERE 
    -- Solo viajes sin recursos completos
    (chofer_id IS NULL OR camion_id IS NULL)
    -- Fecha programada ya pasó (con 2h de tolerancia)
    AND (
      (scheduled_at IS NOT NULL AND scheduled_at < NOW() - INTERVAL '2 hours')
      OR (scheduled_local_date IS NOT NULL AND 
          (scheduled_local_date || ' ' || COALESCE(scheduled_local_time, '00:00:00'))::timestamp 
          < NOW() - INTERVAL '2 hours')
    )
    -- NO expirar viajes que ya están en estados activos o finales
    AND estado NOT IN (
      -- Estados de planta origen
      'ingresado_origen', 'en_playa_origen', 'llamado_carga', 'cargando', 'cargado', 'egreso_origen',
      -- Estados de tránsito
      'en_transito_origen', 'arribo_origen', 'en_transito_destino', 'arribo_destino', 'arribado_destino',
      -- Estados de planta destino
      'ingresado_destino', 'llamado_descarga', 'descargando', 'descargado', 'egreso_destino',
      -- Estados finales
      'vacio', 'viaje_completado', 'completado', 'cancelado', 'cancelado_por_transporte',
      -- Ya expirado
      'expirado'
    );

  GET DIAGNOSTICS viajes_expirados = ROW_COUNT;

  -- Actualizar despachos padre: solo si TODOS sus viajes están en estado final/expirado
  -- NO marcar despacho como expirado si tiene algún viaje activo
  UPDATE despachos d
  SET 
    estado = 'expirado',
    updated_at = NOW()
  WHERE 
    d.estado NOT IN ('completado', 'cancelado', 'expirado', 'en_transito')
    -- Solo si NO tiene viajes activos
    AND NOT EXISTS (
      SELECT 1 FROM viajes_despacho v 
      WHERE v.despacho_id = d.id 
      AND v.estado NOT IN ('expirado', 'cancelado', 'cancelado_por_transporte', 'viaje_completado', 'completado', 'pendiente')
    )
    -- Y tiene al menos un viaje expirado
    AND EXISTS (
      SELECT 1 FROM viajes_despacho v 
      WHERE v.despacho_id = d.id 
      AND v.estado = 'expirado'
    );

  GET DIAGNOSTICS despachos_actualizados = ROW_COUNT;

  IF viajes_expirados > 0 OR despachos_actualizados > 0 THEN
    RAISE NOTICE 'Expiración: % viajes expirados, % despachos actualizados', 
      viajes_expirados, despachos_actualizados;
  END IF;
END;
$$;

-- ============================================================================
-- PARTE 3: Wrapper para pg_cron (si existe)
-- ============================================================================

DROP FUNCTION IF EXISTS ejecutar_expiracion_viajes();
CREATE OR REPLACE FUNCTION ejecutar_expiracion_viajes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM marcar_viajes_expirados();
END;
$$;

-- ============================================================================
-- PARTE 4: Limpiar despachos incorrectamente marcados como "expirado"
-- Si un despacho tiene viajes activos, restaurar su estado
-- ============================================================================

-- Fix despachos que están expirados pero tienen viajes activos
UPDATE despachos d
SET 
  estado = 'en_transito',
  updated_at = NOW()
WHERE 
  d.estado = 'expirado'
  AND EXISTS (
    SELECT 1 FROM viajes_despacho v 
    WHERE v.despacho_id = d.id 
    AND v.estado IN (
      'transporte_asignado', 'camion_asignado', 'confirmado_chofer',
      'en_transito_origen', 'arribo_origen',
      'ingresado_origen', 'en_playa_origen', 'llamado_carga', 'cargando', 'cargado', 'egreso_origen',
      'en_transito_destino', 'arribo_destino', 'arribado_destino',
      'ingresado_destino', 'llamado_descarga', 'descargando', 'descargado', 'egreso_destino',
      'vacio'
    )
  );

-- Fix viajes que están expirados pero tienen recursos asignados Y 
-- su estado_unidad indica que están activos
UPDATE viajes_despacho
SET 
  estado = estado_unidad,
  updated_at = NOW()
WHERE 
  estado = 'expirado'
  AND estado_unidad IS NOT NULL
  AND estado_unidad != 'expirado'
  AND estado_unidad IN (
    'transporte_asignado', 'camion_asignado', 'confirmado_chofer',
    'en_transito_origen', 'arribo_origen',
    'ingresado_origen', 'en_playa_origen', 'llamado_carga', 'cargando', 'cargado', 'egreso_origen',
    'en_transito_destino', 'arribo_destino', 'arribado_destino',
    'ingresado_destino', 'llamado_descarga', 'descargando', 'descargado', 'egreso_destino',
    'vacio'
  );
