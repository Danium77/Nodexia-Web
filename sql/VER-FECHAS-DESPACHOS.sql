-- Ver estructura de la tabla despachos para saber qué columnas de fecha/hora tiene
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'despachos' 
  AND (column_name LIKE '%fecha%' OR column_name LIKE '%hora%' OR column_name LIKE '%scheduled%' OR column_name LIKE '%date%' OR column_name LIKE '%time%')
ORDER BY ordinal_position;
