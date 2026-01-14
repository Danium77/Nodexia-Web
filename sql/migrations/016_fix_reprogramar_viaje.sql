-- =====================================================
-- FIX: Actualizar función reprogramar_viaje
-- =====================================================
-- Fecha: 2026-01-11
-- Cambios:
-- 1. Limpiar transport_id en viajes_despacho (para reasignación)
-- 2. Limpiar transport_id en despachos
-- 3. Actualizar scheduled_local_date y scheduled_local_time
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
  v_nueva_fecha_local DATE;
  v_nueva_hora_local TIME;
BEGIN
  -- Extraer fecha y hora local de la nueva fecha/hora
  v_nueva_fecha_local := p_nueva_fecha_hora::DATE;
  v_nueva_hora_local := p_nueva_fecha_hora::TIME;

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

  -- 🔄 Actualizar el viaje (limpiar transporte para reasignación)
  UPDATE viajes_despacho v
  SET 
    estado_carga = 'pendiente_asignacion',
    estado_unidad = NULL,
    estado = 'pendiente', -- Legacy
    transport_id = NULL, -- 🆕 Limpiar transporte para reiniciar asignación
    fue_expirado = true,
    fecha_expiracion_original = COALESCE(fecha_expiracion_original, v.updated_at),
    cantidad_reprogramaciones = cantidad_reprogramaciones + 1,
    motivo_reprogramacion = COALESCE(p_motivo, motivo_reprogramacion),
    updated_at = NOW()
  WHERE id = p_viaje_id;

  -- 🔄 Actualizar el despacho asociado (fecha, hora y limpiar transporte)
  UPDATE despachos d
  SET 
    scheduled_at = p_nueva_fecha_hora,
    scheduled_local_date = v_nueva_fecha_local, -- 🆕 Actualizar fecha local
    scheduled_local_time = v_nueva_hora_local, -- 🆕 Actualizar hora local
    transport_id = NULL, -- 🆕 Limpiar transporte
    estado = 'pendiente_transporte', -- 🆕 Volver a estado inicial
    updated_at = NOW()
  FROM viajes_despacho v
  WHERE v.id = p_viaje_id
    AND d.id = v.despacho_id;

  RETURN QUERY SELECT true, 'Viaje reprogramado exitosamente'::TEXT, p_viaje_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reprogramar_viaje IS 
  'Reprograma un viaje expirado, limpiando transporte asignado y actualizando fecha/hora para reiniciar el proceso de asignación.';
