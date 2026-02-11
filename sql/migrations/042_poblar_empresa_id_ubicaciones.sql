-- sql/migrations/042_poblar_empresa_id_ubicaciones.sql
-- Poblar empresa_id en ubicaciones existentes usando CUIT

-- Paso 1: Verificar estado actual
SELECT 
  COUNT(*) as total_ubicaciones,
  COUNT(empresa_id) as con_empresa_id,
  COUNT(*) - COUNT(empresa_id) as sin_empresa_id
FROM ubicaciones;

-- Paso 2: Actualizar ubicaciones que tienen CUIT pero no empresa_id
UPDATE ubicaciones u
SET empresa_id = (
  SELECT e.id 
  FROM empresas e 
  WHERE e.cuit = u.cuit
  LIMIT 1
)
WHERE u.empresa_id IS NULL 
  AND u.cuit IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM empresas e 
    WHERE e.cuit = u.cuit
  );

-- Paso 3: Verificar resultado de la actualización
SELECT 
  u.id,
  u.nombre,
  u.cuit,
  u.empresa_id,
  e.nombre as empresa_nombre
FROM ubicaciones u
LEFT JOIN empresas e ON u.empresa_id = e.id
WHERE u.cuit IS NOT NULL
ORDER BY u.empresa_id NULLS FIRST, u.nombre;

-- Paso 4: Reportar ubicaciones sin empresa_id después de la migración
SELECT 
  u.id,
  u.nombre,
  u.cuit,
  u.tipo
FROM ubicaciones u
WHERE u.empresa_id IS NULL
ORDER BY u.nombre;

-- Comentario: 
-- Si quedan ubicaciones sin empresa_id, puede ser porque:
-- 1. No tienen CUIT asignado
-- 2. El CUIT no coincide con ninguna empresa registrada
-- 3. Son ubicaciones de tipo 'puerto' o 'transito' que no pertenecen a ninguna empresa específica
-- 
-- Para ubicaciones de Control de Acceso, el empresa_id DEBE estar poblado
-- para que el filtro por ubicación funcione correctamente.
