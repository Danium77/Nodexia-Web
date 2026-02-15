-- ============================================================================
-- FIX CRITICAL SECURITY: super_admins RLS policies
-- ============================================================================
-- PROBLEMA: La política actual permite a usuarios no autenticados (anon)
--           ver todos los registros de super_admins
--
-- SOLUCIÓN: Restringir acceso solo a usuarios autenticados viendo su propio registro
-- ============================================================================

-- 1. Eliminar política insegura
DROP POLICY IF EXISTS "Anon can view super_admins" ON super_admins;

-- 2. Crear política segura: Solo usuarios autenticados pueden ver su propio registro
CREATE POLICY "Users can view own super_admin record"
ON super_admins
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3. Permitir a service_role acceso completo (para operaciones administrativas)
CREATE POLICY "Service role has full access"
ON super_admins
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- VERIFICACIÓN: Ejecutar como usuario anon para confirmar que NO tiene acceso
-- ============================================================================
-- SET ROLE anon;
-- SELECT * FROM super_admins; -- Debería retornar 0 filas
-- RESET ROLE;

-- ============================================================================
-- VERIFICACIÓN: Confirmar que usuarios autenticados solo ven su registro
-- ============================================================================
-- Ejecutar desde el cliente con un usuario autenticado:
-- SELECT * FROM super_admins WHERE user_id = auth.uid();
-- Debería retornar solo 1 fila (su propio registro)
