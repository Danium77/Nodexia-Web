-- Migration 074: Final sync - roles_empresa NOT NULL + policy re-sync
-- Generated: 2026-02-06
-- Fixes remaining 2 non-backup differences between DEV and PROD

-- ============================================================
-- 1. Fill NULL nombre values in roles_empresa from their descriptions
-- ============================================================
UPDATE roles_empresa SET nombre = 'Administrativo de Transporte' WHERE id = 1 AND nombre IS NULL;
UPDATE roles_empresa SET nombre = 'Administrador Central' WHERE id = 2 AND nombre IS NULL;
UPDATE roles_empresa SET nombre = 'Coordinador General' WHERE id = 3 AND nombre IS NULL;
UPDATE roles_empresa SET nombre = 'Control de Acceso Planta' WHERE id = 4 AND nombre IS NULL;
UPDATE roles_empresa SET nombre = 'Chofer de Transporte' WHERE id = 5 AND nombre IS NULL;
UPDATE roles_empresa SET nombre = 'Administrativo' WHERE id = 6 AND nombre IS NULL;
UPDATE roles_empresa SET nombre = 'Super Admin Nodexia' WHERE id = 18 AND nombre IS NULL;
UPDATE roles_empresa SET nombre = 'Supervisor General' WHERE id = 19 AND nombre IS NULL;
UPDATE roles_empresa SET nombre = 'Usuario Estándar' WHERE id = 20 AND nombre IS NULL;
UPDATE roles_empresa SET nombre = 'Visualizador' WHERE id = 21 AND nombre IS NULL;
UPDATE roles_empresa SET nombre = 'Coordinador de Transporte' WHERE id = 26 AND nombre IS NULL;
UPDATE roles_empresa SET nombre = 'Supervisor de Operaciones' WHERE id = 27 AND nombre IS NULL;

-- Catch-all for any other NULL rows
UPDATE roles_empresa SET nombre = 'Rol ' || id WHERE nombre IS NULL;

-- Apply NOT NULL constraint
ALTER TABLE roles_empresa ALTER COLUMN nombre SET NOT NULL;

-- ============================================================
-- 2. Re-create policy to normalize USING expression
-- ============================================================
DROP POLICY IF EXISTS "Transportes ven viajes abiertos" ON viajes_red_nodexia;

CREATE POLICY "Transportes ven viajes abiertos"
  ON viajes_red_nodexia
  FOR SELECT
  USING (
    estado_red::text = ANY (ARRAY['abierto'::character varying, 'con_ofertas'::character varying]::text[])
    AND EXISTS (
      SELECT 1
      FROM usuarios_empresa ue
      JOIN empresas e ON e.id = ue.empresa_id
      WHERE ue.user_id = auth.uid()
        AND e.tipo_empresa = 'transporte'::text
    )
  );
