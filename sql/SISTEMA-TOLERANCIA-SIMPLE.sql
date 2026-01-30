-- ============================================================================
-- SISTEMA DE TOLERANCIA - VERSIÓN SIMPLIFICADA
-- ============================================================================

-- Tabla de configuración
CREATE TABLE IF NOT EXISTS configuracion_sistema (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  descripcion text,
  updated_at timestamp with time zone DEFAULT NOW(),
  updated_by uuid
);

-- Configuración inicial
INSERT INTO configuracion_sistema (key, value, descripcion)
VALUES 
  ('ventana_tolerancia_horas', '2'::jsonb, 'Horas de tolerancia después de hora programada'),
  ('notificar_fuera_horario', 'true'::jsonb, 'Enviar notificación cuando viaje pasa a fuera_de_horario')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================================
-- FUNCIÓN ACTUALIZADA
-- ============================================================================

DROP FUNCTION IF EXISTS actualizar_estados_viajes();

CREATE OR REPLACE FUNCTION actualizar_estados_viajes()
RETURNS TABLE (
  viajes_actualizados integer,
  viajes_fuera_horario integer,
  viajes_expirados integer,
  despachos_actualizados integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_actualizados integer := 0;
  v_fuera_horario integer := 0;
  v_expirados integer := 0;
  v_despachos integer := 0;
  v_hora_actual timestamptz;
  v_ventana_horas int;
BEGIN
  v_hora_actual := NOW();
  
  -- Obtener ventana de tolerancia (en horas)
  SELECT (value::text)::int INTO v_ventana_horas
  FROM configuracion_sistema 
  WHERE key = 'ventana_tolerancia_horas';
  
  IF v_ventana_horas IS NULL THEN
    v_ventana_horas := 2;
  END IF;

  -- FUERA DE HORARIO: Pasó hora pero dentro de ventana
  WITH viajes_tarde AS (
    UPDATE viajes_despacho
    SET 
      estado_unidad = 'fuera_de_horario',
      updated_at = NOW()
    WHERE 
      scheduled_at IS NOT NULL
      AND scheduled_at < v_hora_actual
      AND scheduled_at + (v_ventana_horas || ' hours')::interval > v_hora_actual
      AND (chofer_id IS NOT NULL OR camion_id IS NOT NULL)
      AND (estado_unidad IS NULL OR estado_unidad NOT IN ('fuera_de_horario', 'demorado', 'expirado', 'en_curso', 'finalizado', 'cancelado'))
      AND estado NOT IN ('cancelado', 'finalizado')
      AND (estado_tracking IS NULL OR estado_tracking != 'en_curso')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_fuera_horario FROM viajes_tarde;

  -- EXPIRADO: Sin recursos O pasó ventana de tolerancia
  WITH viajes_vencidos AS (
    UPDATE viajes_despacho
    SET 
      estado_unidad = 'expirado',
      updated_at = NOW()
    WHERE 
      scheduled_at IS NOT NULL
      AND (
        (scheduled_at < v_hora_actual AND chofer_id IS NULL AND camion_id IS NULL)
        OR
        (scheduled_at + (v_ventana_horas || ' hours')::interval < v_hora_actual 
         AND (estado_tracking IS NULL OR estado_tracking != 'en_curso'))
      )
      AND (estado_unidad IS NULL OR estado_unidad NOT IN ('demorado', 'expirado', 'en_curso', 'finalizado', 'cancelado'))
      AND estado NOT IN ('cancelado', 'finalizado')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_expirados FROM viajes_vencidos;

  -- Actualizar despachos
  WITH despachos_actualizados AS (
    UPDATE despachos d
    SET 
      estado = CASE
        WHEN EXISTS (SELECT 1 FROM viajes_despacho vd WHERE vd.despacho_id = d.id AND vd.estado_unidad = 'expirado') THEN 'expirado'
        WHEN EXISTS (SELECT 1 FROM viajes_despacho vd WHERE vd.despacho_id = d.id AND vd.estado_unidad = 'fuera_de_horario') THEN 'fuera_de_horario'
        ELSE d.estado
      END,
      updated_at = NOW()
    WHERE d.id IN (
      SELECT DISTINCT despacho_id 
      FROM viajes_despacho 
      WHERE estado_unidad IN ('expirado', 'fuera_de_horario')
    )
    AND d.estado NOT IN ('cancelado', 'finalizado')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_despachos FROM despachos_actualizados;

  v_total_actualizados := v_fuera_horario + v_expirados;

  RETURN QUERY SELECT v_total_actualizados, v_fuera_horario, v_expirados, v_despachos;
END;
$$;

-- Ejecutar
SELECT * FROM actualizar_estados_viajes();

-- Verificar viaje
SELECT 
  id,
  scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires' as programado,
  (scheduled_at + interval '2 hours') AT TIME ZONE 'America/Argentina/Buenos_Aires' as limite_tolerancia,
  NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires' as ahora,
  estado_unidad,
  CASE 
    WHEN chofer_id IS NOT NULL OR camion_id IS NOT NULL THEN 'Con recursos'
    ELSE 'Sin recursos'
  END as recursos
FROM viajes_despacho
WHERE id = 'c8ed01c3-ea76-4039-a509-6b7882b1a63c';
