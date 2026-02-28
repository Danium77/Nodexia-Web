-- ================================================================
-- Migración 073: Patch final de sincronización DEV → PROD
-- Fecha: 2026-02-28
-- Crea policies faltantes y corrige columnas restantes.
-- ================================================================

-- ── Corregir columnas restantes ──────────────────────────

-- configuracion_sistema.value: agregar NOT NULL
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "configuracion_sistema" WHERE "value" IS NULL LIMIT 1) THEN
    ALTER TABLE "configuracion_sistema" ALTER COLUMN "value" SET NOT NULL;
  END IF;
END $$;

-- roles_empresa.nombre: agregar NOT NULL
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "roles_empresa" WHERE "nombre" IS NULL LIMIT 1) THEN
    ALTER TABLE "roles_empresa" ALTER COLUMN "nombre" SET NOT NULL;
  END IF;
END $$;

-- notificaciones.tipo: cambiar de text a tipo_notificacion
-- Usar enfoque rename para evitar ALTER TYPE (causa conflictos con operators)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notificaciones'
      AND column_name='tipo' AND data_type='text'
  ) THEN
    -- 1. Rename old column
    EXECUTE 'ALTER TABLE notificaciones RENAME COLUMN tipo TO tipo_old';
    -- 2. Add new column with correct type
    EXECUTE 'ALTER TABLE notificaciones ADD COLUMN tipo tipo_notificacion';
    -- 3. Copy data
    EXECUTE 'UPDATE notificaciones SET tipo = tipo_old::tipo_notificacion';
    -- 4. Set NOT NULL
    EXECUTE 'ALTER TABLE notificaciones ALTER COLUMN tipo SET NOT NULL';
    -- 5. Drop old column
    EXECUTE 'ALTER TABLE notificaciones DROP COLUMN tipo_old';
    RAISE NOTICE 'notificaciones.tipo: convertido de text a tipo_notificacion';
  ELSE
    RAISE NOTICE 'notificaciones.tipo: ya es tipo_notificacion';
  END IF;
END $$;

-- ── Crear policies faltantes ─────────────────────────────

DROP POLICY IF EXISTS "acoplados_select_cross_empresa" ON "acoplados";
CREATE POLICY "acoplados_select_cross_empresa"
  ON "acoplados"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((id IN ( SELECT get_visible_acoplado_ids.acoplado_id
   FROM get_visible_acoplado_ids() get_visible_acoplado_ids(acoplado_id))));

DROP POLICY IF EXISTS "Ver auditoría según permisos" ON "auditoria_documentos";
CREATE POLICY "Ver auditoría según permisos"
  ON "auditoria_documentos"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM super_admins
  WHERE super_admins.user_id = auth.uid() AND super_admins.activo = true)) OR (documento_id IN ( SELECT de.id
   FROM documentos_entidad de
  WHERE (de.empresa_id IN ( SELECT ue.empresa_id
           FROM usuarios_empresa ue
          WHERE ue.user_id = auth.uid() AND ue.activo = true)))));

DROP POLICY IF EXISTS "camiones_select_cross_empresa" ON "camiones";
CREATE POLICY "camiones_select_cross_empresa"
  ON "camiones"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((id IN ( SELECT get_visible_camion_ids.camion_id
   FROM get_visible_camion_ids() get_visible_camion_ids(camion_id))));

DROP POLICY IF EXISTS "select_cancelaciones_admin" ON "cancelaciones_despachos";
CREATE POLICY "select_cancelaciones_admin"
  ON "cancelaciones_despachos"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM usuarios_empresa ue
  WHERE ue.user_id = auth.uid() AND ue.rol_interno = 'super_admin'::text)));

DROP POLICY IF EXISTS "select_cancelaciones_empresa" ON "cancelaciones_despachos";
CREATE POLICY "select_cancelaciones_empresa"
  ON "cancelaciones_despachos"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((empresa_id IN ( SELECT ue.empresa_id
   FROM usuarios_empresa ue
  WHERE ue.user_id = auth.uid())));

DROP POLICY IF EXISTS "choferes_select_cross_empresa" ON "choferes";
CREATE POLICY "choferes_select_cross_empresa"
  ON "choferes"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((id IN ( SELECT get_visible_chofer_ids.chofer_id
   FROM get_visible_chofer_ids() get_visible_chofer_ids(chofer_id))));

DROP POLICY IF EXISTS "Solo superadmin elimina documentos" ON "documentos_entidad";
CREATE POLICY "Solo superadmin elimina documentos"
  ON "documentos_entidad"
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((EXISTS ( SELECT 1
   FROM super_admins
  WHERE super_admins.user_id = auth.uid() AND super_admins.activo = true)));

DROP POLICY IF EXISTS "Ver documentos según rol" ON "documentos_entidad";
CREATE POLICY "Ver documentos según rol"
  ON "documentos_entidad"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM super_admins
  WHERE super_admins.user_id = auth.uid() AND super_admins.activo = true)) OR (empresa_id IN ( SELECT ue.empresa_id
   FROM usuarios_empresa ue
  WHERE ue.user_id = auth.uid() AND ue.activo = true)) OR entidad_tipo = 'chofer'::text AND (entidad_id IN ( SELECT c.id
   FROM choferes c
  WHERE c.usuario_id = auth.uid())) OR entidad_tipo = 'chofer'::text AND (entidad_id IN ( SELECT gi.chofer_id
   FROM get_visible_chofer_ids() gi(chofer_id))) OR entidad_tipo = 'camion'::text AND (entidad_id IN ( SELECT gi.camion_id
   FROM get_visible_camion_ids() gi(camion_id))) OR entidad_tipo = 'acoplado'::text AND (entidad_id IN ( SELECT gi.acoplado_id
   FROM get_visible_acoplado_ids() gi(acoplado_id))));

DROP POLICY IF EXISTS "Ver seguros de viaje" ON "documentos_viaje_seguro";
CREATE POLICY "Ver seguros de viaje"
  ON "documentos_viaje_seguro"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((viaje_id IN ( SELECT vd.id
   FROM viajes_despacho vd
  WHERE (vd.id_transporte IN ( SELECT ue.empresa_id
           FROM usuarios_empresa ue
          WHERE ue.user_id = auth.uid() AND ue.activo = true)))));

DROP POLICY IF EXISTS "Ver seguros de viaje planta" ON "documentos_viaje_seguro";
CREATE POLICY "Ver seguros de viaje planta"
  ON "documentos_viaje_seguro"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((viaje_id IN ( SELECT vd.id
   FROM viajes_despacho vd
     JOIN despachos d ON d.id = vd.despacho_id
  WHERE (d.empresa_id IN ( SELECT ue.empresa_id
           FROM usuarios_empresa ue
          WHERE ue.user_id = auth.uid() AND ue.activo = true)))));

DROP POLICY IF EXISTS "historial_despachos_insert" ON "historial_despachos";
CREATE POLICY "historial_despachos_insert"
  ON "historial_despachos"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "historial_despachos_select" ON "historial_despachos";
CREATE POLICY "historial_despachos_select"
  ON "historial_despachos"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios ven historial de su empresa" ON "historial_unidades_operativas";
CREATE POLICY "Usuarios ven historial de su empresa"
  ON "historial_unidades_operativas"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM unidades_operativas uo
     JOIN usuarios_empresa ue ON uo.empresa_id = ue.empresa_id
  WHERE uo.id = historial_unidades_operativas.unidad_operativa_id AND ue.user_id = auth.uid())));

DROP POLICY IF EXISTS "incidencias_viaje_admin_select" ON "incidencias_viaje";
CREATE POLICY "incidencias_viaje_admin_select"
  ON "incidencias_viaje"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM super_admins
  WHERE super_admins.user_id = auth.uid() AND super_admins.activo = true)) OR (EXISTS ( SELECT 1
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.rol_interno = 'admin_nodexia'::text AND usuarios_empresa.activo = true)));

DROP POLICY IF EXISTS "incidencias_viaje_admin_update" ON "incidencias_viaje";
CREATE POLICY "incidencias_viaje_admin_update"
  ON "incidencias_viaje"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((EXISTS ( SELECT 1
   FROM super_admins
  WHERE super_admins.user_id = auth.uid() AND super_admins.activo = true)) OR (EXISTS ( SELECT 1
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.rol_interno = 'admin_nodexia'::text AND usuarios_empresa.activo = true)));

DROP POLICY IF EXISTS "incidencias_viaje_insert" ON "incidencias_viaje";
CREATE POLICY "incidencias_viaje_insert"
  ON "incidencias_viaje"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (reportado_por = auth.uid() AND (viaje_id IN ( SELECT vd.id
   FROM viajes_despacho vd
     JOIN despachos d ON d.id = vd.despacho_id
     LEFT JOIN ubicaciones u_origen ON u_origen.id = COALESCE(d.origen_id, d.origen_ubicacion_id)
     LEFT JOIN ubicaciones u_destino ON u_destino.id = COALESCE(d.destino_id, d.destino_ubicacion_id)
  WHERE (COALESCE(u_origen.empresa_id, d.empresa_id) IN ( SELECT ue.empresa_id
           FROM usuarios_empresa ue
          WHERE ue.user_id = auth.uid() AND ue.activo = true)) OR (u_destino.empresa_id IN ( SELECT ue.empresa_id
           FROM usuarios_empresa ue
          WHERE ue.user_id = auth.uid() AND ue.activo = true)) OR (vd.id_transporte IN ( SELECT ue.empresa_id
           FROM usuarios_empresa ue
          WHERE ue.user_id = auth.uid() AND ue.activo = true)))));

DROP POLICY IF EXISTS "incidencias_viaje_select_empresa" ON "incidencias_viaje";
CREATE POLICY "incidencias_viaje_select_empresa"
  ON "incidencias_viaje"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((viaje_id IN ( SELECT vd.id
   FROM viajes_despacho vd
     JOIN despachos d ON d.id = vd.despacho_id
     LEFT JOIN ubicaciones u_origen ON u_origen.id = COALESCE(d.origen_id, d.origen_ubicacion_id)
     LEFT JOIN ubicaciones u_destino ON u_destino.id = COALESCE(d.destino_id, d.destino_ubicacion_id)
  WHERE (COALESCE(u_origen.empresa_id, d.empresa_id) IN ( SELECT ue.empresa_id
           FROM usuarios_empresa ue
          WHERE ue.user_id = auth.uid() AND ue.activo = true)) OR (u_destino.empresa_id IN ( SELECT ue.empresa_id
           FROM usuarios_empresa ue
          WHERE ue.user_id = auth.uid() AND ue.activo = true)) OR (vd.id_transporte IN ( SELECT ue.empresa_id
           FROM usuarios_empresa ue
          WHERE ue.user_id = auth.uid() AND ue.activo = true)))));

DROP POLICY IF EXISTS "incidencias_viaje_update" ON "incidencias_viaje";
CREATE POLICY "incidencias_viaje_update"
  ON "incidencias_viaje"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((viaje_id IN ( SELECT vd.id
   FROM viajes_despacho vd
     JOIN despachos d ON d.id = vd.despacho_id
     LEFT JOIN ubicaciones u_origen ON u_origen.id = COALESCE(d.origen_id, d.origen_ubicacion_id)
     LEFT JOIN ubicaciones u_destino ON u_destino.id = COALESCE(d.destino_id, d.destino_ubicacion_id)
  WHERE (COALESCE(u_origen.empresa_id, d.empresa_id) IN ( SELECT ue.empresa_id
           FROM usuarios_empresa ue
          WHERE ue.user_id = auth.uid() AND ue.activo = true)) OR (u_destino.empresa_id IN ( SELECT ue.empresa_id
           FROM usuarios_empresa ue
          WHERE ue.user_id = auth.uid() AND ue.activo = true)) OR (vd.id_transporte IN ( SELECT ue.empresa_id
           FROM usuarios_empresa ue
          WHERE ue.user_id = auth.uid() AND ue.activo = true)))));

DROP POLICY IF EXISTS "Sistema inserta notificaciones" ON "notificaciones";
CREATE POLICY "Sistema inserta notificaciones"
  ON "notificaciones"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios marcan como leídas" ON "notificaciones";
CREATE POLICY "Usuarios marcan como leídas"
  ON "notificaciones"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuarios ven sus notificaciones" ON "notificaciones";
CREATE POLICY "Usuarios ven sus notificaciones"
  ON "notificaciones"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "paradas_insert_auth" ON "paradas";
CREATE POLICY "paradas_insert_auth"
  ON "paradas"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "paradas_select_all" ON "paradas";
CREATE POLICY "paradas_select_all"
  ON "paradas"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "paradas_update_auth" ON "paradas";
CREATE POLICY "paradas_update_auth"
  ON "paradas"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "unidades_operativas_delete" ON "unidades_operativas";
CREATE POLICY "unidades_operativas_delete"
  ON "unidades_operativas"
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((empresa_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.activo = true)));

DROP POLICY IF EXISTS "unidades_operativas_insert" ON "unidades_operativas";
CREATE POLICY "unidades_operativas_insert"
  ON "unidades_operativas"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((empresa_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.activo = true)));

DROP POLICY IF EXISTS "unidades_operativas_select" ON "unidades_operativas";
CREATE POLICY "unidades_operativas_select"
  ON "unidades_operativas"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((empresa_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.activo = true)));

DROP POLICY IF EXISTS "unidades_operativas_update" ON "unidades_operativas";
CREATE POLICY "unidades_operativas_update"
  ON "unidades_operativas"
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((empresa_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.activo = true)))
  WITH CHECK ((empresa_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.activo = true)));

DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar viajes" ON "viajes_despacho";
CREATE POLICY "Usuarios autenticados pueden actualizar viajes"
  ON "viajes_despacho"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar viajes" ON "viajes_despacho";
CREATE POLICY "Usuarios autenticados pueden insertar viajes"
  ON "viajes_despacho"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver viajes" ON "viajes_despacho";
CREATE POLICY "Usuarios autenticados pueden ver viajes"
  ON "viajes_despacho"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Plantas actualizan sus viajes" ON "viajes_red_nodexia";
CREATE POLICY "Plantas actualizan sus viajes"
  ON "viajes_red_nodexia"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((EXISTS ( SELECT 1
   FROM usuarios_empresa ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = viajes_red_nodexia.empresa_solicitante_id)));

DROP POLICY IF EXISTS "Plantas crean viajes en red" ON "viajes_red_nodexia";
CREATE POLICY "Plantas crean viajes en red"
  ON "viajes_red_nodexia"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM usuarios_empresa ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = viajes_red_nodexia.empresa_solicitante_id)));

DROP POLICY IF EXISTS "Plantas ven sus viajes en red" ON "viajes_red_nodexia";
CREATE POLICY "Plantas ven sus viajes en red"
  ON "viajes_red_nodexia"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM usuarios_empresa ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = viajes_red_nodexia.empresa_solicitante_id)));

DROP POLICY IF EXISTS "Transportes ven viajes abiertos" ON "viajes_red_nodexia";
CREATE POLICY "Transportes ven viajes abiertos"
  ON "viajes_red_nodexia"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((estado_red::text = ANY (ARRAY['abierto'::character varying, 'con_ofertas'::character varying]::text[])) AND (EXISTS ( SELECT 1
   FROM usuarios_empresa ue
     JOIN empresas e ON e.id = ue.empresa_id
  WHERE ue.user_id = auth.uid() AND e.tipo_empresa = 'transporte'::text)));

-- ── Resultado ────────────────────────────────────────────
-- Migración 073: 35 policies creadas, 3 columnas corregidas
DO $$ BEGIN
  RAISE NOTICE '✅ Migración 073 completada: 35 policies, 3 columnas';
END $$;