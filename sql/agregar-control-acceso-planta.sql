-- Agregar rol Control de Acceso para plantas
-- Este rol es necesario para gestionar ingreso/egreso de camiones en plantas

-- Verificar si el rol existe
DO $$
DECLARE
  rol_existente_id UUID;
BEGIN
  -- Buscar si ya existe el rol "Control de Acceso"
  SELECT id INTO rol_existente_id
  FROM roles_empresa
  WHERE nombre_rol = 'Control de Acceso'
  LIMIT 1;

  IF rol_existente_id IS NOT NULL THEN
    -- Si existe, actualizar para que sea válido para ambos tipos
    UPDATE roles_empresa
    SET tipo_empresa = 'ambos'
    WHERE id = rol_existente_id;
    
    RAISE NOTICE 'Rol "Control de Acceso" actualizado a tipo_empresa=ambos';
  ELSE
    -- Si no existe, crearlo
    INSERT INTO roles_empresa (nombre_rol, descripcion, tipo_empresa, activo)
    VALUES (
      'Control de Acceso',
      'Control de ingreso y egreso de vehículos en planta',
      'ambos',
      true
    );
    
    RAISE NOTICE 'Rol "Control de Acceso" creado para tipo_empresa=ambos';
  END IF;
END $$;

-- Verificar el resultado
SELECT id, nombre_rol, tipo_empresa, activo
FROM roles_empresa
WHERE nombre_rol = 'Control de Acceso';
