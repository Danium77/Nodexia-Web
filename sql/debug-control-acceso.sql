-- Debug Control de Acceso
-- Verificar estructura y datos

-- 1. Ver si existen las tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('choferes', 'camiones', 'viajes_despacho')
ORDER BY table_name;

-- 2. Ver datos del viaje específico
SELECT 
  id,
  numero_viaje,
  despacho_id,
  id_chofer,
  id_camion,
  estado,
  length(id_chofer::text) as len_chofer,
  length(id_camion::text) as len_camion
FROM viajes_despacho
WHERE numero_viaje = '2';

-- 3. Ver estructura de id_chofer e id_camion
SELECT 
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'viajes_despacho'
  AND column_name IN ('id_chofer', 'id_camion');

-- 4. Ver TODOS los choferes (sin filtro por ID)
SELECT id, nombre, apellido, dni, length(id::text) as uuid_length 
FROM choferes 
LIMIT 5;

-- 5. Ver TODOS los camiones (sin filtro por ID)
SELECT id, patente, marca, modelo, length(id::text) as uuid_length 
FROM camiones 
LIMIT 5;

-- 6. Buscar chofer con LIKE (por si el formato es texto)
SELECT * FROM choferes 
WHERE id::text LIKE '%c77ad4e7-8be1-4b59-b227-b74055a18f71%';

-- 7. Buscar camión con LIKE
SELECT * FROM camiones 
WHERE id::text LIKE '%bd4dd22d-2361-43b3-b5d8-acf1d09a317%';
