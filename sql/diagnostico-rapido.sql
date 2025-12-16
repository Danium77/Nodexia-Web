-- DIAGNÓSTICO RÁPIDO - VERSIÓN SIMPLIFICADA
-- Ejecutar en Supabase SQL Editor

-- 1. CONTEO GENERAL
SELECT 'Usuarios' as tabla, COUNT(*) as total FROM auth.users
UNION ALL
SELECT 'Empresas', COUNT(*) FROM empresas
UNION ALL
SELECT 'Choferes', COUNT(*) FROM choferes
UNION ALL
SELECT 'Camiones', COUNT(*) FROM camiones
UNION ALL
SELECT 'Transportes', COUNT(*) FROM transportes
UNION ALL
SELECT 'Despachos', COUNT(*) FROM despachos
UNION ALL
SELECT 'Viajes', COUNT(*) FROM viajes_despacho
UNION ALL
SELECT 'Estados Unidad', COUNT(*) FROM estado_unidad_viaje
UNION ALL
SELECT 'Estados Carga', COUNT(*) FROM estado_carga_viaje
UNION ALL
SELECT 'Ubicaciones GPS', COUNT(*) FROM ubicaciones_choferes;

-- 2. USUARIOS
SELECT email, id, created_at FROM auth.users ORDER BY email;

-- 3. EMPRESAS
SELECT id, nombre, cuit, tipo FROM empresas ORDER BY nombre;

-- 4. CHOFERES ACTIVOS
SELECT 
  c.id,
  c.nombre || ' ' || c.apellido as nombre_completo,
  c.email,
  c.telefono,
  c.activo,
  e.nombre as empresa
FROM choferes c
LEFT JOIN empresas e ON c.id_empresa = e.id
WHERE c.activo = true
ORDER BY c.nombre;

-- 5. CAMIONES ACTIVOS
SELECT 
  cm.id,
  cm.patente,
  cm.marca || ' ' || COALESCE(cm.modelo, '') as vehiculo,
  cm.activo,
  e.nombre as empresa
FROM camiones cm
LEFT JOIN empresas e ON cm.id_empresa = e.id
WHERE cm.activo = true
ORDER BY cm.patente;

-- 6. VIAJES RECIENTES (ÚLTIMOS 10)
SELECT 
  vd.id,
  vd.numero_viaje,
  vd.despacho_id,
  vd.id_transporte,
  vd.id_chofer,
  vd.id_camion,
  vd.estado,
  vd.created_at
FROM viajes_despacho vd
ORDER BY vd.created_at DESC
LIMIT 10;

-- 7. VIAJES CON RELACIONES COMPLETAS
SELECT 
  vd.id as viaje_id,
  vd.numero_viaje,
  d.pedido_id,
  d.origen,
  d.destino,
  d.producto,
  ch.nombre || ' ' || ch.apellido as chofer,
  cm.patente as camion,
  vd.estado as estado_legacy,
  vd.created_at
FROM viajes_despacho vd
LEFT JOIN despachos d ON vd.despacho_id = d.id
LEFT JOIN choferes ch ON vd.id_chofer = ch.id
LEFT JOIN camiones cm ON vd.id_camion = cm.id
ORDER BY vd.created_at DESC
LIMIT 5;

-- 8. ESTADOS DUALES DE VIAJES RECIENTES
SELECT 
  vd.numero_viaje,
  euv.estado_unidad,
  ecv.estado_carga,
  euv.fecha_cambio as ultima_actualizacion
FROM viajes_despacho vd
LEFT JOIN estado_unidad_viaje euv ON vd.id = euv.viaje_id
LEFT JOIN estado_carga_viaje ecv ON vd.id = ecv.viaje_id
ORDER BY vd.numero_viaje DESC
LIMIT 10;

-- 9. UBICACIONES GPS RECIENTES
SELECT 
  vd.numero_viaje,
  uc.latitude,
  uc.longitude,
  uc.velocidad,
  uc.timestamp
FROM ubicaciones_choferes uc
JOIN viajes_despacho vd ON uc.viaje_id = vd.id
ORDER BY uc.timestamp DESC
LIMIT 10;

-- 10. VIAJES SIN DATOS COMPLETOS (DIAGNÓSTICO)
SELECT 
  vd.numero_viaje,
  CASE WHEN vd.despacho_id IS NULL THEN '❌ SIN DESPACHO' ELSE '✅' END as despacho,
  CASE WHEN vd.id_transporte IS NULL THEN '❌ SIN TRANSPORTE' ELSE '✅' END as transporte,
  CASE WHEN vd.id_chofer IS NULL THEN '❌ SIN CHOFER' ELSE '✅' END as chofer,
  CASE WHEN vd.id_camion IS NULL THEN '❌ SIN CAMIÓN' ELSE '✅' END as camion,
  CASE WHEN euv.viaje_id IS NULL THEN '❌ SIN ESTADO UNIDAD' ELSE '✅' END as estado_unidad,
  CASE WHEN ecv.viaje_id IS NULL THEN '❌ SIN ESTADO CARGA' ELSE '✅' END as estado_carga
FROM viajes_despacho vd
LEFT JOIN estado_unidad_viaje euv ON vd.id = euv.viaje_id
LEFT JOIN estado_carga_viaje ecv ON vd.id = ecv.viaje_id
ORDER BY vd.numero_viaje DESC
LIMIT 20;
