-- ============================================================================
-- FIX: Actualizar empresa_id de choferes a Logística Express SRL
-- ============================================================================
-- Problema: 4 choferes tienen empresa_id inexistente
-- Solución: Actualizarlos al ID correcto de Logística Express
-- ============================================================================

-- 1. Ver choferes con empresa_id incorrecto
SELECT 
  id,
  nombre,
  apellido,
  dni,
  empresa_id,
  CASE 
    WHEN empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed' THEN '✓ Correcto'
    ELSE '❌ Incorrecto'
  END as estado
FROM choferes
ORDER BY apellido;

-- 2. Actualizar los 4 choferes al ID correcto de Logística Express
UPDATE choferes
SET empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'
WHERE empresa_id = '032b4d7f-18b4-4722-8fa4-2e7d723138f5';

-- 3. Verificar que se actualizaron correctamente
SELECT 
  nombre,
  apellido,
  dni,
  empresa_id,
  (SELECT nombre FROM empresas WHERE id = choferes.empresa_id) as empresa_nombre
FROM choferes
ORDER BY apellido;

-- ============================================================================
-- RESULTADO ESPERADO:
-- Los 5 choferes (Pedro, Carlos, Luis, Miguel, Jorge + Walter) 
-- ahora deberían tener empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'
-- ============================================================================
