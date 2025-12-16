-- DIAGNÓSTICO COMPLETO DEL FLUJO NODEXIA
-- Ejecutar en Supabase SQL Editor para verificar datos y relaciones

-- =====================================================
-- 1. VERIFICAR USUARIOS Y ROLES
-- =====================================================
SELECT 
  'USUARIOS Y ROLES' as seccion,
  u.email,
  u.id as user_id,
  u.raw_user_meta_data->>'rol' as rol,
  u.raw_user_meta_data->>'empresa_id' as empresa_id,
  u.created_at
FROM auth.users u
ORDER BY u.email;

-- =====================================================
-- 2. VERIFICAR EMPRESAS
-- =====================================================
SELECT 
  'EMPRESAS' as seccion,
  id,
  nombre,
  cuit,
  tipo,
  created_at
FROM empresas
ORDER BY created_at DESC;

-- =====================================================
-- 3. VERIFICAR CHOFERES
-- =====================================================
SELECT 
  'CHOFERES' as seccion,
  c.id,
  c.nombre,
  c.apellido,
  c.dni,
  c.email,
  c.telefono,
  e.nombre as empresa,
  c.activo,
  u.email as user_email
FROM choferes c
LEFT JOIN empresas e ON c.id_empresa = e.id
LEFT JOIN auth.users u ON c.user_id = u.id
ORDER BY c.nombre;

-- =====================================================
-- 4. VERIFICAR CAMIONES
-- =====================================================
SELECT 
  'CAMIONES' as seccion,
  cm.id,
  cm.patente,
  cm.marca,
  cm.modelo,
  cm.ano,
  e.nombre as empresa,
  cm.activo
FROM camiones cm
LEFT JOIN empresas e ON cm.id_empresa = e.id
ORDER BY cm.patente;

-- =====================================================
-- 5. VERIFICAR DESPACHOS
-- =====================================================
SELECT 
  'DESPACHOS' as seccion,
  d.id,
  d.pedido_id,
  d.origen,
  d.destino,
  d.producto,
  d.estado,
  e.nombre as empresa,
  d.created_at
FROM despachos d
LEFT JOIN empresas e ON d.id_empresa = e.id
ORDER BY d.created_at DESC
LIMIT 10;

-- =====================================================
-- 6. VERIFICAR VIAJES Y SUS RELACIONES
-- =====================================================
SELECT 
  'VIAJES_DESPACHO' as seccion,
  vd.id,
  vd.numero_viaje,
  vd.despacho_id,
  vd.estado as estado_legacy,
  d.pedido_id,
  d.origen,
  d.destino,
  t.nombre as transporte,
  ch.nombre || ' ' || ch.apellido as chofer,
  cm.patente as camion,
  vd.created_at
FROM viajes_despacho vd
LEFT JOIN despachos d ON vd.despacho_id = d.id
LEFT JOIN transportes t ON vd.id_transporte = t.id
LEFT JOIN choferes ch ON vd.id_chofer = ch.id
LEFT JOIN camiones cm ON vd.id_camion = cm.id
ORDER BY vd.created_at DESC
LIMIT 10;

-- =====================================================
-- 7. VERIFICAR ESTADO_UNIDAD_VIAJE
-- =====================================================
SELECT 
  'ESTADO_UNIDAD_VIAJE' as seccion,
  euv.viaje_id,
  vd.numero_viaje,
  euv.estado_unidad,
  euv.fecha_cambio,
  euv.observaciones
FROM estado_unidad_viaje euv
JOIN viajes_despacho vd ON euv.viaje_id = vd.id
ORDER BY euv.fecha_cambio DESC
LIMIT 10;

-- =====================================================
-- 8. VERIFICAR ESTADO_CARGA_VIAJE
-- =====================================================
SELECT 
  'ESTADO_CARGA_VIAJE' as seccion,
  ecv.viaje_id,
  vd.numero_viaje,
  ecv.estado_carga,
  ecv.fecha_planificado,
  ecv.fecha_documentacion_preparada,
  ecv.fecha_en_proceso_carga,
  ecv.fecha_cargado,
  ecv.peso_real,
  ecv.cantidad_bultos
FROM estado_carga_viaje ecv
JOIN viajes_despacho vd ON ecv.viaje_id = vd.id
ORDER BY ecv.fecha_planificado DESC
LIMIT 10;

-- =====================================================
-- 9. VERIFICAR UBICACIONES GPS
-- =====================================================
SELECT 
  'UBICACIONES_CHOFERES' as seccion,
  uc.id,
  uc.viaje_id,
  vd.numero_viaje,
  uc.latitude,
  uc.longitude,
  uc.velocidad,
  uc.heading,
  uc.accuracy,
  uc.timestamp,
  uc.created_at
FROM ubicaciones_choferes uc
JOIN viajes_despacho vd ON uc.viaje_id = vd.id
ORDER BY uc.timestamp DESC
LIMIT 10;

-- =====================================================
-- 10. VERIFICAR REGISTROS DE ACCESO
-- =====================================================
SELECT 
  'REGISTROS_ACCESO' as seccion,
  ra.id,
  vd.numero_viaje,
  ra.tipo,
  ra.timestamp,
  ra.observaciones,
  u.email as usuario
FROM registros_acceso ra
JOIN viajes_despacho vd ON ra.viaje_id = vd.id
LEFT JOIN auth.users u ON ra.usuario_id = u.id
ORDER BY ra.timestamp DESC
LIMIT 10;

-- =====================================================
-- 11. RESUMEN DE CONTEOS
-- =====================================================
SELECT 'RESUMEN' as seccion, 'Usuarios' as tabla, COUNT(*) as total FROM auth.users
UNION ALL
SELECT 'RESUMEN', 'Empresas', COUNT(*) FROM empresas
UNION ALL
SELECT 'RESUMEN', 'Choferes', COUNT(*) FROM choferes
UNION ALL
SELECT 'RESUMEN', 'Camiones', COUNT(*) FROM camiones
UNION ALL
SELECT 'RESUMEN', 'Transportes', COUNT(*) FROM transportes
UNION ALL
SELECT 'RESUMEN', 'Despachos', COUNT(*) FROM despachos
UNION ALL
SELECT 'RESUMEN', 'Viajes', COUNT(*) FROM viajes_despacho
UNION ALL
SELECT 'RESUMEN', 'Estados Unidad', COUNT(*) FROM estado_unidad_viaje
UNION ALL
SELECT 'RESUMEN', 'Estados Carga', COUNT(*) FROM estado_carga_viaje
UNION ALL
SELECT 'RESUMEN', 'Ubicaciones GPS', COUNT(*) FROM ubicaciones_choferes
UNION ALL
SELECT 'RESUMEN', 'Registros Acceso', COUNT(*) FROM registros_acceso;

-- =====================================================
-- 12. VIAJES SIN RELACIONES (DIAGNÓSTICO)
-- =====================================================
SELECT 
  'VIAJES_INCOMPLETOS' as seccion,
  vd.id,
  vd.numero_viaje,
  CASE WHEN vd.despacho_id IS NULL THEN '❌' ELSE '✅' END as tiene_despacho,
  CASE WHEN vd.id_transporte IS NULL THEN '❌' ELSE '✅' END as tiene_transporte,
  CASE WHEN vd.id_chofer IS NULL THEN '❌' ELSE '✅' END as tiene_chofer,
  CASE WHEN vd.id_camion IS NULL THEN '❌' ELSE '✅' END as tiene_camion,
  CASE WHEN euv.viaje_id IS NULL THEN '❌' ELSE '✅' END as tiene_estado_unidad,
  CASE WHEN ecv.viaje_id IS NULL THEN '❌' ELSE '✅' END as tiene_estado_carga
FROM viajes_despacho vd
LEFT JOIN estado_unidad_viaje euv ON vd.id = euv.viaje_id
LEFT JOIN estado_carga_viaje ecv ON vd.id = ecv.viaje_id
ORDER BY vd.numero_viaje DESC
LIMIT 20;
