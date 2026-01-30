-- ============================================================================
-- FUNCIÓN MEJORADA: Actualizar viajes Y despachos
-- ============================================================================

DROP FUNCTION IF EXISTS actualizar_estados_viajes();

CREATE OR REPLACE FUNCTION actualizar_estados_viajes()
RETURNS TABLE (
  viajes_actualizados integer,
  viajes_expirados integer,
  viajes_fuera_de_horario integer,
  despachos_actualizados integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_actualizados integer := 0;
  v_expirados integer := 0;
  v_fuera_horario integer := 0;
  v_despachos_actualizados integer := 0;
  v_hora_actual timestamptz;
BEGIN
  -- Obtener hora actual en UTC
  v_hora_actual := NOW();
  
  -- REGLA 1: EXPIRADO = Sin recursos Y hora pasada
  WITH viajes_sin_recursos AS (
    UPDATE viajes_despacho
    SET 
      estado_unidad = 'expirado',
      updated_at = NOW()
    WHERE 
      scheduled_at IS NOT NULL
      AND scheduled_at < v_hora_actual
      AND (chofer_id IS NULL AND camion_id IS NULL)
      AND (estado_unidad IS NULL OR estado_unidad NOT IN ('expirado', 'fuera_de_horario', 'en_curso', 'finalizado', 'cancelado'))
      AND estado NOT IN ('cancelado', 'finalizado')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_expirados FROM viajes_sin_recursos;

  -- REGLA 2: FUERA DE HORARIO = Con recursos Y hora pasada Y no iniciado
  WITH viajes_tarde AS (
    UPDATE viajes_despacho
    SET 
      estado_unidad = 'fuera_de_horario',
      updated_at = NOW()
    WHERE 
      scheduled_at IS NOT NULL
      AND scheduled_at < v_hora_actual
      AND (chofer_id IS NOT NULL OR camion_id IS NOT NULL)
      AND (estado_unidad IS NULL OR estado_unidad NOT IN ('expirado', 'fuera_de_horario', 'en_curso', 'finalizado', 'cancelado'))
      AND estado NOT IN ('cancelado', 'finalizado')
      AND (estado_tracking IS NULL OR estado_tracking != 'en_curso')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_fuera_horario FROM viajes_tarde;

  -- REGLA 3: Actualizar DESPACHOS que tienen viajes expirados/fuera_de_horario
  WITH despachos_afectados AS (
    UPDATE despachos d
    SET 
      estado = 'expirado',
      updated_at = NOW()
    WHERE d.id IN (
      SELECT DISTINCT vd.despacho_id
      FROM viajes_despacho vd
      WHERE vd.estado_unidad IN ('expirado', 'fuera_de_horario')
    )
    AND d.estado NOT IN ('cancelado', 'finalizado', 'expirado')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_despachos_actualizados FROM despachos_afectados;

  v_total_actualizados := v_expirados + v_fuera_horario;

  RETURN QUERY SELECT v_total_actualizados, v_expirados, v_fuera_horario, v_despachos_actualizados;
END;
$$;

-- Ejecutar función mejorada
SELECT * FROM actualizar_estados_viajes();

-- Verificar resultado
SELECT 
  'Verificación despacho' as info,
  d.pedido_id,
  d.estado as estado_despacho,
  vd.estado_unidad as estado_viaje,
  vd.chofer_id,
  vd.camion_id
FROM despachos d
JOIN viajes_despacho vd ON vd.despacho_id = d.id
WHERE d.pedido_id = 'DSP-20260129-001';
