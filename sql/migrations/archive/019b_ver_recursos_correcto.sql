-- ============================================================================
-- VER CHOFERES Y CAMIONES DISPONIBLES (CORRECTO)
-- ============================================================================
-- Todas las tablas usan empresa_id (NO id_transporte)
-- ============================================================================

-- 1. Resumen por empresa
SELECT 
  e.id as empresa_id,
  e.nombre as empresa,
  COUNT(DISTINCT ch.id) as total_choferes,
  COUNT(DISTINCT ca.id) as total_camiones,
  COUNT(DISTINCT ac.id) as total_acoplados
FROM empresas e
LEFT JOIN choferes ch ON ch.empresa_id = e.id
LEFT JOIN camiones ca ON ca.empresa_id = e.id
LEFT JOIN acoplados ac ON ac.empresa_id = e.id
GROUP BY e.id, e.nombre
ORDER BY e.nombre;

-- 2. Ver todos los choferes
SELECT 
  ch.id as chofer_id,
  ch.nombre || ' ' || COALESCE(ch.apellido, '') as chofer_completo,
  ch.dni,
  e.id as empresa_id,
  e.nombre as empresa
FROM choferes ch
JOIN empresas e ON e.id = ch.empresa_id
ORDER BY e.nombre, ch.nombre;

-- 3. Ver todos los camiones  
SELECT 
  ca.id as camion_id,
  ca.patente,
  COALESCE(ca.marca || ' ' || ca.modelo, ca.marca, 'Sin modelo') as modelo,
  e.id as empresa_id,
  e.nombre as empresa
FROM camiones ca
JOIN empresas e ON e.id = ca.empresa_id
ORDER BY e.nombre, ca.patente;

-- 4. Ver acoplados (opcional)
SELECT 
  ac.id as acoplado_id,
  ac.patente,
  e.id as empresa_id,
  e.nombre as empresa
FROM acoplados ac
JOIN empresas e ON e.id = ac.empresa_id
ORDER BY e.nombre, ac.patente;
