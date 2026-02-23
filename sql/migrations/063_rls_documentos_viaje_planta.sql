-- =============================================================================
-- Migration 063: RLS documentos_viaje_seguro — acceso empresa planta (coordinador/supervisor)
-- Fecha: 19-Feb-2026
-- Problema: La policy existente solo permite a la empresa de transporte ver los
--           documentos del viaje. La empresa planta (coordinador, supervisor)
--           no puede ver los remitos de sus propios despachos.
-- Solución: Agregar policy adicional para empresas que son origen/destino del despacho.
-- =============================================================================

-- Política SELECT para empresa planta (coordinador/supervisor ven remitos de sus despachos)
DROP POLICY IF EXISTS "Ver seguros de viaje planta" ON documentos_viaje_seguro;
CREATE POLICY "Ver seguros de viaje planta" ON documentos_viaje_seguro FOR SELECT
  USING (
    viaje_id IN (
      SELECT vd.id
      FROM viajes_despacho vd
      JOIN despachos d ON d.id = vd.despacho_id
      WHERE d.empresa_id IN (
        SELECT ue.empresa_id
        FROM usuarios_empresa ue
        WHERE ue.user_id = auth.uid()
          AND ue.activo = TRUE
      )
    )
  );

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 063: RLS documentos_viaje_seguro para empresa planta aplicada';
END $$;
