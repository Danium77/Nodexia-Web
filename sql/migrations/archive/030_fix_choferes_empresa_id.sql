-- ============================================================================
-- MIGRACIÓN 030: Fix Choferes - Verificación de datos
-- ============================================================================
-- Fecha: 02-Feb-2026
-- Problema: Los choferes no aparecen en el tab de Gestión de Flota
-- SOLUCIÓN: La tabla choferes usa la columna 'empresa_id' (NO id_transporte)
-- ============================================================================

-- ACLARACIÓN IMPORTANTE:
-- La tabla 'choferes' usa la columna 'empresa_id' para asociar
-- con la empresa de transporte.

-- 1. Verificar estructura actual de la tabla
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'choferes' 
--   AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- 2. Listar choferes existentes con su empresa
SELECT 
  c.id,
  c.nombre,
  c.apellido,
  c.dni,
  c.empresa_id,
  e.nombre as empresa_nombre,
  e.tipo_empresa
FROM choferes c
LEFT JOIN empresas e ON e.id = c.empresa_id
ORDER BY c.apellido;

-- 3. Verificar índices existentes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'choferes';

-- 4. Verificar RLS policies
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'choferes';

-- 5. Si necesitas actualizar choferes sin empresa asignada:
-- UPDATE choferes
-- SET empresa_id = '[UUID-de-tu-empresa-logistica]'
-- WHERE empresa_id IS NULL;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================
COMMENT ON COLUMN choferes.empresa_id IS 
'UUID de la empresa de transporte a la que pertenece el chofer. Referencias tabla empresas(id).';

-- ============================================================================
-- FIN MIGRACIÓN 030
-- ============================================================================
-- Conclusión: La columna correcta es empresa_id (no id_transporte).
-- Si los choferes no aparecen, verificar que:
-- 1. Los choferes tienen empresa_id configurado
-- 2. El empresa_id coincide con la empresa del usuario logueado
-- 3. Las RLS policies permiten el acceso
-- ============================================================================
