-- Ver estructura de tablas principales
-- Ejecuta una por una y copia los resultados

-- 1. Estructura de choferes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'choferes' 
ORDER BY ordinal_position;

-- 2. Estructura de camiones
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'camiones' 
ORDER BY ordinal_position;

-- 3. Estructura de viajes_despacho
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'viajes_despacho' 
ORDER BY ordinal_position;

-- 4. Estructura de despachos
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'despachos' 
ORDER BY ordinal_position;

-- 5. Estructura de empresas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'empresas' 
ORDER BY ordinal_position;

-- DESPUÉS ejecuta estas queries simples:

-- 6. Conteo
SELECT 'choferes' as tabla, COUNT(*) FROM choferes
UNION ALL SELECT 'camiones', COUNT(*) FROM camiones
UNION ALL SELECT 'viajes', COUNT(*) FROM viajes_despacho
UNION ALL SELECT 'despachos', COUNT(*) FROM despachos;

-- 7. Ver choferes (sin columna activo)
SELECT id, nombre, apellido, email FROM choferes LIMIT 5;

-- 8. Ver camiones (sin columna activo)
SELECT id, patente, marca, modelo FROM camiones LIMIT 5;

-- 9. Ver viajes
SELECT numero_viaje, id, despacho_id, id_chofer, id_camion FROM viajes_despacho LIMIT 5;

-- 10. Ver si hay viajes sin estados
SELECT 
  vd.numero_viaje,
  vd.id
FROM viajes_despacho vd
LEFT JOIN estado_unidad_viaje euv ON vd.id = euv.viaje_id
LEFT JOIN estado_carga_viaje ecv ON vd.id = ecv.viaje_id
WHERE euv.viaje_id IS NULL OR ecv.viaje_id IS NULL
LIMIT 10;
