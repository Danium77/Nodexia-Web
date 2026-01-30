-- Verificar estructura de la tabla despachos
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'despachos' 
ORDER BY ordinal_position;
