-- ============================================================================
-- CONSULTAR SCHEMA REAL DE TABLAS
-- ============================================================================

-- Ver columnas de la tabla camiones
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'camiones'
ORDER BY ordinal_position;

-- Ver columnas de la tabla choferes
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'choferes'
ORDER BY ordinal_position;

-- Ver columnas de la tabla acoplados
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'acoplados'
ORDER BY ordinal_position;
