-- ============================================================================
-- SISTEMA DE EXPIRACIÓN CON VENTANA DE TOLERANCIA
-- ============================================================================
-- Lógica:
-- - fuera_de_horario: Pasó hora programada pero dentro de ventana tolerancia
-- - expirado: Pasó hora + ventana de tolerancia sin iniciar
-- - demorado: Incidencia reportada por chofer/transporte
-- ============================================================================

-- Tabla de configuración (para hacer la ventana configurable)
CREATE TABLE IF NOT EXISTS configuracion_sistema (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  descripcion text,
  updated_at timestamp with time zone DEFAULT NOW(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insertar configuración de ventana de tolerancia (2 horas por defecto)
INSERT INTO configuracion_sistema (key, value, descripcion)
VALUES 
  ('ventana_tolerancia_horas', '2'::jsonb, 'Horas de tolerancia después de hora programada antes de marcar como expirado'),
  ('notificar_fuera_horario', 'true'::jsonb, 'Enviar notificación cuando viaje pasa a fuera_de_horario')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- FUNCIÓN ACTUALIZADA: Estados con ventana de tolerancia
-- ============================================================================

DROP FUNCTION IF EXISTS actualizar_estados_viajes();

CREATE OR REPLACE FUNCTION actualizar_estados_viajes()
RETURNS TABLE (
  viajes_actualizados integer,
  viajes_fuera_horario integer,
  viajes_expirados integer,
  despachos_fuera_horario integer,
  despachos_expirados integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_actualizados integer := 0;
  v_fuera_horario integer := 0;
  v_expirados integer := 0;
  v_despachos_fuera_horario integer := 0;
  v_despachos_expirados integer := 0;
  v_hora_actual timestamptz;
  v_ventana_tolerancia interval;
BEGIN
  -- Obtener hora actual
  v_hora_actual := NOW();
  
  -- Obtener ventana de tolerancia desde configuración
  SELECT (value::text::int || ' hours')::interval 
  INTO v_ventana_tolerancia
  FROM configuracion_sistema 
  WHERE key = 'ventana_tolerancia_horas';
  
  -- Si no existe configuración, usar 2 horas por defecto
  IF v_ventana_tolerancia IS NULL THEN
    v_ventana_tolerancia := '2 hours'::interval;
  END IF;

  -- ============================================================================
  -- REGLA 1: FUERA DE HORARIO
  -- Pasó hora programada PERO está dentro de ventana de tolerancia
  -- Tiene recursos asignados (chofer/camión)
  -- ============================================================================
  WITH viajes_tarde AS (
    UPDATE viajes_despacho
    SET 
      estado_unidad = 'fuera_de_horario',
      updated_at = NOW()
    WHERE 
      scheduled_at IS NOT NULL
      AND scheduled_at < v_hora_actual  -- Ya pasó la hora
      AND scheduled_at + v_ventana_tolerancia > v_hora_actual  -- Pero dentro de ventana tolerancia
      AND (chofer_id IS NOT NULL OR camion_id IS NOT NULL)  -- Tiene recursos
      AND (estado_unidad IS NULL OR estado_unidad NOT IN ('fuera_de_horario', 'demorado', 'expirado', 'en_curso', 'finalizado', 'cancelado'))
      AND estado NOT IN ('cancelado', 'finalizado')
      AND (estado_tracking IS NULL OR estado_tracking != 'en_curso')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_fuera_horario FROM viajes_tarde;

  -- ============================================================================
  -- REGLA 2: EXPIRADO
  -- Opción A: Sin recursos Y pasó la hora
  -- Opción B: Con recursos PERO pasó ventana de tolerancia sin iniciar ni reportar
  -- ============================================================================
  WITH viajes_vencidos AS (
    UPDATE viajes_despacho
    SET 
      estado_unidad = 'expirado',
      updated_at = NOW()
    WHERE 
      scheduled_at IS NOT NULL
      AND (
        -- Caso A: Sin recursos y pasó la hora
        (
          scheduled_at < v_hora_actual
          AND (chofer_id IS NULL AND camion_id IS NULL)
        )
        OR
        -- Caso B: Con recursos pero pasó ventana tolerancia sin iniciar
        (
          scheduled_at + v_ventana_tolerancia < v_hora_actual
          AND (chofer_id IS NOT NULL OR camion_id IS NOT NULL)
          AND (estado_tracking IS NULL OR estado_tracking != 'en_curso')
        )
      )
      AND (estado_unidad IS NULL OR estado_unidad NOT IN ('demorado', 'expirado', 'en_curso', 'finalizado', 'cancelado'))
      AND estado NOT IN ('cancelado', 'finalizado')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_expirados FROM viajes_vencidos;

  -- ============================================================================
  -- REGLA 3: Actualizar DESPACHOS según estado de sus viajes
  -- ============================================================================
  
  -- Despachos con viajes fuera_de_horario
  WITH despachos_tarde AS (
    UPDATE despachos d
    SET 
      estado = 'fuera_de_horario',
      updated_at = NOW()
    WHERE d.id IN (
      SELECT DISTINCT vd.despacho_id
      FROM viajes_despacho vd
      WHERE vd.estado_unidad = 'fuera_de_horario'
        AND NOT EXISTS (
          SELECT 1 FROM viajes_despacho vd2 
          WHERE vd2.despacho_id = vd.despacho_id 
          AND vd2.estado_unidad = 'expirado'
        )
    )
    AND d.estado NOT IN ('expirado', 'cancelado', 'finalizado')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_despachos_fuera_horario FROM despachos_tarde;

  -- Despachos con al menos un viaje expirado
  WITH despachos_vencidos AS (
    UPDATE despachos d
    SET 
      estado = 'expirado',
      updated_at = NOW()
    WHERE d.id IN (
      SELECT DISTINCT vd.despacho_id
      FROM viajes_despacho vd
      WHERE vd.estado_unidad = 'expirado'
    )
    AND d.estado NOT IN ('cancelado', 'finalizado')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_despachos_expirados FROM despachos_vencidos;

  v_total_actualizados := v_fuera_horario + v_expirados;

  RETURN QUERY SELECT v_total_actualizados, v_fuera_horario, v_expirados, v_despachos_fuera_horario, v_despachos_expirados;
END;
$$;

-- ============================================================================
-- FUNCIÓN: Obtener métricas actualizadas
-- ============================================================================

DROP FUNCTION IF EXISTS get_metricas_expiracion();

CREATE OR REPLACE FUNCTION get_metricas_expiracion()
RETURNS TABLE (
  total_fuera_horario bigint,
  total_expirados bigint,
  total_demorados bigint,
  fuera_horario_hoy bigint,
  expirados_hoy bigint,
  demorados_hoy bigint
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
    COUNT(*) FILTER (WHERE estado_unidad = 'fuera_de_horario'),
    COUNT(*) FILTER (WHERE estado_unidad = 'expirado'),
    COUNT(*) FILTER (WHERE estado_unidad = 'demorado'),
    COUNT(*) FILTER (WHERE estado_unidad = 'fuera_de_horario' AND scheduled_at::date = v_fecha_hoy),
    COUNT(*) FILTER (WHERE estado_unidad = 'expirado' AND scheduled_at::date = v_fecha_hoy),
    COUNT(*) FILTER (WHERE estado_unidad = 'demorado' AND scheduled_at::date = v_fecha_hoy)
  FROM viajes_despacho
  WHERE estado NOT IN ('cancelado', 'finalizado');
END;
$$;

-- ============================================================================
-- TEST: Ejecutar y verificar
-- ============================================================================

-- Ver configuración
SELECT * FROM configuracion_sistema WHERE key = 'ventana_tolerancia_horas';

-- Ejecutar función
SELECT * FROM actualizar_estados_viajes();

-- Ver métricas
SELECT * FROM get_metricas_expiracion();

-- Verificar viaje específico
SELECT 
  id,
  scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires' as hora_programada,
  scheduled_at + (SELECT (value::text::int || ' hours')::interval FROM configuracion_sistema WHERE key = 'ventana_tolerancia_horas') AT TIME ZONE 'America/Argentina/Buenos_Aires' as limite_tolerancia,
  NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires' as ahora,
  estado_unidad,
  chofer_id,
  camion_id
FROM viajes_despacho
WHERE id = 'c8ed01c3-ea76-4039-a509-6b7882b1a63c';
