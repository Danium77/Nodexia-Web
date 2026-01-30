-- PASO 1: Crear tabla configuración
CREATE TABLE IF NOT EXISTS configuracion_sistema (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  descripcion text,
  updated_at timestamp with time zone DEFAULT NOW()
);

-- PASO 2: Insertar configuración
INSERT INTO configuracion_sistema (key, value, descripcion)
VALUES ('ventana_tolerancia_horas', '2'::jsonb, 'Horas de tolerancia después de hora programada')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- PASO 3: Eliminar función anterior
DROP FUNCTION IF EXISTS actualizar_estados_viajes();

-- PASO 4: Crear nueva función
CREATE FUNCTION actualizar_estados_viajes()
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
  v_total integer := 0;
  v_fuera integer := 0;
  v_exp integer := 0;
  v_desp integer := 0;
  v_ahora timestamptz := NOW();
  v_horas int := 2;
BEGIN
  -- Intentar obtener configuración, si no existe usar 2 horas
  BEGIN
    SELECT (value::text)::int INTO v_horas FROM configuracion_sistema WHERE key = 'ventana_tolerancia_horas';
  EXCEPTION WHEN OTHERS THEN
    v_horas := 2;
  END;

  WITH tarde AS (
    UPDATE viajes_despacho SET estado_unidad = 'fuera_de_horario', updated_at = NOW()
    WHERE scheduled_at IS NOT NULL AND scheduled_at < v_ahora 
      AND scheduled_at + (v_horas || ' hours')::interval > v_ahora
      AND (chofer_id IS NOT NULL OR camion_id IS NOT NULL)
      AND (estado_unidad IS NULL OR estado_unidad NOT IN ('fuera_de_horario', 'demorado', 'expirado', 'en_curso', 'finalizado', 'cancelado'))
      AND estado NOT IN ('cancelado', 'finalizado')
      AND (estado_tracking IS NULL OR estado_tracking != 'en_curso')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_fuera FROM tarde;

  WITH vencido AS (
    UPDATE viajes_despacho SET estado_unidad = 'expirado', updated_at = NOW()
    WHERE scheduled_at IS NOT NULL
      AND ((scheduled_at < v_ahora AND chofer_id IS NULL AND camion_id IS NULL)
           OR (scheduled_at + (v_horas || ' hours')::interval < v_ahora AND (estado_tracking IS NULL OR estado_tracking != 'en_curso')))
      AND (estado_unidad IS NULL OR estado_unidad NOT IN ('demorado', 'expirado', 'en_curso', 'finalizado', 'cancelado'))
      AND estado NOT IN ('cancelado', 'finalizado')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_exp FROM vencido;

  WITH desp AS (
    UPDATE despachos d SET 
      estado = CASE WHEN EXISTS (SELECT 1 FROM viajes_despacho WHERE despacho_id = d.id AND estado_unidad = 'expirado') THEN 'expirado'
                    WHEN EXISTS (SELECT 1 FROM viajes_despacho WHERE despacho_id = d.id AND estado_unidad = 'fuera_de_horario') THEN 'fuera_de_horario'
                    ELSE d.estado END,
      updated_at = NOW()
    WHERE d.id IN (SELECT DISTINCT despacho_id FROM viajes_despacho WHERE estado_unidad IN ('expirado', 'fuera_de_horario'))
      AND d.estado NOT IN ('cancelado', 'finalizado')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_desp FROM desp;

  v_total := v_fuera + v_exp;
  RETURN QUERY SELECT v_total, v_fuera, v_exp, v_desp;
END;
$$;

-- PASO 5: Ejecutar
SELECT * FROM actualizar_estados_viajes();

-- PASO 6: Verificar
SELECT 
  'Viaje actualizado' as info,
  estado_unidad, 
  chofer_id IS NOT NULL as tiene_chofer, 
  camion_id IS NOT NULL as tiene_camion
FROM viajes_despacho 
WHERE id = 'c8ed01c3-ea76-4039-a509-6b7882b1a63c';
