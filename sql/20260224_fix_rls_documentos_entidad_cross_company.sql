-- Migration: Fix RLS cross-company visibility for documentos_entidad (producción)
-- Fecha: 2026-02-24
-- Autor: Sonnet

-- Elimina la política SELECT anterior si existe
DROP POLICY IF EXISTS "Ver documentos según rol" ON documentos_entidad;

-- Crea la política extendida para visibilidad cross-company
CREATE POLICY "Ver documentos según rol" ON documentos_entidad
FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.user_id = auth.uid() AND super_admins.activo = true
  ))
  OR (empresa_id IN (
    SELECT ue.empresa_id FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid() AND ue.activo = true
  ))
  OR ((entidad_tipo = 'chofer') AND (entidad_id IN (
    SELECT c.id FROM choferes c WHERE c.usuario_id = auth.uid()
  )))
  OR ((entidad_tipo = 'chofer') AND (entidad_id IN (
    SELECT gi.chofer_id FROM get_visible_chofer_ids() gi
  )))
  OR ((entidad_tipo = 'camion') AND (entidad_id IN (
    SELECT gi.camion_id FROM get_visible_camion_ids() gi
  )))
  OR ((entidad_tipo = 'acoplado') AND (entidad_id IN (
    SELECT gi.acoplado_id FROM get_visible_acoplado_ids() gi
  )))
);
