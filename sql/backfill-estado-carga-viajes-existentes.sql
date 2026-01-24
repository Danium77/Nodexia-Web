-- =====================================================
-- BACKFILL: Crear estados para viajes existentes
-- Fecha: 20 de Enero 2026
-- =====================================================

-- Ver viajes sin estado_carga_viaje
SELECT 
  vd.id,
  vd.numero_viaje,
  vd.despacho_id,
  vd.estado,
  ecv.id as tiene_estado_carga
FROM viajes_despacho vd
LEFT JOIN estado_carga_viaje ecv ON vd.id = ecv.viaje_id
WHERE ecv.id IS NULL;

-- Crear registros de estado para viajes sin estado
INSERT INTO estado_carga_viaje (viaje_id, estado_carga, fecha_creacion)
SELECT 
  vd.id,
  'pendiente',
  vd.created_at
FROM viajes_despacho vd
LEFT JOIN estado_carga_viaje ecv ON vd.id = ecv.viaje_id
WHERE ecv.id IS NULL;

-- Verificar que se crearon
SELECT 
  COUNT(*) as total_viajes,
  COUNT(ecv.id) as viajes_con_estado
FROM viajes_despacho vd
LEFT JOIN estado_carga_viaje ecv ON vd.id = ecv.viaje_id;
