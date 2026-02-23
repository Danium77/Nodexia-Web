-- ============================================================================
-- Migration 064: Fix ubicaciones.empresa_id para ubicaciones sin empresa_id
-- ============================================================================
-- PROBLEMA:
-- La API /api/ubicaciones/crear no seteaba empresa_id al crear ubicaciones.
-- Migration 042 hizo un backfill por CUIT match pero ubicaciones creadas
-- después quedaron con empresa_id = NULL.
-- Esto rompe: recepciones en planificación, supervisor destino, chofer detection.
--
-- SOLUCIÓN: Re-ejecutar el CUIT match para ubicaciones sin empresa_id.
-- Además, ahora la API crear.ts ya incluye empresa_id en la creación.
-- ============================================================================

-- Verificar estado antes
SELECT 
  COUNT(*) as total,
  COUNT(empresa_id) as con_empresa,
  COUNT(*) - COUNT(empresa_id) as sin_empresa
FROM ubicaciones;

-- Backfill empresa_id por CUIT match
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

-- Verificar resultado
SELECT 
  u.id,
  u.nombre,
  u.cuit,
  u.empresa_id,
  e.nombre as empresa_nombre
FROM ubicaciones u
LEFT JOIN empresas e ON u.empresa_id = e.id
ORDER BY u.empresa_id NULLS FIRST, u.nombre;
