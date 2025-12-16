-- Buscar empresa de Luis para vinculación
-- Mostrar todas las empresas disponibles

SELECT 
  id,
  nombre,
  cuit,
  tipo_empresa,
  created_at
FROM empresas
ORDER BY created_at DESC;
