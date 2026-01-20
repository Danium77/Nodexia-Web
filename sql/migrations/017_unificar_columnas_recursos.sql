-- =====================================================
-- MIGRACIÓN DE UNIFICACIÓN DE COLUMNAS DE RECURSOS
-- =====================================================
-- Fecha: 18 de Enero 2026
-- Objetivo: Eliminar duplicación de columnas en viajes_despacho
-- 
-- PROBLEMA:
-- La tabla viajes_despacho tiene DOS conjuntos de columnas duplicadas:
--   - Prefijo id_: id_transporte, id_camion, id_acoplado, id_chofer
--   - Sufijo _id: transport_id, camion_id, acoplado_id, chofer_id
--
-- DECISIÓN:
-- Unificar todo al formato SUFIJO _id (transport_id, camion_id, etc.)
-- porque:
--   1. Es el esquema original de la tabla
--   2. Tiene más del doble de usos en el código (166 vs 80)
--   3. Es consistente con otras tablas (despacho_id, usuario_id, etc.)
-- =====================================================

-- ═══════════════════════════════════════════════════════════════════
-- PASO 1: VERIFICAR ESTADO ACTUAL (SOLO LECTURA)
-- ═══════════════════════════════════════════════════════════════════

-- Ver cuántos registros tienen datos en cada columna
SELECT 
  '=== ESTADO ANTES DE MIGRACIÓN ===' as titulo,
  COUNT(*) as total_viajes,
  COUNT(id_transporte) as con_id_transporte,
  COUNT(transport_id) as con_transport_id,
  COUNT(id_camion) as con_id_camion,
  COUNT(camion_id) as con_camion_id,
  COUNT(id_chofer) as con_id_chofer,
  COUNT(chofer_id) as con_chofer_id,
  COUNT(id_acoplado) as con_id_acoplado,
  COUNT(acoplado_id) as con_acoplado_id
FROM viajes_despacho;

-- ═══════════════════════════════════════════════════════════════════
-- PASO 2: MIGRAR DATOS DE COLUMNAS id_ A COLUMNAS _id
-- ═══════════════════════════════════════════════════════════════════

-- Copiar datos de id_transporte a transport_id (solo donde transport_id es NULL)
UPDATE viajes_despacho
SET transport_id = id_transporte
WHERE id_transporte IS NOT NULL 
  AND transport_id IS NULL;

-- Copiar datos de id_camion a camion_id (solo donde camion_id es NULL)
UPDATE viajes_despacho
SET camion_id = id_camion
WHERE id_camion IS NOT NULL 
  AND camion_id IS NULL;

-- Copiar datos de id_chofer a chofer_id (solo donde chofer_id es NULL)
UPDATE viajes_despacho
SET chofer_id = id_chofer
WHERE id_chofer IS NOT NULL 
  AND chofer_id IS NULL;

-- Copiar datos de id_acoplado a acoplado_id (solo donde acoplado_id es NULL)
UPDATE viajes_despacho
SET acoplado_id = id_acoplado
WHERE id_acoplado IS NOT NULL 
  AND acoplado_id IS NULL;

-- ═══════════════════════════════════════════════════════════════════
-- PASO 3: VERIFICAR MIGRACIÓN
-- ═══════════════════════════════════════════════════════════════════

SELECT 
  '=== ESTADO DESPUÉS DE MIGRACIÓN ===' as titulo,
  COUNT(*) as total_viajes,
  COUNT(transport_id) as con_transport_id,
  COUNT(camion_id) as con_camion_id,
  COUNT(chofer_id) as con_chofer_id,
  COUNT(acoplado_id) as con_acoplado_id
FROM viajes_despacho;

-- Verificar que no perdimos datos
SELECT 
  '=== VERIFICACIÓN: Datos que podrían perderse ===' as titulo,
  COUNT(*) as viajes_con_datos_solo_en_id_prefijo
FROM viajes_despacho
WHERE (id_transporte IS NOT NULL AND transport_id IS NULL)
   OR (id_camion IS NOT NULL AND camion_id IS NULL)
   OR (id_chofer IS NOT NULL AND chofer_id IS NULL)
   OR (id_acoplado IS NOT NULL AND acoplado_id IS NULL);

-- ═══════════════════════════════════════════════════════════════════
-- PASO 4: ELIMINAR COLUMNAS DUPLICADAS (EJECUTAR SOLO SI PASO 3 OK)
-- ═══════════════════════════════════════════════════════════════════

-- ⚠️ IMPORTANTE: Solo ejecutar después de verificar que la migración fue exitosa
-- y después de actualizar todo el código frontend

-- DESCOMENTIAR CUANDO ESTÉS LISTO:
/*
ALTER TABLE viajes_despacho 
  DROP COLUMN IF EXISTS id_transporte,
  DROP COLUMN IF EXISTS id_camion,
  DROP COLUMN IF EXISTS id_chofer,
  DROP COLUMN IF EXISTS id_acoplado;

-- Mantener id_transporte_cancelado porque es un campo diferente (histórico)
-- NO eliminar esa columna
*/

-- ═══════════════════════════════════════════════════════════════════
-- PASO 5: ACTUALIZAR FUNCIÓN reprogramar_viaje()
-- ═══════════════════════════════════════════════════════════════════

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

  -- ═══════════════════════════════════════════════════════════════════
  -- 1️⃣ ACTUALIZAR EL VIAJE - LIMPIAR TODOS LOS RECURSOS
  -- ═══════════════════════════════════════════════════════════════════
  UPDATE viajes_despacho
  SET 
    -- Estados
    estado = 'pendiente',
    estado_carga = 'pendiente_asignacion',
    estado_unidad = NULL,
    
    -- Tracking de reprogramación
    fue_expirado = true,
    fecha_expiracion_original = COALESCE(fecha_expiracion_original, NOW()),
    cantidad_reprogramaciones = COALESCE(cantidad_reprogramaciones, 0) + 1,
    motivo_reprogramacion = COALESCE(p_motivo, motivo_reprogramacion),
    
    -- ══════════════════════════════════════════════════════════════════
    -- 🔥 LIMPIAR RECURSOS - FORMATO UNIFICADO (sufijo _id)
    -- ══════════════════════════════════════════════════════════════════
    transport_id = NULL,
    camion_id = NULL,
    acoplado_id = NULL,
    chofer_id = NULL,
    
    -- Limpiar también columnas legacy (hasta que se eliminen)
    id_transporte = NULL,
    id_camion = NULL,
    id_acoplado = NULL,
    id_chofer = NULL,
    
    -- Limpiar fechas de asignación
    fecha_asignacion_transporte = NULL,
    fecha_asignacion_camion = NULL,
    fecha_confirmacion_chofer = NULL,
    
    -- Limpiar responsables
    asignado_por = NULL,
    camion_asignado_por = NULL,
    confirmado_por = NULL
    
  WHERE id = p_viaje_id;

  -- ═══════════════════════════════════════════════════════════════════
  -- 2️⃣ ACTUALIZAR EL DESPACHO
  -- ═══════════════════════════════════════════════════════════════════
  UPDATE despachos
  SET 
    scheduled_at = p_nueva_fecha_hora,
    scheduled_local_date = p_nueva_fecha_hora::DATE,
    scheduled_local_time = p_nueva_fecha_hora::TIME,
    transport_id = NULL,
    estado = 'pendiente_transporte'
  WHERE id = v_despacho_id;

  RETURN QUERY SELECT true, 'Viaje reprogramado - Todos los recursos liberados'::TEXT, p_viaje_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reprogramar_viaje IS 
  'Reprograma un viaje expirado. Limpia TODOS los recursos (transport_id, camion_id, chofer_id, acoplado_id) para reiniciar el proceso desde cero.';

-- ═══════════════════════════════════════════════════════════════════
-- VERIFICACIÓN FINAL
-- ═══════════════════════════════════════════════════════════════════

SELECT 
  'Migración completada exitosamente' as status,
  NOW() as ejecutada_en;

-- ═══════════════════════════════════════════════════════════════════
-- NOTAS IMPORTANTES
-- ═══════════════════════════════════════════════════════════════════
-- 
-- CONVENCIÓN OFICIAL A USAR EN TODO EL CÓDIGO:
-- 
-- ✅ CORRECTO (usar siempre):
--    transport_id   - UUID de empresa de transporte
--    camion_id      - UUID de camión
--    acoplado_id    - UUID de acoplado
--    chofer_id      - UUID de chofer
--
-- ❌ DEPRECADO (no usar, serán eliminadas):
--    id_transporte  - Reemplazar por transport_id
--    id_camion      - Reemplazar por camion_id
--    id_acoplado    - Reemplazar por acoplado_id
--    id_chofer      - Reemplazar por chofer_id
--
-- EXCEPCIÓN:
--    id_transporte_cancelado - Esta columna es DIFERENTE, guarda
--    el transporte que canceló un viaje (histórico). NO eliminar.
-- ═══════════════════════════════════════════════════════════════════
