-- Ver estructura completa de viajes_despacho
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'viajes_despacho' 
ORDER BY ordinal_position;
