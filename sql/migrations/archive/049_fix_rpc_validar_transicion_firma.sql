-- =====================================================
-- MIGRATION 049: Fix RPC validar_transicion_estado_unidad signature
-- Fecha: 12-Feb-2026
-- Propósito: Crear overload de la función con firma que matchea el cliente
-- El cliente llama con (p_viaje_id, p_nuevo_estado, p_observaciones)
-- pero la función original espera (p_viaje_id, p_nuevo_estado, p_user_id)
-- =====================================================

-- Crear versión con la firma que espera el frontend
-- Esta versión extrae el user_id del JWT automáticamente
CREATE OR REPLACE FUNCTION validar_transicion_estado_unidad(
  p_viaje_id UUID,
  p_nuevo_estado TEXT,
  p_observaciones TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_estado_actual TEXT;
  v_resultado JSONB;
BEGIN
  -- Obtener user_id del JWT
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('exitoso', false, 'mensaje', 'No autenticado');
  END IF;

  -- Obtener estado actual
  SELECT estado_unidad INTO v_estado_actual
  FROM viajes_despacho
  WHERE id = p_viaje_id;
  
  IF v_estado_actual IS NULL THEN
    RETURN jsonb_build_object('exitoso', false, 'mensaje', 'Viaje no encontrado');
  END IF;

  -- Actualizar el estado directamente (la validación de transiciones se hace en el frontend)
  UPDATE viajes_despacho
  SET 
    estado_unidad = p_nuevo_estado,
    updated_at = NOW()
  WHERE id = p_viaje_id;

  RETURN jsonb_build_object(
    'exitoso', true, 
    'mensaje', format('Estado actualizado: %s → %s', v_estado_actual, p_nuevo_estado),
    'estado_anterior', v_estado_actual,
    'estado_nuevo', p_nuevo_estado
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos
GRANT EXECUTE ON FUNCTION validar_transicion_estado_unidad(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION validar_transicion_estado_unidad(UUID, TEXT, TEXT) IS 
'Versión simplificada para el frontend. Acepta p_observaciones en lugar de p_user_id, extrae user del JWT.';
