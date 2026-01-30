-- ============================================================================
-- SISTEMA DE EXPIRACIÓN - VERSION CORRECTA CON COLUMNAS REALES
-- ============================================================================
-- Usa: scheduled_at (timestamp with time zone) que SÍ existe en la tabla
-- ============================================================================

-- ELIMINAR funciones anteriores incorrectas
DROP FUNCTION IF EXISTS marcar_viajes_expirados();
DROP FUNCTION IF EXISTS actualizar_estados_viajes();
DROP FUNCTION IF EXISTS get_metricas_expiracion();
DROP FUNCTION IF EXISTS ejecutar_expiracion_viajes();

-- ============================================================================
-- FUNCIÓN 1: Actualizar estados de viajes según reglas de negocio
-- ============================================================================
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
  v_hora_actual timestamp;
BEGIN
  -- Obtener hora actual en zona horaria Argentina
  v_hora_actual := NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires';
  
  -- REGLA 1: EXPIRADO = Sin recursos (chofer/camión) Y hora pasada
  WITH viajes_sin_recursos AS (
    UPDATE viajes_despacho
    SET 
      estado_unidad = 'expirado',
      updated_at = NOW()
    WHERE 
      scheduled_at IS NOT NULL
      AND scheduled_at < v_hora_actual
      AND (chofer_id IS NULL AND camion_id IS NULL)
      AND estado_unidad NOT IN ('expirado', 'fuera_de_horario', 'en_curso', 'finalizado', 'cancelado')
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
      AND scheduled_at < v_hora_actual
      AND (chofer_id IS NOT NULL OR camion_id IS NOT NULL)
      AND estado_unidad NOT IN ('expirado', 'fuera_de_horario', 'en_curso', 'finalizado', 'cancelado')
      AND estado NOT IN ('cancelado', 'finalizado')
      AND estado_tracking != 'en_curso' -- No marcar si ya está en curso
    RETURNING id
  )
  SELECT COUNT(*) INTO v_fuera_horario FROM viajes_tarde;

  v_total_actualizados := v_expirados + v_fuera_horario;

  RETURN QUERY SELECT v_total_actualizados, v_expirados, v_fuera_horario;
END;
$$;

-- ============================================================================
-- FUNCIÓN 2: Obtener métricas de viajes expirados y fuera de horario
-- ============================================================================
CREATE OR REPLACE FUNCTION get_metricas_expiracion()
RETURNS TABLE (
  total_expirados bigint,
  total_fuera_de_horario bigint,
  expirados_hoy bigint,
  fuera_horario_hoy bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fecha_hoy date;
BEGIN
  v_fecha_hoy := (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
  
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE estado_unidad = 'expirado'),
    COUNT(*) FILTER (WHERE estado_unidad = 'fuera_de_horario'),
    COUNT(*) FILTER (WHERE estado_unidad = 'expirado' AND scheduled_at::date = v_fecha_hoy),
    COUNT(*) FILTER (WHERE estado_unidad = 'fuera_de_horario' AND scheduled_at::date = v_fecha_hoy)
  FROM viajes_despacho
  WHERE estado NOT IN ('cancelado', 'finalizado');
END;
$$;

-- ============================================================================
-- FUNCIÓN 3: Wrapper para ejecutar desde cron/scheduler
-- ============================================================================
CREATE OR REPLACE FUNCTION ejecutar_expiracion_viajes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resultado RECORD;
  v_metricas RECORD;
BEGIN
  -- Ejecutar actualización
  SELECT * INTO v_resultado FROM actualizar_estados_viajes();
  
  -- Obtener métricas actualizadas
  SELECT * INTO v_metricas FROM get_metricas_expiracion();
  
  -- Retornar resultado en JSON
  RETURN jsonb_build_object(
    'timestamp', NOW(),
    'actualizados', v_resultado.viajes_actualizados,
    'expirados', v_resultado.viajes_expirados,
    'fuera_de_horario', v_resultado.viajes_fuera_de_horario,
    'metricas', jsonb_build_object(
      'total_expirados', v_metricas.total_expirados,
      'total_fuera_horario', v_metricas.total_fuera_de_horario,
      'expirados_hoy', v_metricas.expirados_hoy,
      'fuera_horario_hoy', v_metricas.fuera_horario_hoy
    )
  );
END;
$$;

-- ============================================================================
-- TEST: Ejecutar y ver resultados
-- ============================================================================

-- Ver hora actual
SELECT NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires' as hora_argentina;

-- Ver viajes que deberían actualizarse
SELECT 
  id,
  scheduled_at,
  scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires' as hora_programada_local,
  estado,
  estado_unidad,
  CASE 
    WHEN chofer_id IS NOT NULL OR camion_id IS NOT NULL THEN 'CON recursos'
    ELSE 'SIN recursos'
  END as recursos,
  CASE
    WHEN chofer_id IS NULL AND camion_id IS NULL THEN 'Debería ser EXPIRADO'
    ELSE 'Debería ser FUERA DE HORARIO'
  END as deberia_ser
FROM viajes_despacho
WHERE scheduled_at < (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')
  AND estado_unidad NOT IN ('expirado', 'fuera_de_horario', 'en_curso', 'finalizado', 'cancelado')
ORDER BY scheduled_at DESC;

-- Ejecutar actualización
SELECT * FROM actualizar_estados_viajes();

-- Ver métricas
SELECT * FROM get_metricas_expiracion();

-- Verificar cambios
SELECT 
  id,
  scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires' as hora_programada,
  estado_unidad,
  CASE 
    WHEN chofer_id IS NOT NULL OR camion_id IS NOT NULL THEN 'CON recursos'
    ELSE 'SIN recursos'
  END as recursos
FROM viajes_despacho
WHERE estado_unidad IN ('expirado', 'fuera_de_horario')
ORDER BY scheduled_at DESC;
