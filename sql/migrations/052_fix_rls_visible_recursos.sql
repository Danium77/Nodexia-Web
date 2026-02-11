-- ============================================================================
-- Migration 052: Fix RLS visibility functions for cross-company resources
-- ============================================================================
-- PROBLEMA:
-- Las funciones get_visible_chofer_ids(), get_visible_camion_ids() y 
-- get_visible_acoplado_ids() tienen 3 branches OR que están rotos:
--
-- Branch 1: empresa_id match → OK (funciona para la empresa dueña del recurso)
-- Branch 2: d.origen_empresa_id / d.destino_empresa_id → FALLA (columnas nunca pobladas)
-- Branch 3: vd.empresa_id → FALLA (columna no existe, debería ser vd.id_transporte)
--
-- SOLUCIÓN:
-- - Branch 2: Reemplazar con d.created_by → usuarios_empresa para vincular con
--   la empresa que creó el despacho (coordinador)
-- - Branch 3: Usar vd.id_transporte (columna correcta en viajes_despacho)
-- - Agregar bypass para admin_nodexia y super_admins
-- ============================================================================

-- ── FIX: get_visible_chofer_ids() ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_visible_chofer_ids()
RETURNS TABLE(chofer_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  is_admin BOOLEAN := false;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Bypass para admin_nodexia y super_admins → ven todo
  SELECT EXISTS(
    SELECT 1 FROM usuarios_empresa 
    WHERE user_id = current_user_id AND activo = true AND rol_interno = 'admin_nodexia'
  ) OR EXISTS(
    SELECT 1 FROM super_admins 
    WHERE user_id = current_user_id AND activo = true
  ) INTO is_admin;

  IF is_admin THEN
    RETURN QUERY SELECT id FROM choferes;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT c.id
  FROM choferes c
  WHERE 
    -- Branch 1: Chofer pertenece a una de mis empresas
    c.empresa_id IN (
      SELECT empresa_id FROM usuarios_empresa 
      WHERE user_id = current_user_id AND activo = true
    )
    -- Branch 2: Chofer asignado a viajes de despachos creados por mi empresa
    OR c.id IN (
      SELECT DISTINCT vd.chofer_id
      FROM viajes_despacho vd
      JOIN despachos d ON d.id = vd.despacho_id
      JOIN usuarios_empresa ue_creator ON ue_creator.user_id = d.created_by AND ue_creator.activo = true
      WHERE vd.chofer_id IS NOT NULL
        AND ue_creator.empresa_id IN (
          SELECT empresa_id FROM usuarios_empresa 
          WHERE user_id = current_user_id AND activo = true
        )
    )
    -- Branch 3: Chofer asignado a viajes donde mi empresa es el transporte
    OR c.id IN (
      SELECT vd.chofer_id
      FROM viajes_despacho vd
      WHERE vd.id_transporte IN (
        SELECT empresa_id FROM usuarios_empresa 
        WHERE user_id = current_user_id AND activo = true
      )
      AND vd.chofer_id IS NOT NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION get_visible_chofer_ids() FROM public, anon;
GRANT EXECUTE ON FUNCTION get_visible_chofer_ids() TO authenticated;


-- ── FIX: get_visible_camion_ids() ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_visible_camion_ids()
RETURNS TABLE(camion_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  is_admin BOOLEAN := false;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Bypass para admin_nodexia y super_admins
  SELECT EXISTS(
    SELECT 1 FROM usuarios_empresa 
    WHERE user_id = current_user_id AND activo = true AND rol_interno = 'admin_nodexia'
  ) OR EXISTS(
    SELECT 1 FROM super_admins 
    WHERE user_id = current_user_id AND activo = true
  ) INTO is_admin;

  IF is_admin THEN
    RETURN QUERY SELECT id FROM camiones;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT c.id
  FROM camiones c
  WHERE 
    c.empresa_id IN (
      SELECT empresa_id FROM usuarios_empresa 
      WHERE user_id = current_user_id AND activo = true
    )
    OR c.id IN (
      SELECT DISTINCT vd.camion_id
      FROM viajes_despacho vd
      JOIN despachos d ON d.id = vd.despacho_id
      JOIN usuarios_empresa ue_creator ON ue_creator.user_id = d.created_by AND ue_creator.activo = true
      WHERE vd.camion_id IS NOT NULL
        AND ue_creator.empresa_id IN (
          SELECT empresa_id FROM usuarios_empresa 
          WHERE user_id = current_user_id AND activo = true
        )
    )
    OR c.id IN (
      SELECT vd.camion_id
      FROM viajes_despacho vd
      WHERE vd.id_transporte IN (
        SELECT empresa_id FROM usuarios_empresa 
        WHERE user_id = current_user_id AND activo = true
      )
      AND vd.camion_id IS NOT NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION get_visible_camion_ids() FROM public, anon;
GRANT EXECUTE ON FUNCTION get_visible_camion_ids() TO authenticated;


-- ── FIX: get_visible_acoplado_ids() ────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_visible_acoplado_ids()
RETURNS TABLE(acoplado_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  is_admin BOOLEAN := false;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Bypass para admin_nodexia y super_admins
  SELECT EXISTS(
    SELECT 1 FROM usuarios_empresa 
    WHERE user_id = current_user_id AND activo = true AND rol_interno = 'admin_nodexia'
  ) OR EXISTS(
    SELECT 1 FROM super_admins 
    WHERE user_id = current_user_id AND activo = true
  ) INTO is_admin;

  IF is_admin THEN
    RETURN QUERY SELECT id FROM acoplados;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT a.id
  FROM acoplados a
  WHERE 
    a.empresa_id IN (
      SELECT empresa_id FROM usuarios_empresa 
      WHERE user_id = current_user_id AND activo = true
    )
    OR a.id IN (
      SELECT DISTINCT vd.acoplado_id
      FROM viajes_despacho vd
      JOIN despachos d ON d.id = vd.despacho_id
      JOIN usuarios_empresa ue_creator ON ue_creator.user_id = d.created_by AND ue_creator.activo = true
      WHERE vd.acoplado_id IS NOT NULL
        AND ue_creator.empresa_id IN (
          SELECT empresa_id FROM usuarios_empresa 
          WHERE user_id = current_user_id AND activo = true
        )
    )
    OR a.id IN (
      SELECT vd.acoplado_id
      FROM viajes_despacho vd
      WHERE vd.id_transporte IN (
        SELECT empresa_id FROM usuarios_empresa 
        WHERE user_id = current_user_id AND activo = true
      )
      AND vd.acoplado_id IS NOT NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION get_visible_acoplado_ids() FROM public, anon;
GRANT EXECUTE ON FUNCTION get_visible_acoplado_ids() TO authenticated;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Verificar corrección:
-- SELECT proname, prosrc FROM pg_proc WHERE proname LIKE 'get_visible_%_ids';
