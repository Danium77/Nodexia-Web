-- Activar el rol Control de Acceso
UPDATE roles_empresa
SET activo = true
WHERE nombre_rol = 'Control de Acceso';

-- Verificar
SELECT id, nombre_rol, tipo_empresa, activo
FROM roles_empresa
WHERE nombre_rol = 'Control de Acceso';
