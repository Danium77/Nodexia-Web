-- ============================================================================
-- VERIFICAR QUÉ DATOS ESTÁN VINCULADOS A LOS CHOFERES
-- ============================================================================
-- Antes de eliminar choferes, ver si tienen viajes/despachos asignados
-- ============================================================================

-- 1. Ver si los choferes tienen viajes asignados
SELECT 
  c.nombre,
  c.apellido,
  c.dni,
  COUNT(vd.id) as total_viajes,
  COUNT(CASE WHEN vd.estado IN ('pendiente', 'transporte_asignado', 'confirmado_chofer', 'en_transito_origen', 'en_transito_destino') THEN 1 END) as viajes_activos,
  COUNT(CASE WHEN vd.estado IN ('completado', 'entregado') THEN 1 END) as viajes_completados
FROM choferes c
LEFT JOIN viajes_despacho vd ON vd.chofer_id = c.id
WHERE c.empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'
  AND c.dni IN ('33379498', '35756372', '28848617')  -- Luis, Carlos, Walter
GROUP BY c.id, c.nombre, c.apellido, c.dni
ORDER BY c.apellido;

-- 2. Ver si hay unidades operativas con estos choferes
SELECT 
  c.nombre,
  c.apellido,
  c.dni,
  COUNT(uo.id) as unidades_operativas
FROM choferes c
LEFT JOIN unidades_operativas uo ON uo.chofer_id = c.id
WHERE c.empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'
  AND c.dni IN ('33379498', '35756372', '28848617')
GROUP BY c.id, c.nombre, c.apellido, c.dni
ORDER BY c.apellido;

-- 3. Ver si hay tracking GPS de estos choferes
SELECT 
  c.nombre,
  c.apellido,
  c.dni,
  COUNT(t.id) as registros_gps
FROM choferes c
LEFT JOIN tracking_choferes t ON t.chofer_id = c.id
WHERE c.empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'
  AND c.dni IN ('33379498', '35756372', '28848617')
GROUP BY c.id, c.nombre, c.apellido, c.dni
ORDER BY c.apellido;

-- ============================================================================
-- RECOMENDACIÓN:
-- ============================================================================
-- Si total_viajes = 0 y unidades_operativas = 0: SEGURO BORRAR Y RECREAR
-- Si hay viajes completados históricos: MEJOR VINCULAR (no borrar)
-- Si hay viajes activos: NO BORRAR, solo vincular usuario
-- ============================================================================
