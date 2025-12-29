-- =====================================
-- ANÁLISIS DE UUIDs CORRUPTOS
-- Fecha: 29-Dic-2025
-- Objetivo: Identificar alcance del problema de UUIDs de 37 caracteres
-- =====================================

-- 1. VERIFICAR TIPOS DE DATOS
SELECT 
  column_name, 
  data_type,
  udt_name,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'viajes_despacho'
  AND column_name IN ('id', 'id_chofer', 'id_camion', 'despacho_id')
ORDER BY column_name;

-- 2. ANALIZAR LONGITUDES DE UUIDs EN VIAJES_DESPACHO
SELECT 
  'id' as campo,
  length(id::text) as longitud,
  count(*) as cantidad
FROM viajes_despacho
GROUP BY length(id::text)

UNION ALL

SELECT 
  'id_chofer' as campo,
  length(id_chofer::text) as longitud,
  count(*) as cantidad
FROM viajes_despacho
WHERE id_chofer IS NOT NULL
GROUP BY length(id_chofer::text)

UNION ALL

SELECT 
  'id_camion' as campo,
  length(id_camion::text) as longitud,
  count(*) as cantidad
FROM viajes_despacho
WHERE id_camion IS NOT NULL
GROUP BY length(id_camion::text)

ORDER BY campo, longitud;

-- 3. IDENTIFICAR REGISTROS CON UUIDs CORRUPTOS
SELECT 
  id,
  numero_viaje,
  despacho_id,
  id_chofer,
  id_camion,
  estado,
  length(id_chofer::text) as len_chofer,
  length(id_camion::text) as len_camion,
  CASE 
    WHEN length(id_chofer::text) != 36 THEN 'CORRUPTO'
    ELSE 'OK'
  END as status_chofer,
  CASE 
    WHEN length(id_camion::text) != 36 THEN 'CORRUPTO'
    ELSE 'OK'
  END as status_camion
FROM viajes_despacho
WHERE id_chofer IS NOT NULL OR id_camion IS NOT NULL
ORDER BY numero_viaje;

-- 4. ESTADÍSTICAS GENERALES
SELECT 
  COUNT(*) as total_registros,
  COUNT(CASE WHEN id_chofer IS NOT NULL THEN 1 END) as registros_con_chofer,
  COUNT(CASE WHEN id_camion IS NOT NULL THEN 1 END) as registros_con_camion,
  COUNT(CASE WHEN length(id_chofer::text) != 36 THEN 1 END) as choferes_corruptos,
  COUNT(CASE WHEN length(id_camion::text) != 36 THEN 1 END) as camiones_corruptos
FROM viajes_despacho;

-- 5. VALIDAR SI EXISTEN MATCHES VÁLIDOS
-- (intentar encontrar choferes/camiones con el UUID truncado)
SELECT 
  vd.numero_viaje,
  vd.id_chofer,
  substring(vd.id_chofer::text, 1, 36) as id_chofer_truncado,
  c.id as chofer_id_encontrado,
  c.nombre || ' ' || c.apellido as chofer_nombre
FROM viajes_despacho vd
LEFT JOIN choferes c ON c.id::text = substring(vd.id_chofer::text, 1, 36)
WHERE vd.id_chofer IS NOT NULL
  AND length(vd.id_chofer::text) = 37
LIMIT 10;

-- 6. VERIFICAR REFERENCIAS A TABLAS CHOFERES Y CAMIONES
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'viajes_despacho'
  AND kcu.column_name IN ('id_chofer', 'id_camion');

-- 7. MUESTRA DE UUIDs VÁLIDOS EN CHOFERES Y CAMIONES
SELECT 'choferes' as tabla, id, length(id::text) as longitud
FROM choferes
LIMIT 5

UNION ALL

SELECT 'camiones' as tabla, id, length(id::text) as longitud
FROM camiones
LIMIT 5;
