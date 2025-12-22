-- Migration 022b: Limpiar roles antiguos y dejar solo los 6 nuevos
-- Ejecutar si aún aparecen roles antiguos después de la migración 022

BEGIN;

-- Desactivar TODOS los roles excepto los 6 nuevos del sistema
UPDATE roles_empresa
SET activo = false
WHERE nombre_rol NOT IN (
  'admin_nodexia',
  'coordinador',
  'control_acceso',
  'chofer',
  'supervisor',
  'administrativo'
);

-- Asegurar que los 6 roles del sistema están activos
UPDATE roles_empresa
SET activo = true, es_sistema = true
WHERE nombre_rol IN (
  'admin_nodexia',
  'coordinador',
  'control_acceso',
  'chofer',
  'supervisor',
  'administrativo'
);

-- Verificar resultado
SELECT 
  nombre_rol,
  tipo_empresa,
  activo,
  es_sistema,
  descripcion
FROM roles_empresa
WHERE activo = true
ORDER BY es_sistema DESC, nombre_rol;

COMMIT;

-- Mensaje de confirmación
DO $$
DECLARE
  v_activos INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_activos FROM roles_empresa WHERE activo = true;
  
  RAISE NOTICE '✅ Limpieza completada';
  RAISE NOTICE '   Roles activos: %', v_activos;
  
  IF v_activos != 6 THEN
    RAISE WARNING '⚠️ Se esperaban 6 roles activos, pero hay %', v_activos;
  END IF;
END $$;
