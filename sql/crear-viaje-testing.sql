-- SCRIPT DE TESTING - FLUJO COMPLETO NODEXIA
-- Este script crea un viaje de prueba con todos sus datos relacionados

-- =====================================================
-- PASO 1: VERIFICAR DATOS BASE NECESARIOS
-- =====================================================

-- Verificar empresas (debe haber al menos 1 transporte)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM empresas WHERE tipo = 'transporte' LIMIT 1) THEN
    RAISE EXCEPTION 'No hay empresas de transporte. Crear primero.';
  END IF;
END $$;

-- =====================================================
-- PASO 2: CREAR DESPACHO DE PRUEBA
-- =====================================================

-- Insertar despacho (ajustar id_empresa según tu BD)
INSERT INTO despachos (
  pedido_id,
  origen,
  destino,
  producto,
  peso_kg,
  volumen_m3,
  fecha_carga_deseada,
  fecha_entrega_deseada,
  estado,
  id_empresa,
  observaciones
)
VALUES (
  'TEST-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS'),
  'Centro de Distribución Rosario',
  'Molino Santa Rosa',
  'Harina de Trigo 000',
  25000,
  45,
  NOW()::date + interval '1 day',
  NOW()::date + interval '3 days',
  'pendiente',
  (SELECT id FROM empresas WHERE tipo = 'logistica' LIMIT 1),
  'Despacho de prueba para testing del flujo completo'
)
RETURNING id, pedido_id;

-- Guardar el ID del despacho creado (copiar el id del resultado anterior)
-- Para los siguientes pasos, reemplazar 'DESPACHO_ID_AQUI' con el UUID del despacho

-- =====================================================
-- PASO 3: CREAR VIAJE ASOCIADO AL DESPACHO
-- =====================================================

-- Variables necesarias (ajustar según tu BD):
-- @despacho_id: UUID del despacho creado arriba
-- @transporte_id: UUID de una empresa de transporte existente
-- @chofer_id: UUID de un chofer existente (ej: Walter Zayas)
-- @camion_id: UUID de un camión existente (ej: ABC123)

-- Obtener IDs necesarios
WITH datos_necesarios AS (
  SELECT 
    (SELECT id FROM despachos WHERE pedido_id LIKE 'TEST-%' ORDER BY created_at DESC LIMIT 1) as despacho_id,
    (SELECT id FROM empresas WHERE tipo = 'transporte' LIMIT 1) as transporte_id,
    (SELECT id FROM choferes WHERE activo = true LIMIT 1) as chofer_id,
    (SELECT id FROM camiones WHERE activo = true LIMIT 1) as camion_id
)
-- Insertar viaje
INSERT INTO viajes_despacho (
  numero_viaje,
  despacho_id,
  id_transporte,
  id_chofer,
  id_camion,
  estado,
  observaciones
)
SELECT
  (SELECT COALESCE(MAX(numero_viaje), 0) + 1 FROM viajes_despacho),
  despacho_id,
  transporte_id,
  chofer_id,
  camion_id,
  'asignado',
  'Viaje de prueba para testing - Flujo completo'
FROM datos_necesarios
RETURNING id, numero_viaje;

-- Guardar el ID del viaje creado (copiar el id del resultado anterior)
-- Para los siguientes pasos, reemplazar 'VIAJE_ID_AQUI' con el UUID del viaje

-- =====================================================
-- PASO 4: CREAR ESTADOS INICIALES DEL VIAJE
-- =====================================================

-- Obtener ID del viaje recién creado
WITH ultimo_viaje AS (
  SELECT id FROM viajes_despacho ORDER BY created_at DESC LIMIT 1
)
-- Insertar estado_unidad_viaje
INSERT INTO estado_unidad_viaje (
  viaje_id,
  estado_unidad,
  fecha_cambio,
  observaciones
)
SELECT
  id,
  'asignado',
  NOW(),
  'Estado inicial - Viaje asignado'
FROM ultimo_viaje;

-- Insertar estado_carga_viaje
WITH ultimo_viaje AS (
  SELECT id FROM viajes_despacho ORDER BY created_at DESC LIMIT 1
)
INSERT INTO estado_carga_viaje (
  viaje_id,
  estado_carga,
  fecha_planificado,
  observaciones
)
SELECT
  id,
  'planificado',
  NOW(),
  'Estado inicial - Carga planificada'
FROM ultimo_viaje;

-- =====================================================
-- PASO 5: SIMULAR UBICACIÓN GPS INICIAL
-- =====================================================

-- Obtener ID del viaje y chofer
WITH ultimo_viaje AS (
  SELECT id, id_chofer FROM viajes_despacho ORDER BY created_at DESC LIMIT 1
)
INSERT INTO ubicaciones_choferes (
  viaje_id,
  chofer_id,
  latitude,
  longitude,
  accuracy,
  velocidad,
  heading,
  timestamp
)
SELECT
  id,
  id_chofer,
  -32.9442,  -- Rosario, Argentina (origen simulado)
  -60.6505,
  10,
  0,
  0,
  NOW()
FROM ultimo_viaje;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Mostrar el viaje creado con todas sus relaciones
SELECT 
  '✅ VIAJE CREADO' as resultado,
  vd.id,
  vd.numero_viaje,
  d.pedido_id,
  d.origen || ' → ' || d.destino as ruta,
  t.nombre as transporte,
  ch.nombre || ' ' || ch.apellido as chofer,
  cm.patente as camion,
  euv.estado_unidad,
  ecv.estado_carga,
  COUNT(uc.id) as ubicaciones_gps
FROM viajes_despacho vd
JOIN despachos d ON vd.despacho_id = d.id
LEFT JOIN transportes t ON vd.id_transporte = t.id
LEFT JOIN choferes ch ON vd.id_chofer = ch.id
LEFT JOIN camiones cm ON vd.id_camion = cm.id
LEFT JOIN estado_unidad_viaje euv ON vd.id = euv.viaje_id
LEFT JOIN estado_carga_viaje ecv ON vd.id = ecv.viaje_id
LEFT JOIN ubicaciones_choferes uc ON vd.id = uc.viaje_id
WHERE vd.id = (SELECT id FROM viajes_despacho ORDER BY created_at DESC LIMIT 1)
GROUP BY vd.id, vd.numero_viaje, d.pedido_id, d.origen, d.destino, 
         t.nombre, ch.nombre, ch.apellido, cm.patente, euv.estado_unidad, ecv.estado_carga;

-- =====================================================
-- INSTRUCCIONES DE USO:
-- =====================================================
-- 1. Ejecutar el diagnóstico primero: diagnostico-completo.sql
-- 2. Verificar que existan: empresas, choferes, camiones, transportes
-- 3. Ejecutar este script completo
-- 4. Copiar el numero_viaje del resultado
-- 5. Probar el flujo en la aplicación:
--    a) Login como coordinador → Ver en /transporte/viajes-activos
--    b) Login como chofer → Ver en /chofer/mis-viajes
--    c) Login como control acceso → Escanear QR con numero_viaje
--    d) Login como supervisor → Ver en dashboard

-- CÓDIGOS QR PARA TESTING:
-- Formato: QR-{numero_viaje} o directamente {numero_viaje}
-- Ejemplo: Si numero_viaje = 123, usar "QR-123" o "123"
