-- =====================================================
-- FIX: Función reprogramar_viaje() - Remover updated_at
-- =====================================================
-- La tabla despachos no tiene columna updated_at

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
  v_despacho_id UUID;
BEGIN
  -- Verificar que el viaje existe y está expirado
  SELECT estado_carga, despacho_id
  INTO v_estado_actual, v_despacho_id
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

  -- Actualizar el viaje (limpiando recursos asignados)
  UPDATE viajes_despacho
  SET 
    estado_carga = 'pendiente_asignacion',
    estado_unidad = NULL,
    estado = 'pendiente', -- Legacy
    fue_expirado = true,
    fecha_expiracion_original = COALESCE(fecha_expiracion_original, NOW()),
    cantidad_reprogramaciones = cantidad_reprogramaciones + 1,
    motivo_reprogramacion = COALESCE(p_motivo, motivo_reprogramacion),
    -- 🔥 LIMPIAR RECURSOS ASIGNADOS para reiniciar el proceso
    chofer_id = NULL,
    camion_id = NULL,
    acoplado_id = NULL,
    transport_id = NULL
  WHERE id = p_viaje_id;

  -- Actualizar la fecha en el despacho asociado (SIN updated_at)
  UPDATE despachos
  SET scheduled_at = p_nueva_fecha_hora
  WHERE id = v_despacho_id;

  RETURN QUERY SELECT true, 'Viaje reprogramado exitosamente'::TEXT, p_viaje_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reprogramar_viaje IS 
  'Reprograma un viaje expirado, actualizando fecha y marcando el histórico para KPIs. Fixed: removed updated_at references.';
