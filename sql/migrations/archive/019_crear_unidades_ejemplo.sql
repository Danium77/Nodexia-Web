-- ============================================================================
-- CREAR UNIDADES OPERATIVAS DE EJEMPLO
-- ============================================================================
-- Fecha: 31 de Enero 2026
-- Propósito: Crear unidades operativas manualmente para testing
-- ============================================================================

-- Primero, verificar qué choferes y camiones tenemos
SELECT 
  e.nombre as empresa,
  COUNT(DISTINCT ch.id) as total_choferes,
  COUNT(DISTINCT ca.id) as total_camiones
FROM empresas e
LEFT JOIN choferes ch ON ch.empresa_id = e.id
LEFT JOIN camiones ca ON ca.id_transporte = e.id
GROUP BY e.id, e.nombre;

-- Ver choferes disponibles
SELECT 
  ch.id,
  ch.nombre || ' ' || COALESCE(ch.apellido, '') as chofer,
  ch.dni,
  e.nombre as empresa
FROM choferes ch
JOIN empresas e ON e.id = ch.empresa_id
ORDER BY e.nombre, ch.nombre;

-- Ver camiones disponibles
SELECT 
  ca.id,
  ca.patente,
  COALESCE(ca.marca || ' ' || ca.modelo, ca.marca, 'Sin modelo') as modelo,
  e.nombre as empresa
FROM camiones ca
JOIN empresas e ON e.id = ca.id_transporte
ORDER BY e.nombre, ca.patente;

-- ============================================================================
-- CREAR UNIDADES MANUALMENTE
-- ============================================================================
-- NOTA: Ejecutar DESPUÉS de verificar IDs reales arriba

-- Ejemplo de cómo crear unidad (AJUSTAR IDs REALES):
/*
INSERT INTO unidades_operativas (
  empresa_id,
  nombre,
  codigo,
  chofer_id,
  camion_id,
  acoplado_id,
  activo,
  notas
) VALUES (
  'UUID-EMPRESA-TRANSPORTE',     -- Reemplazar con ID real
  'Unidad 01',
  'U01',
  'UUID-CHOFER',                  -- Reemplazar con ID real
  'UUID-CAMION',                  -- Reemplazar con ID real
  NULL,                           -- O UUID-ACOPLADO si tiene
  true,
  'Unidad creada manualmente para testing'
);
*/

-- Verificar unidades creadas
SELECT 
  e.nombre as empresa,
  uo.codigo,
  uo.nombre as unidad,
  ch.nombre || ' ' || COALESCE(ch.apellido, '') as chofer,
  ca.patente as camion,
  COALESCE(ac.patente, 'Sin acoplado') as acoplado
FROM unidades_operativas uo
JOIN empresas e ON e.id = uo.empresa_id
JOIN choferes ch ON ch.id = uo.chofer_id
JOIN camiones ca ON ca.id = uo.camion_id
LEFT JOIN acoplados ac ON ac.id = uo.acoplado_id
WHERE uo.activo = true
ORDER BY e.nombre, uo.codigo;
