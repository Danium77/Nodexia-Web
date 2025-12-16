-- Verificar y corregir mapeo de roles para nueva-invitacion API
-- El API busca por nombre_rol, el wizard envía nombre_rol

-- Ver roles actuales
SELECT 
  id,
  nombre,
  nombre_rol,
  descripcion,
  tipo_empresa,
  activo
FROM roles_empresa
WHERE activo = true
ORDER BY tipo_empresa, nombre_rol;

-- Verificar que los roles comunes existan
-- Si no existen, la creación de usuarios fallará

-- Roles esperados para empresa de transporte:
-- - coordinador_transporte
-- - chofer
-- - administrativo

-- Si falta algún rol crítico, agregarlo aquí:
/*
INSERT INTO roles_empresa (nombre, nombre_rol, descripcion, tipo_empresa, activo)
VALUES 
  ('Operador', 'operador', 'Operador de transporte', 'transporte', true)
ON CONFLICT (nombre_rol, tipo_empresa) DO NOTHING;
*/
