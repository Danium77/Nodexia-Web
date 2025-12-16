-- DIAGNÓSTICO BÁSICO - SIN COLUMNAS OPCIONALES
-- Ejecutar query por query para ver resultados

-- Query 1: Conteo general
SELECT 'Usuarios' as tabla, COUNT(*) as total FROM auth.users
UNION ALL
SELECT 'Empresas', COUNT(*) FROM empresas
UNION ALL
SELECT 'Choferes', COUNT(*) FROM choferes
UNION ALL
SELECT 'Camiones', COUNT(*) FROM camiones
UNION ALL
SELECT 'Despachos', COUNT(*) FROM despachos
UNION ALL
SELECT 'Viajes', COUNT(*) FROM viajes_despacho;

-- Query 2: Ver estructura de empresas
SELECT * FROM empresas LIMIT 5;

-- Query 3: Ver usuarios
SELECT email, id FROM auth.users ORDER BY email LIMIT 10;

-- Query 4: Ver choferes
SELECT id, nombre, apellido, email, dni, activo FROM choferes WHERE activo = true;

-- Query 5: Ver camiones
SELECT id, patente, marca, modelo, activo FROM camiones WHERE activo = true;

-- Query 6: Ver despachos recientes
SELECT id, pedido_id, origen, destino, estado, created_at 
FROM despachos 
ORDER BY created_at DESC 
LIMIT 5;

-- Query 7: Ver viajes recientes
SELECT id, numero_viaje, despacho_id, id_chofer, id_camion, estado, created_at
FROM viajes_despacho
ORDER BY created_at DESC
LIMIT 5;

-- Query 8: Ver viajes CON detalles
SELECT 
  vd.numero_viaje,
  vd.id as viaje_id,
  d.pedido_id,
  d.origen || ' → ' || d.destino as ruta,
  ch.nombre || ' ' || ch.apellido as chofer,
  cm.patente as camion
FROM viajes_despacho vd
LEFT JOIN despachos d ON vd.despacho_id = d.id
LEFT JOIN choferes ch ON vd.id_chofer = ch.id
LEFT JOIN camiones cm ON vd.id_camion = cm.id
ORDER BY vd.numero_viaje DESC
LIMIT 10;

-- Query 9: Ver estados de viajes
SELECT 
  vd.numero_viaje,
  euv.estado_unidad,
  ecv.estado_carga
FROM viajes_despacho vd
LEFT JOIN estado_unidad_viaje euv ON vd.id = euv.viaje_id
LEFT JOIN estado_carga_viaje ecv ON vd.id = ecv.viaje_id
ORDER BY vd.numero_viaje DESC
LIMIT 10;

-- Query 10: Viajes sin estados
SELECT 
  vd.numero_viaje,
  vd.id,
  CASE WHEN euv.viaje_id IS NULL THEN 'SIN ESTADO UNIDAD' ELSE 'OK' END as estado_unidad,
  CASE WHEN ecv.viaje_id IS NULL THEN 'SIN ESTADO CARGA' ELSE 'OK' END as estado_carga
FROM viajes_despacho vd
LEFT JOIN estado_unidad_viaje euv ON vd.id = euv.viaje_id
LEFT JOIN estado_carga_viaje ecv ON vd.id = ecv.viaje_id
WHERE euv.viaje_id IS NULL OR ecv.viaje_id IS NULL
LIMIT 20;
