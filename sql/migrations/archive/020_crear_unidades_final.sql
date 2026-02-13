-- ============================================================================
-- CREAR 3 UNIDADES - LOGÍSTICA EXPRESS SRL
-- ============================================================================
-- Usa ID directo de empresa: 181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed
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
)
SELECT 
  '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'::uuid,
  'Unidad 01 - Mercedes Actros',
  'U01',
  (SELECT id FROM choferes WHERE empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed' ORDER BY nombre LIMIT 1 OFFSET 0),
  'ff82f34f-7055-4df8-ba71-0aa6f7532b51'::uuid,  -- Mercedes Actros (AB324HC)
  '18714416-1631-4b0a-ba97-bec5be1c1ccb'::uuid,  -- AF3503G
  true,
  'Primera unidad operativa - Logística Express';

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
)
SELECT 
  '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'::uuid,
  'Unidad 02 - Mercedes Axor',
  'U02',
  (SELECT id FROM choferes WHERE empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed' ORDER BY nombre LIMIT 1 OFFSET 1),
  'bd4dd2cd-2363-43b3-b268-ecf1d09aa27c'::uuid,  -- Mercedes Axor (ABC123)
  'bcf1af11-31bd-4423-a475-019a5afca8a1'::uuid,  -- AG493DF
  true,
  'Segunda unidad operativa - Logística Express';

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
)
SELECT 
  '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'::uuid,
  'Unidad 03 - Mercedes Actross',
  'U03',
  (SELECT id FROM choferes WHERE empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed' ORDER BY nombre LIMIT 1 OFFSET 2),
  '896f02fd-3c18-45e8-896a-bc663d39ebb4'::uuid,  -- Mercedes Actross (AF3253G)
  '740b666c-a556-41d5-8a23-7de9ce791dfa'::uuid,  -- DEF456
  true,
  'Tercera unidad operativa - Logística Express';

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
WHERE e.id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'
ORDER BY uo.codigo;
