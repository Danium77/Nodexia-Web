-- ============================================================================
-- Migration 083: Fix RLS DELETE policy on despachos to include all role variants
-- ============================================================================
-- Problem: The DELETE policy created in migration 076 only matches exact
-- lowercase role names ('coordinador', 'coordinador_integral', 'admin_nodexia'),
-- but usuarios_empresa.rol_interno may contain legacy variants like
-- 'Coordinador', 'Coordinador de Transporte', 'Super Admin', etc.
-- The withAuth middleware normalizes these, but PostgreSQL RLS does not.
-- ============================================================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Solo coordinadores eliminan sus despachos" ON despachos;

-- Recreate with all known role variants (matching normalizeRole in withAuth.ts)
CREATE POLICY "Solo coordinadores eliminan sus despachos"
ON despachos FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = despachos.empresa_id
      AND LOWER(ue.rol_interno) IN (
        'coordinador',
        'coordinador_integral',
        'coordinador_transporte',
        'admin_nodexia',
        'super_admin',
        'gerente'
      )
      AND ue.activo = true
  )
);
