-- Ver columnas de camiones
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'camiones'
ORDER BY ordinal_position;

-- Ver columnas de choferes
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'choferes'
ORDER BY ordinal_position;
