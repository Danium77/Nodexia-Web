-- ============================================================================
-- BORRAR TODO - Unidades Operativas y Choferes de Logística Express
-- ============================================================================
-- Orden: Primero unidades operativas (tienen FK), luego choferes
-- ============================================================================

-- 1. Ver qué se va a borrar
SELECT 'Unidades Operativas' as tipo, COUNT(*) as total
FROM unidades_operativas
WHERE chofer_id IN (
  SELECT id FROM choferes WHERE empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'
)
UNION ALL
SELECT 'Choferes' as tipo, COUNT(*) as total
FROM choferes
WHERE empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed';

-- 2. Borrar unidades operativas primero
DELETE FROM unidades_operativas
WHERE chofer_id IN (
  SELECT id FROM choferes WHERE empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'
);

-- 3. Borrar choferes
DELETE FROM choferes
WHERE empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed';

-- 4. Verificar que todo se borró
SELECT 'Unidades Operativas Restantes' as tipo, COUNT(*) as total
FROM unidades_operativas
WHERE chofer_id IN (
  SELECT id FROM choferes WHERE empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'
)
UNION ALL
SELECT 'Choferes Restantes' as tipo, COUNT(*) as total
FROM choferes
WHERE empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed';
-- Ambos deberían mostrar 0

-- ============================================================================
-- SIGUIENTE PASO: IR A ADMIN NODEXIA
-- ============================================================================
-- URL: /admin/usuarios
--
-- Crear cada chofer con:
-- - Nombre completo, DNI, teléfono, email
-- - Rol: Chofer
-- - Empresa: Logística Express SRL
-- - Password
-- - ✓ Activo
--
-- El sistema automáticamente creará:
-- ✓ Usuario en auth.users
-- ✓ Registro en usuarios_empresa con rol "chofer"
-- ✓ Registro en choferes con usuario_id vinculado
-- ============================================================================
