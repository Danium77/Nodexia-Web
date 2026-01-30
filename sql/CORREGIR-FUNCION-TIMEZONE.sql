-- ============================================================================
-- CORREGIR FUNCIÓN: Comparación de timezone incorrecta
-- ============================================================================

DROP FUNCTION IF EXISTS actualizar_estados_viajes();

CREATE OR REPLACE FUNCTION actualizar_estados_viajes()
RETURNS TABLE (
  viajes_actualizados integer,
  viajes_expirados integer,
  viajes_fuera_de_horario integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_actualizados integer := 0;
  v_expirados integer := 0;
  v_fuera_horario integer := 0;
  v_hora_actual timestamptz;
BEGIN
  -- Obtener hora actual en UTC (timestamptz)
  v_hora_actual := NOW();
  
  -- REGLA 1: EXPIRADO = Sin recursos (chofer/camión) Y hora pasada
  WITH viajes_sin_recursos AS (
    UPDATE viajes_despacho
    SET 
      estado_unidad = 'expirado',
      updated_at = NOW()
    WHERE 
      scheduled_at IS NOT NULL
      AND scheduled_at < v_hora_actual  -- Comparar timestamptz con timestamptz
      AND (chofer_id IS NULL AND camion_id IS NULL)
      AND (estado_unidad IS NULL OR estado_unidad NOT IN ('expirado', 'fuera_de_horario', 'en_curso', 'finalizado', 'cancelado'))
      AND estado NOT IN ('cancelado', 'finalizado')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_expirados FROM viajes_sin_recursos;

  -- REGLA 2: FUERA DE HORARIO = Con recursos (chofer/camión) Y hora pasada Y no iniciado
  WITH viajes_tarde AS (
    UPDATE viajes_despacho
    SET 
      estado_unidad = 'fuera_de_horario',
      updated_at = NOW()
    WHERE 
      scheduled_at IS NOT NULL
      AND scheduled_at < v_hora_actual  -- Comparar timestamptz con timestamptz
      AND (chofer_id IS NOT NULL OR camion_id IS NOT NULL)
      AND (estado_unidad IS NULL OR estado_unidad NOT IN ('expirado', 'fuera_de_horario', 'en_curso', 'finalizado', 'cancelado'))
      AND estado NOT IN ('cancelado', 'finalizado')
      AND (estado_tracking IS NULL OR estado_tracking != 'en_curso') -- No marcar si ya está en curso
    RETURNING id
  )
  SELECT COUNT(*) INTO v_fuera_horario FROM viajes_tarde;

  v_total_actualizados := v_expirados + v_fuera_horario;

  RETURN QUERY SELECT v_total_actualizados, v_expirados, v_fuera_horario;
END;
$$;

-- Ejecutar función corregida
SELECT 
  'Resultado con función corregida' as info,
  * 
FROM actualizar_estados_viajes();

-- Verificar resultado
SELECT 
  id,
  scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires' as hora_programada,
  estado_unidad,
  chofer_id,
  camion_id
FROM viajes_despacho
WHERE id = 'c8ed01c3-ea76-4039-a509-6b7882b1a63c';
