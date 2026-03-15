-- =============================================================================
-- Migration 075: Fix ofertas_red_nodexia UPDATE + DELETE policy
-- Fecha: 15-Mar-2026
-- Problema: No existe UPDATE policy en ofertas_red_nodexia. 
--           El hook useRedNodexia.aceptarOferta() usa supabase client (no admin),
--           por lo que las UPDATE queries fallan silenciosamente (0 rows affected).
--           La API route /api/red-nodexia/aceptar-oferta usa supabaseAdmin (bypass).
-- Solución: 
--   1. Plantas pueden UPDATE ofertas de sus viajes (aceptar/rechazar)
--   2. Transportes pueden UPDATE sus propias ofertas (cancelar/modificar)
-- =============================================================================

-- 1. UPDATE policy: Plantas aceptan/rechazan ofertas de sus viajes
DROP POLICY IF EXISTS "Plantas actualizan ofertas de sus viajes" ON ofertas_red_nodexia;
CREATE POLICY "Plantas actualizan ofertas de sus viajes"
  ON ofertas_red_nodexia
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (
    viaje_red_id IN (
      SELECT vrn.id
      FROM viajes_red_nodexia vrn
      WHERE vrn.empresa_solicitante_id IN (
        SELECT ue.empresa_id
        FROM usuarios_empresa ue
        WHERE ue.user_id = auth.uid()
          AND ue.activo = true
      )
    )
  )
  WITH CHECK (
    viaje_red_id IN (
      SELECT vrn.id
      FROM viajes_red_nodexia vrn
      WHERE vrn.empresa_solicitante_id IN (
        SELECT ue.empresa_id
        FROM usuarios_empresa ue
        WHERE ue.user_id = auth.uid()
          AND ue.activo = true
      )
    )
  );

-- 2. UPDATE policy: Transportes pueden actualizar sus propias ofertas
DROP POLICY IF EXISTS "Transportes actualizan sus ofertas" ON ofertas_red_nodexia;
CREATE POLICY "Transportes actualizan sus ofertas"
  ON ofertas_red_nodexia
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (
    transporte_id IN (
      SELECT ue.empresa_id
      FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
        AND ue.activo = true
    )
  )
  WITH CHECK (
    transporte_id IN (
      SELECT ue.empresa_id
      FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
        AND ue.activo = true
    )
  );

-- 3. Registrar vista_disponibilidad_unidades en tracking (creada manualmente, no tracked)
INSERT INTO schema_migrations (version, name, filename, applied_at, applied_by)
VALUES ('017v', 'vista_disponibilidad_unidades_manual', 'manual_prod', now(), current_user)
ON CONFLICT (version) DO NOTHING;

-- 4. Registrar esta migración
INSERT INTO schema_migrations (version, name, filename, applied_at, applied_by)
VALUES ('075', 'fix_ofertas_update_policy', '075_fix_ofertas_update_policy.sql', now(), current_user)
ON CONFLICT (version) DO NOTHING;

-- Verificación
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM pg_policies 
  WHERE tablename = 'ofertas_red_nodexia' AND cmd = 'UPDATE';
  
  RAISE NOTICE '✅ Migration 075: % UPDATE policies en ofertas_red_nodexia', v_count;
END $$;
