-- =====================================================
-- MIGRACIÓN FINAL: reprogramar_viaje() COMPLETA
-- =====================================================
-- Esta función hace TODO lo necesario al reprogramar:
-- 1. Limpia transport_id del DESPACHO
-- 2. Limpia transport_id, chofer_id, camion_id, acoplado_id del VIAJE
-- 3. Actualiza scheduled_at del DESPACHO con la nueva fecha

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

  -- 1️⃣ Actualizar el VIAJE (limpiar TODOS los recursos)
  UPDATE viajes_despacho
  SET 
    estado_carga = 'pendiente_asignacion',
    estado_unidad = NULL,
    estado = 'pendiente', -- Legacy
    fue_expirado = true,
    fecha_expiracion_original = COALESCE(fecha_expiracion_original, NOW()),
    cantidad_reprogramaciones = COALESCE(cantidad_reprogramaciones, 0) + 1,
    motivo_reprogramacion = COALESCE(p_motivo, motivo_reprogramacion),
    -- 🔥 LIMPIAR RECURSOS ASIGNADOS
    chofer_id = NULL,
    camion_id = NULL,
    acoplado_id = NULL,
    transport_id = NULL
  WHERE id = p_viaje_id;

  -- 2️⃣ Actualizar el DESPACHO (nueva fecha + limpiar transport_id)
  UPDATE despachos
  SET 
    scheduled_at = p_nueva_fecha_hora,
    transport_id = NULL  -- 🔥 Limpiar transporte del despacho también
  WHERE id = v_despacho_id;

  RETURN QUERY SELECT true, 'Viaje reprogramado exitosamente'::TEXT, p_viaje_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reprogramar_viaje IS 
  'Reprograma un viaje expirado: limpia TODOS los recursos (chofer, camión, acoplado, transporte) y actualiza la fecha programada del despacho.';

-- =====================================================
-- VERIFICACIÓN: Ver la función actualizada
-- =====================================================
SELECT 
  proname as nombre_funcion,
  pg_get_functiondef(oid) as definicion
FROM pg_proc 
WHERE proname = 'reprogramar_viaje';
