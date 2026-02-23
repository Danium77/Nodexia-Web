-- ============================================================================
-- Migración 061: Actualizar empresa_id en despachos legacy
-- ============================================================================
-- Fecha: 2026-02-18
-- Descripción: Populate empresa_id en despachos que no lo tienen usando
--              la empresa del usuario que los creó (created_by).
--
-- Context: Los despachos creados previamente no tenían empresa_id, solo
--          created_by. Esto rompía la validación de APIs de editar/reprogramar
--          que validan ownership por empresa (multi-tenant).
--
-- Seguro: Solo actualiza registros SIN empresa_id (IS NULL)
-- ============================================================================

-- Actualizar despachos sin empresa_id usando la empresa del usuario creador
UPDATE despachos
SET 
  empresa_id = ue.empresa_id,
  updated_at = NOW()
FROM usuarios_empresa ue
WHERE 
  despachos.empresa_id IS NULL
  AND despachos.created_by = ue.user_id
  -- Solo tomar la primera empresa del usuario (si tiene múltiples)
  AND ue.empresa_id = (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = despachos.created_by 
    LIMIT 1
  );

-- Verificar resultados
DO $$
DECLARE
  sin_empresa INTEGER;
  actualizados INTEGER;
BEGIN
  -- Contar despachos sin empresa_id después de la migración
  SELECT COUNT(*) INTO sin_empresa 
  FROM despachos 
  WHERE empresa_id IS NULL;

  -- Contar despachos actualizados (ahora con empresa_id)
  SELECT COUNT(*) INTO actualizados 
  FROM despachos 
  WHERE empresa_id IS NOT NULL;

  RAISE NOTICE '✅ Migración 061 completada:';
  RAISE NOTICE '   - Despachos con empresa_id: %', actualizados;
  RAISE NOTICE '   - Despachos sin empresa_id: %', sin_empresa;
  
  IF sin_empresa > 0 THEN
    RAISE WARNING '⚠️ Hay % despachos sin empresa_id (usuarios sin empresa asignada)', sin_empresa;
  END IF;
END $$;

-- ============================================================================
-- Notas de deployment:
-- ============================================================================
-- 1. Ejecutar en DEV primero para validar
-- 2. Verificar que todos los despachos tengan empresa_id después
-- 3. Si hay despachos sin empresa_id, revisar manualmente:
--    SELECT d.*, u.email 
--    FROM despachos d 
--    JOIN usuarios u ON u.id = d.created_by 
--    WHERE d.empresa_id IS NULL;
-- 4. Ejecutar en PROD
-- ============================================================================
