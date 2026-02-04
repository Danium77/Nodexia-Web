-- ============================================================================
-- VERIFICAR ESTRUCTURA REAL DE LA TABLA CHOFERES
-- ============================================================================

-- 1. Ver todas las columnas de la tabla choferes
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'choferes'
ORDER BY ordinal_position;

-- 2. Ver si existe alguna columna con 'transporte' en el nombre
SELECT column_name
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'choferes'
  AND column_name LIKE '%transporte%';

-- 3. Ver si existe alguna columna con 'empresa' en el nombre
SELECT column_name
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'choferes'
  AND column_name LIKE '%empresa%';

-- 4. Ver los primeros 5 registros de choferes (con todas las columnas)
SELECT *
FROM choferes
LIMIT 5;
