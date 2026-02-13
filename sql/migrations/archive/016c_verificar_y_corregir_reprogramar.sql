-- =====================================================
-- VERIFICAR Y CORREGIR: Función reprogramar_viaje()
-- =====================================================
-- Este script verifica si la función tiene la limpieza de recursos
-- y la recrea si es necesario

-- 1️⃣ VERIFICAR estado actual de la función
-- Ejecuta esto primero para ver qué versión tienes:
/*
SELECT 
  proname as nombre_funcion,
  pg_get_functiondef(oid) as definicion
FROM pg_proc 
WHERE proname = 'reprogramar_viaje';
*/

-- 2️⃣ RECREAR la función con limpieza de recursos
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
  'Reprograma un viaje expirado, actualizando fecha y marcando el histórico para KPIs. Limpia recursos asignados (chofer, camión, acoplado, transporte).';

-- 3️⃣ VERIFICAR viajes que fueron reprogramados SIN limpiar recursos
-- Esto te mostrará si hay viajes que necesitan corrección manual:
SELECT 
  v.id,
  v.numero_viaje,
  v.estado_carga,
  v.fue_expirado,
  v.cantidad_reprogramaciones,
  v.transport_id,
  v.chofer_id,
  v.camion_id,
  d.pedido_id,
  d.scheduled_at
FROM viajes_despacho v
JOIN despachos d ON v.despacho_id = d.id
WHERE 
  v.fue_expirado = true 
  AND v.cantidad_reprogramaciones > 0
  AND (
    v.transport_id IS NOT NULL 
    OR v.chofer_id IS NOT NULL 
    OR v.camion_id IS NOT NULL
  )
ORDER BY v.created_at DESC;

-- 4️⃣ OPCIONAL: Corregir viajes reprogramados que mantienen recursos asignados
-- ⚠️ Ejecuta esto SOLO si confirmas que los viajes del punto 3 deben limpiarse
/*
UPDATE viajes_despacho
SET 
  transport_id = NULL,
  chofer_id = NULL,
  camion_id = NULL,
  acoplado_id = NULL
WHERE 
  fue_expirado = true 
  AND cantidad_reprogramaciones > 0
  AND estado_carga = 'pendiente_asignacion'
  AND (
    transport_id IS NOT NULL 
    OR chofer_id IS NOT NULL 
    OR camion_id IS NOT NULL
  );
*/
