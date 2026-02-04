-- Verificar si el chofer existe en la tabla choferes
SELECT 
  id, 
  usuario_id, 
  nombre, 
  apellido, 
  activo,
  created_at
FROM choferes
WHERE id = '75251f55-d285-42af-beee-cded0c8c92a';

-- Si no aparece, buscar por usuario_id del usuario actual
-- (necesitarías el usuario_id de Walter Daniel Zayas)
