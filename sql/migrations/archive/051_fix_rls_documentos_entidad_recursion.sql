-- =====================================================
-- Migration 051: Fix infinite recursion in documentos_entidad UPDATE policy
-- Error: code='42P17', message='infinite recursion detected in policy for relation "documentos_entidad"'
-- 
-- Root cause: The WITH CHECK clause of "Validar documentos según rol" policy 
-- contained subqueries like:
--   empresa_id = (SELECT empresa_id FROM documentos_entidad WHERE id = documentos_entidad.id)
-- These self-referencing subqueries trigger the SELECT policy on the same table,
-- which creates a recursive policy evaluation loop that PostgreSQL detects and rejects.
--
-- Fix: Remove the self-referencing subqueries from WITH CHECK.
-- Instead, restrict non-superadmin users to only updating validation-related fields
-- by checking that the row belongs to their empresa (same condition as USING clause).
-- Immutability of key fields (empresa_id, entidad_tipo, entidad_id, tipo_documento)
-- should be enforced via a BEFORE UPDATE trigger, not via RLS.
-- =====================================================

BEGIN;

-- Step 1: Drop the problematic UPDATE policy
DROP POLICY IF EXISTS "Validar documentos según rol" ON documentos_entidad;

-- Step 2: Create a non-recursive UPDATE policy
CREATE POLICY "Validar documentos según rol"
  ON documentos_entidad
  FOR UPDATE
  USING (
    -- Superadmin puede validar cualquier documento
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid() AND activo = TRUE
    )
    OR
    -- Coordinador de Planta / Control de Acceso / Supervisor de la misma empresa
    empresa_id IN (
      SELECT ue.empresa_id
      FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
        AND ue.activo = TRUE
        AND ue.rol_interno IN ('coordinador', 'supervisor', 'control_acceso')
    )
  )
  WITH CHECK (
    -- Superadmin puede cambiar cualquier campo
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid() AND activo = TRUE
    )
    OR
    -- Non-superadmin: the row must still belong to their empresa after the update
    -- (prevents reassigning a doc to a different empresa)
    empresa_id IN (
      SELECT ue.empresa_id
      FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
        AND ue.activo = TRUE
        AND ue.rol_interno IN ('coordinador', 'supervisor', 'control_acceso')
    )
  );

-- Step 3: Create a trigger to enforce immutability of key fields
-- This replaces the self-referencing WITH CHECK logic that caused recursion.
-- Prevents any user from changing empresa_id, entidad_tipo, entidad_id, or tipo_documento
-- on an existing document row.
CREATE OR REPLACE FUNCTION proteger_campos_inmutables_documento()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.empresa_id IS DISTINCT FROM NEW.empresa_id THEN
    RAISE EXCEPTION 'No se puede cambiar empresa_id de un documento existente';
  END IF;
  IF OLD.entidad_tipo IS DISTINCT FROM NEW.entidad_tipo THEN
    RAISE EXCEPTION 'No se puede cambiar entidad_tipo de un documento existente';
  END IF;
  IF OLD.entidad_id IS DISTINCT FROM NEW.entidad_id THEN
    RAISE EXCEPTION 'No se puede cambiar entidad_id de un documento existente';
  END IF;
  IF OLD.tipo_documento IS DISTINCT FROM NEW.tipo_documento THEN
    RAISE EXCEPTION 'No se puede cambiar tipo_documento de un documento existente';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_proteger_campos_inmutables ON documentos_entidad;
CREATE TRIGGER trigger_proteger_campos_inmutables
  BEFORE UPDATE ON documentos_entidad
  FOR EACH ROW
  EXECUTE FUNCTION proteger_campos_inmutables_documento();

COMMENT ON FUNCTION proteger_campos_inmutables_documento IS 
  'Prevents modification of key identifying fields (empresa_id, entidad_tipo, entidad_id, tipo_documento) on existing document rows. Replaces self-referencing RLS WITH CHECK that caused infinite recursion (42P17).';

COMMIT;
