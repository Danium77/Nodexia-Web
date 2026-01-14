-- =====================================================
-- MIGRACIÓN 016: Sistema de Reprogramación y Trazabilidad
-- =====================================================
-- Fecha: 2026-01-10
-- Descripción: Agrega campos para trackear viajes expirados que fueron
--              reprogramados, permitiendo KPIs gerenciales y trazabilidad
--              histórica sin complicar el flujo operativo.
-- =====================================================

BEGIN;

-- =====================================================
-- 1. AGREGAR CAMPOS DE HISTÓRICO A viajes_despacho
-- =====================================================

ALTER TABLE viajes_despacho 
  ADD COLUMN IF NOT EXISTS fue_expirado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_expiracion_original TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cantidad_reprogramaciones INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motivo_reprogramacion TEXT;

COMMENT ON COLUMN viajes_despacho.fue_expirado IS 
  'Indica si este viaje alguna vez fue marcado como expirado. Permite trackear recuperaciones.';
  
COMMENT ON COLUMN viajes_despacho.fecha_expiracion_original IS 
  'Timestamp de cuando el viaje expiró por primera vez. Para análisis de demoras.';
  
COMMENT ON COLUMN viajes_despacho.cantidad_reprogramaciones IS 
  'Contador de cuántas veces se reprogramó este viaje. Indicador de problemas recurrentes.';
  
COMMENT ON COLUMN viajes_despacho.motivo_reprogramacion IS 
  'Última razón registrada para la reprogramación (texto libre).';

-- =====================================================
-- 2. ACTUALIZAR VIAJES YA EXPIRADOS (datos históricos)
-- =====================================================

-- Marcar como expirados los que ya están en ese estado
UPDATE viajes_despacho
SET 
  fue_expirado = true,
  fecha_expiracion_original = updated_at
WHERE estado_carga = 'expirado'
  AND fue_expirado = false;

-- =====================================================
-- 3. ÍNDICE PARA QUERIES DE KPIs
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_viajes_fue_expirado 
  ON viajes_despacho(fue_expirado) 
  WHERE fue_expirado = true;

CREATE INDEX IF NOT EXISTS idx_viajes_reprogramaciones 
  ON viajes_despacho(cantidad_reprogramaciones) 
  WHERE cantidad_reprogramaciones > 0;

-- =====================================================
-- 4. FUNCIÓN PARA REPROGRAMAR VIAJE
-- =====================================================

CREATE OR REPLACE FUNCTION reprogramar_viaje(
  p_viaje_id UUID,
  p_nueva_fecha_hora TIMESTAMPTZ,
  p_motivo TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  mensaje TEXT,
  viaje_id UUID
) AS $$
DECLARE
  v_estado_actual TEXT;
  v_fue_expirado BOOLEAN;
BEGIN
  -- Verificar que el viaje existe y está expirado
  SELECT estado_carga, fue_expirado
  INTO v_estado_actual, v_fue_expirado
  FROM viajes_despacho
  WHERE id = p_viaje_id;

  IF v_estado_actual IS NULL THEN
    RETURN QUERY SELECT false, 'Viaje no encontrado'::TEXT, p_viaje_id;
    RETURN;
  END IF;

  IF v_estado_actual != 'expirado' THEN
    RETURN QUERY SELECT false, 'El viaje no está en estado expirado'::TEXT, p_viaje_id;
    RETURN;
  END IF;

  -- Actualizar el viaje
  UPDATE viajes_despacho v
  SET 
    estado_carga = 'pendiente_asignacion',
    estado_unidad = NULL,
    estado = 'pendiente', -- Legacy
    fue_expirado = true,
    fecha_expiracion_original = COALESCE(fecha_expiracion_original, v.updated_at),
    cantidad_reprogramaciones = cantidad_reprogramaciones + 1,
    motivo_reprogramacion = COALESCE(p_motivo, motivo_reprogramacion),
    updated_at = NOW()
  WHERE id = p_viaje_id;

  -- Actualizar la fecha en el despacho asociado
  UPDATE despachos d
  SET 
    scheduled_at = p_nueva_fecha_hora,
    updated_at = NOW()
  FROM viajes_despacho v
  WHERE v.id = p_viaje_id
    AND d.id = v.despacho_id;

  RETURN QUERY SELECT true, 'Viaje reprogramado exitosamente'::TEXT, p_viaje_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reprogramar_viaje IS 
  'Reprograma un viaje expirado, actualizando fecha y marcando el histórico para KPIs.';

-- =====================================================
-- 5. VISTA PARA KPIs GERENCIALES
-- =====================================================

CREATE OR REPLACE VIEW vista_kpis_expiracion AS
SELECT 
  -- Totales
  COUNT(*) FILTER (WHERE fue_expirado = true) AS total_expirados_historico,
  COUNT(*) FILTER (WHERE estado_carga = 'expirado') AS expirados_actuales,
  COUNT(*) FILTER (WHERE fue_expirado = true AND estado_carga != 'expirado') AS recuperados,
  
  -- Tasa de recuperación
  ROUND(
    COUNT(*) FILTER (WHERE fue_expirado = true AND estado_carga = 'completado') * 100.0 / 
    NULLIF(COUNT(*) FILTER (WHERE fue_expirado = true), 0),
    2
  ) AS tasa_recuperacion_pct,
  
  -- Reprogramaciones
  COUNT(*) FILTER (WHERE cantidad_reprogramaciones > 0) AS total_reprogramados,
  COUNT(*) FILTER (WHERE cantidad_reprogramaciones > 1) AS con_multiples_reprogramaciones,
  AVG(cantidad_reprogramaciones) FILTER (WHERE cantidad_reprogramaciones > 0) AS promedio_reprogramaciones,
  
  -- Por razón de expiración
  COUNT(*) FILTER (WHERE fue_expirado = true AND chofer_id IS NULL AND camion_id IS NULL) AS sin_recursos,
  COUNT(*) FILTER (WHERE fue_expirado = true AND chofer_id IS NULL AND camion_id IS NOT NULL) AS sin_chofer,
  COUNT(*) FILTER (WHERE fue_expirado = true AND chofer_id IS NOT NULL AND camion_id IS NULL) AS sin_camion
  
FROM viajes_despacho;

COMMENT ON VIEW vista_kpis_expiracion IS 
  'KPIs gerenciales sobre viajes expirados, recuperaciones y reprogramaciones.';

-- =====================================================
-- 6. ACTUALIZAR FUNCIÓN marcar_viajes_expirados
-- =====================================================

-- Actualizar para marcar fue_expirado en el momento de expiración
CREATE OR REPLACE FUNCTION marcar_viajes_expirados()
RETURNS TABLE(
  viaje_id UUID,
  pedido_id TEXT,
  razon_expiracion TEXT,
  estado_anterior_carga TEXT,
  estado_anterior_unidad TEXT
) AS $$
BEGIN
  RETURN QUERY
  UPDATE viajes_despacho v
  SET 
    estado_carga = 'expirado',
    estado_unidad = COALESCE(estado_unidad, 'expirado'),
    estado = 'expirado', -- Legacy
    fue_expirado = true, -- 🆕 Marcar histórico
    fecha_expiracion_original = COALESCE(fecha_expiracion_original, NOW()), -- 🆕 Primera expiración
    updated_at = NOW()
  FROM despachos d
  WHERE v.despacho_id = d.id
    AND d.scheduled_at < NOW()
    AND (v.chofer_id IS NULL OR v.camion_id IS NULL)
    AND v.estado_carga NOT IN ('expirado', 'completado', 'cancelado')
  RETURNING 
    v.id AS viaje_id,
    d.pedido_id,
    CASE 
      WHEN v.chofer_id IS NULL AND v.camion_id IS NULL THEN 'Sin chofer ni camión asignado'
      WHEN v.chofer_id IS NULL THEN 'Sin chofer asignado'
      WHEN v.camion_id IS NULL THEN 'Sin camión asignado'
    END AS razon_expiracion,
    v.estado_carga AS estado_anterior_carga,
    v.estado_unidad AS estado_anterior_unidad;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- =====================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =====================================================

-- Ver campos nuevos
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'viajes_despacho'
  AND column_name IN ('fue_expirado', 'fecha_expiracion_original', 'cantidad_reprogramaciones', 'motivo_reprogramacion')
ORDER BY column_name;

-- Ver KPIs actuales
SELECT * FROM vista_kpis_expiracion;

-- Ver viajes expirados con histórico
SELECT 
  v.id,
  d.pedido_id,
  v.estado_carga,
  v.fue_expirado,
  v.fecha_expiracion_original,
  v.cantidad_reprogramaciones,
  v.motivo_reprogramacion
FROM viajes_despacho v
JOIN despachos d ON v.despacho_id = d.id
WHERE v.fue_expirado = true
ORDER BY v.fecha_expiracion_original DESC
LIMIT 10;
