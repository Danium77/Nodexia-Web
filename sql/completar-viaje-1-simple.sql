-- COMPLETAR VIAJE #1 - VERSIÓN SIMPLIFICADA
-- Solo agregar estados sin verificar columnas opcionales

-- Paso 1: Ver estructura actual del viaje
SELECT 
  vd.numero_viaje,
  vd.id as viaje_id,
  vd.despacho_id,
  vd.id_chofer,
  vd.id_camion,
  ch.nombre || ' ' || ch.apellido as chofer,
  ch.email as chofer_email,
  cm.patente as camion
FROM viajes_despacho vd
LEFT JOIN choferes ch ON vd.id_chofer = ch.id
LEFT JOIN camiones cm ON vd.id_camion = cm.id
WHERE vd.numero_viaje = 1;

-- Paso 2: Agregar estado_unidad_viaje si no existe
INSERT INTO estado_unidad_viaje (viaje_id, estado_unidad, fecha_cambio, observaciones)
SELECT id, 'asignado', NOW(), 'Estado inicial para testing'
FROM viajes_despacho WHERE numero_viaje = 1
ON CONFLICT (viaje_id) DO NOTHING;

-- Paso 3: Agregar estado_carga_viaje si no existe
INSERT INTO estado_carga_viaje (viaje_id, estado_carga, fecha_planificado, observaciones)
SELECT id, 'planificado', NOW(), 'Estado inicial para testing'
FROM viajes_despacho WHERE numero_viaje = 1
ON CONFLICT (viaje_id) DO NOTHING;

-- Paso 4: Verificar estados agregados
SELECT 
  vd.numero_viaje,
  vd.id as viaje_id,
  euv.estado_unidad,
  ecv.estado_carga,
  ch.email as chofer_email,
  cm.patente as camion
FROM viajes_despacho vd
LEFT JOIN estado_unidad_viaje euv ON vd.id = euv.viaje_id
LEFT JOIN estado_carga_viaje ecv ON vd.id = ecv.viaje_id
LEFT JOIN choferes ch ON vd.id_chofer = ch.id
LEFT JOIN camiones cm ON vd.id_camion = cm.id
WHERE vd.numero_viaje = 1;

-- Paso 5: Agregar ubicación GPS inicial
INSERT INTO ubicaciones_choferes (viaje_id, chofer_id, latitude, longitude, accuracy, velocidad, heading, timestamp)
SELECT vd.id, vd.id_chofer, -32.9442, -60.6505, 10, 0, 0, NOW()
FROM viajes_despacho vd
WHERE vd.numero_viaje = 1 AND vd.id_chofer IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM ubicaciones_choferes WHERE viaje_id = vd.id);

-- RESULTADO FINAL
SELECT '✅ VIAJE #1 LISTO PARA TESTING' as status;
