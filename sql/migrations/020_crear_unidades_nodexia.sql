-- ============================================================================
-- CREAR UNIDADES OPERATIVAS - LOGÍSTICA EXPRESS SRL
-- ============================================================================

-- 1. Ver choferes de Logística Express SRL
SELECT 
  ch.id,
  ch.nombre || ' ' || COALESCE(ch.apellido, '') as chofer,
  ch.dni
FROM choferes ch
JOIN empresas e ON e.id = ch.empresa_id
WHERE e.nombre = 'Logística Express SRL'
ORDER BY ch.nombre;

-- 2. Ver camiones de Logística Express SRL
SELECT 
  ca.id,
  ca.patente,
  ca.marca || ' ' || ca.modelo as modelo
FROM camiones ca
JOIN empresas e ON e.id = ca.empresa_id
WHERE e.nombre = 'Logística Express SRL'
ORDER BY ca.patente;

-- 3. Ver acoplados de Logística Express SRL (opcional)
SELECT 
  ac.id,
  ac.patente
FROM acoplados ac
JOIN empresas e ON e.id = ac.empresa_id
WHERE e.nombre = 'Logística Express SRL'
ORDER BY ac.patente;

-- ============================================================================
-- INSERTS DE UNIDADES (COMPLETAR CON IDs REALES DE ARRIBA)
-- ============================================================================

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
) VALUES (
  '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed',  -- Logística Express SRL
  'Unidad 01 - Mercedes Actros',
  'U01',
  '[CHOFER-ID-1]',  -- Reemplazar con ID de chofer de la query 1
  'ff82f34f-7055-4df8-ba71-0aa6f7532b51',  -- Mercedes Actros (AB324HC)
  '18714416-1631-4b0a-ba97-bec5be1c1ccb',  -- AF3503G (acoplado)
  true,
  'Primera unidad operativa - Logística Express'
);

-- UNIDAD 2: Mercedes Axor (ABC123)
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
  '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed',  -- Logística Express SRL
  'Unidad 02 - Mercedes Axor',
  'U02',
  '[CHOFER-ID-2]',  -- Reemplazar con ID de chofer de la query 1
  'bd4dd2cd-2363-43b3-b268-ecf1d09aa27c',  -- Mercedes Axor (ABC123)
  'bcf1af11-31bd-4423-a475-019a5afca8a1',  -- AG493DF (acoplado)
  true,
  'Segunda unidad operativa - Logística Express'
);

-- UNIDAD 3: Mercedes Actross (AF3253G)
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
  '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed',  -- Logística Express SRL
  'Unidad 03 - Mercedes Actross',
  'U03',
  '[CHOFER-ID-3]',  -- Reemplazar con ID de chofer de la query 1
  '896f02fd-3c18-45e8-896a-bc663d39ebb4',  -- Mercedes Actross (AF3253G)
  '740b666c-a556-41d5-8a23-7de9ce791dfa',  -- DEF456 (acoplado)
  true,
  'Tercera unidad operativa - Logística Express'
);

-- ============================================================================
-- VERIFICAR UNIDADES CREADAS
-- ============================================================================
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
