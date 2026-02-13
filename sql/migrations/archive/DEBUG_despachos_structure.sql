-- ================================================
-- DEBUG: Verificar estructura de tabla despachos
-- Fecha: 11 de Noviembre 2025
-- ================================================

-- Mostrar TODAS las columnas de la tabla despachos
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'despachos'
ORDER BY ordinal_position;
