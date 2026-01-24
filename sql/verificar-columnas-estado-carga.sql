-- Verificar estructura completa de estado_carga_viaje
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'estado_carga_viaje'
ORDER BY ordinal_position;
