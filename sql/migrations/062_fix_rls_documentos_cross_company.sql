-- ============================================================================
-- Migration 062: Fix RLS cross-company visibility for documentos_entidad
-- ============================================================================
-- PROBLEMA:
-- 1. Las funciones get_visible_chofer_ids(), get_visible_camion_ids(),
--    get_visible_acoplado_ids() tienen branches rotos:
--    - Branch 2 usa d.origen_empresa_id / d.destino_empresa_id (NUNCA poblados)
--    - Branch 3 usa vd.empresa_id (NO EXISTE, debe ser vd.id_transporte)
-- 2. La política RLS en documentos_entidad no incluye visibilidad cross-company,
--    por lo que control_acceso no puede ver documentos de choferes/camiones de
--    empresas de transporte.
--
-- SOLUCIÓN:
-- - Funciones: usar JOIN a ubicaciones.empresa_id vía despachos.origen_id/destino_id
--   para determinar visibilidad por planta (CUIT como puente)
-- - Policy: agregar cross-company visibility usando get_visible_* functions
-- - Manejar dual column names: COALESCE(vd.chofer_id, vd.id_chofer) etc.
-- ============================================================================


-- ══════════════════════════════════════════════════════════════════════════════
-- 1. FIX: get_visible_chofer_ids()
-- ══════════════════════════════════════════════════════════════════════════════

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

  -- Admin y super_admin ven todo
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
    -- Branch 2: Chofer en viaje cuyo despacho tiene origen/destino en ubicación de mi empresa
    -- (usa ubicaciones.empresa_id como puente vía CUIT)
    OR c.id IN (
      SELECT DISTINCT COALESCE(vd.chofer_id, vd.id_chofer)
      FROM viajes_despacho vd
      JOIN despachos d ON d.id = vd.despacho_id
      LEFT JOIN ubicaciones u_orig ON u_orig.id = COALESCE(d.origen_id, d.origen_ubicacion_id)
      LEFT JOIN ubicaciones u_dest ON u_dest.id = COALESCE(d.destino_id, d.destino_ubicacion_id)
      WHERE COALESCE(vd.chofer_id, vd.id_chofer) IS NOT NULL
        AND (
          u_orig.empresa_id IN (
            SELECT empresa_id FROM usuarios_empresa
            WHERE user_id = current_user_id AND activo = true
          )
          OR u_dest.empresa_id IN (
            SELECT empresa_id FROM usuarios_empresa
            WHERE user_id = current_user_id AND activo = true
          )
        )
    )
    -- Branch 3: Chofer en viaje de mi empresa de transporte
    OR c.id IN (
      SELECT COALESCE(vd.chofer_id, vd.id_chofer)
      FROM viajes_despacho vd
      WHERE vd.id_transporte IN (
        SELECT empresa_id FROM usuarios_empresa
        WHERE user_id = current_user_id AND activo = true
      )
      AND COALESCE(vd.chofer_id, vd.id_chofer) IS NOT NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION get_visible_chofer_ids() FROM public, anon;
GRANT EXECUTE ON FUNCTION get_visible_chofer_ids() TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- 2. FIX: get_visible_camion_ids()
-- ══════════════════════════════════════════════════════════════════════════════

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
      SELECT DISTINCT COALESCE(vd.camion_id, vd.id_camion)
      FROM viajes_despacho vd
      JOIN despachos d ON d.id = vd.despacho_id
      LEFT JOIN ubicaciones u_orig ON u_orig.id = COALESCE(d.origen_id, d.origen_ubicacion_id)
      LEFT JOIN ubicaciones u_dest ON u_dest.id = COALESCE(d.destino_id, d.destino_ubicacion_id)
      WHERE COALESCE(vd.camion_id, vd.id_camion) IS NOT NULL
        AND (
          u_orig.empresa_id IN (
            SELECT empresa_id FROM usuarios_empresa
            WHERE user_id = current_user_id AND activo = true
          )
          OR u_dest.empresa_id IN (
            SELECT empresa_id FROM usuarios_empresa
            WHERE user_id = current_user_id AND activo = true
          )
        )
    )
    OR c.id IN (
      SELECT COALESCE(vd.camion_id, vd.id_camion)
      FROM viajes_despacho vd
      WHERE vd.id_transporte IN (
        SELECT empresa_id FROM usuarios_empresa
        WHERE user_id = current_user_id AND activo = true
      )
      AND COALESCE(vd.camion_id, vd.id_camion) IS NOT NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION get_visible_camion_ids() FROM public, anon;
GRANT EXECUTE ON FUNCTION get_visible_camion_ids() TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- 3. FIX: get_visible_acoplado_ids()
-- ══════════════════════════════════════════════════════════════════════════════

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
      SELECT DISTINCT COALESCE(vd.acoplado_id, vd.id_acoplado)
      FROM viajes_despacho vd
      JOIN despachos d ON d.id = vd.despacho_id
      LEFT JOIN ubicaciones u_orig ON u_orig.id = COALESCE(d.origen_id, d.origen_ubicacion_id)
      LEFT JOIN ubicaciones u_dest ON u_dest.id = COALESCE(d.destino_id, d.destino_ubicacion_id)
      WHERE COALESCE(vd.acoplado_id, vd.id_acoplado) IS NOT NULL
        AND (
          u_orig.empresa_id IN (
            SELECT empresa_id FROM usuarios_empresa
            WHERE user_id = current_user_id AND activo = true
          )
          OR u_dest.empresa_id IN (
            SELECT empresa_id FROM usuarios_empresa
            WHERE user_id = current_user_id AND activo = true
          )
        )
    )
    OR a.id IN (
      SELECT COALESCE(vd.acoplado_id, vd.id_acoplado)
      FROM viajes_despacho vd
      WHERE vd.id_transporte IN (
        SELECT empresa_id FROM usuarios_empresa
        WHERE user_id = current_user_id AND activo = true
      )
      AND COALESCE(vd.acoplado_id, vd.id_acoplado) IS NOT NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION get_visible_acoplado_ids() FROM public, anon;
GRANT EXECUTE ON FUNCTION get_visible_acoplado_ids() TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- 4. UPDATE: documentos_entidad SELECT policy - cross-company visibility
-- ══════════════════════════════════════════════════════════════════════════════
-- Antes: solo empresa propia, super_admin, o chofer propio
-- Ahora: + entidades visibles via get_visible_* (despachos en mi ubicación)

DROP POLICY IF EXISTS "Ver documentos según rol" ON documentos_entidad;
CREATE POLICY "Ver documentos según rol" ON documentos_entidad FOR SELECT
  USING (
    -- 1. Super admins ven todo
    EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND activo = TRUE)
    -- 2. Documentos de mi propia empresa
    OR empresa_id IN (
      SELECT ue.empresa_id FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
    )
    -- 3. Chofer viendo sus propios documentos
    OR (entidad_tipo = 'chofer' AND entidad_id IN (
      SELECT c.id FROM choferes c WHERE c.usuario_id = auth.uid()
    ))
    -- 4. Cross-company: documentos de entidades visibles por relación despacho/ubicación
    OR (entidad_tipo = 'chofer' AND entidad_id IN (
      SELECT gi.chofer_id FROM get_visible_chofer_ids() gi
    ))
    OR (entidad_tipo = 'camion' AND entidad_id IN (
      SELECT gi.camion_id FROM get_visible_camion_ids() gi
    ))
    OR (entidad_tipo = 'acoplado' AND entidad_id IN (
      SELECT gi.acoplado_id FROM get_visible_acoplado_ids() gi
    ))
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- 5. VERIFICACIÓN
-- ══════════════════════════════════════════════════════════════════════════════
-- Verificar funciones actualizadas:
-- SELECT proname, prosrc FROM pg_proc WHERE proname LIKE 'get_visible_%_ids';
--
-- Verificar policy:
-- SELECT polname, polcmd, polqual FROM pg_policy WHERE polrelid = 'documentos_entidad'::regclass;
--
-- Test: usuario control_acceso debe poder ver documentos de choferes asignados
-- a viajes con despachos que apuntan a su ubicación (vía ubicaciones.empresa_id)
