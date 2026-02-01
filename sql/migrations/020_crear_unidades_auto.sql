-- ============================================================================
-- CREAR 3 UNIDADES AUTOMÁTICAMENTE - LOGÍSTICA EXPRESS SRL
-- ============================================================================
-- Este script selecciona automáticamente los primeros 3 choferes disponibles
-- ============================================================================

WITH choferes_logistica AS (
  SELECT 
    ch.id as chofer_id,
    ROW_NUMBER() OVER (ORDER BY ch.nombre) as rn
  FROM choferes ch
  JOIN empresas e ON e.id = ch.empresa_id
  WHERE e.nombre = 'Logística Express SRL'
),
empresa AS (
  SELECT id as empresa_id 
  FROM empresas 
  WHERE nombre = 'Logística Express SRL'
)
-- UNIDAD 1: Mercedes Actros (AB324HC)
INSERT INTO unidades_operativas (
  empresa_id,
  nombre,
  codigo,
  chofer_id,
  camion_id,
  acoplado_id,
  activo,
  notas
)
SELECT 
  e.empresa_id,
  'Unidad 01 - Mercedes Actros',
  'U01',
  c.chofer_id,
  'ff82f34f-7055-4df8-ba71-0aa6f7532b51',  -- Mercedes Actros (AB324HC)
  '18714416-1631-4b0a-ba97-bec5be1c1ccb',  -- AF3503G (acoplado)
  true,
  'Primera unidad operativa - Logística Express'
FROM empresa e, choferes_logistica c
WHERE c.rn = 1;

-- UNIDAD 2: Mercedes Axor (ABC123)
WITH choferes_logistica AS (
  SELECT 
    ch.id as chofer_id,
    ROW_NUMBER() OVER (ORDER BY ch.nombre) as rn
  FROM choferes ch
  JOIN empresas e ON e.id = ch.empresa_id
  WHERE e.nombre = 'Logística Express SRL'
),
empresa AS (
  SELECT id as empresa_id 
  FROM empresas 
  WHERE nombre = 'Logística Express SRL'
)
INSERT INTO unidades_operativas (
  empresa_id,
  nombre,
  codigo,
  chofer_id,
  camion_id,
  acoplado_id,
  activo,
  notas
)
SELECT 
  e.empresa_id,
  'Unidad 02 - Mercedes Axor',
  'U02',
  c.chofer_id,
  'bd4dd2cd-2363-43b3-b268-ecf1d09aa27c',  -- Mercedes Axor (ABC123)
  'bcf1af11-31bd-4423-a475-019a5afca8a1',  -- AG493DF (acoplado)
  true,
  'Segunda unidad operativa - Logística Express'
FROM empresa e, choferes_logistica c
WHERE c.rn = 2;

-- UNIDAD 3: Mercedes Actross (AF3253G)
WITH choferes_logistica AS (
  SELECT 
    ch.id as chofer_id,
    ROW_NUMBER() OVER (ORDER BY ch.nombre) as rn
  FROM choferes ch
  JOIN empresas e ON e.id = ch.empresa_id
  WHERE e.nombre = 'Logística Express SRL'
),
empresa AS (
  SELECT id as empresa_id 
  FROM empresas 
  WHERE nombre = 'Logística Express SRL'
)
INSERT INTO unidades_operativas (
  empresa_id,
  nombre,
  codigo,
  chofer_id,
  camion_id,
  acoplado_id,
  activo,
  notas
)
SELECT 
  e.empresa_id,
  'Unidad 03 - Mercedes Actross',
  'U03',
  c.chofer_id,
  '896f02fd-3c18-45e8-896a-bc663d39ebb4',  -- Mercedes Actross (AF3253G)
  '740b666c-a556-41d5-8a23-7de9ce791dfa',  -- DEF456 (acoplado)
  true,
  'Tercera unidad operativa - Logística Express'
FROM empresa e, choferes_logistica c
WHERE c.rn = 3;

-- Verificar unidades creadas
SELECT 
  uo.codigo,
  uo.nombre as unidad,
  ch.nombre || ' ' || COALESCE(ch.apellido, '') as chofer,
  ca.patente as camion,
  ca.marca || ' ' || ca.modelo as modelo_camion,
  COALESCE(ac.patente, 'Sin acoplado') as acoplado,
  uo.activo
FROM unidades_operativas uo
JOIN empresas e ON e.id = uo.empresa_id
JOIN choferes ch ON ch.id = uo.chofer_id
JOIN camiones ca ON ca.id = uo.camion_id
LEFT JOIN acoplados ac ON ac.id = uo.acoplado_id
WHERE e.nombre = 'Logística Express SRL'
ORDER BY uo.codigo;
