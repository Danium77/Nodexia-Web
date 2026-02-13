-- ============================================================================
-- SYNC PRODUCCIÓN - PARTE 6: RLS Policies, Security y GRANTS
-- ============================================================================
-- Ejecutar en: https://supabase.com/dashboard/project/lkdcofsfjnltuzzzwoir/sql/new
-- DESPUÉS de Parte 5 (vistas)
-- ============================================================================

-- ============================================================================
-- SECCIÓN A: RLS - UNIDADES_OPERATIVAS (017)
-- ============================================================================

ALTER TABLE unidades_operativas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "unidades_operativas_select" ON unidades_operativas;
CREATE POLICY "unidades_operativas_select" ON unidades_operativas FOR SELECT TO authenticated
USING (empresa_id IN (SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid() AND activo = true));

DROP POLICY IF EXISTS "unidades_operativas_insert" ON unidades_operativas;
CREATE POLICY "unidades_operativas_insert" ON unidades_operativas FOR INSERT TO authenticated
WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid() AND activo = true));

DROP POLICY IF EXISTS "unidades_operativas_update" ON unidades_operativas;
CREATE POLICY "unidades_operativas_update" ON unidades_operativas FOR UPDATE TO authenticated
USING (empresa_id IN (SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid() AND activo = true))
WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid() AND activo = true));

DROP POLICY IF EXISTS "unidades_operativas_delete" ON unidades_operativas;
CREATE POLICY "unidades_operativas_delete" ON unidades_operativas FOR DELETE TO authenticated
USING (empresa_id IN (SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid() AND activo = true));

-- ============================================================================
-- SECCIÓN B: RLS - TRACKING_GPS (024)
-- ============================================================================

ALTER TABLE tracking_gps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven tracking de su empresa" ON tracking_gps;
CREATE POLICY "Usuarios ven tracking de su empresa"
ON tracking_gps FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM choferes c
    JOIN usuarios_empresa ue ON c.empresa_id = ue.empresa_id
    WHERE c.id = tracking_gps.chofer_id
      AND ue.user_id = auth.uid()
  )
);

-- ============================================================================
-- SECCIÓN C: RLS - HISTORIAL_UNIDADES_OPERATIVAS (025)
-- ============================================================================

ALTER TABLE historial_unidades_operativas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven historial de su empresa" ON historial_unidades_operativas;
CREATE POLICY "Usuarios ven historial de su empresa"
ON historial_unidades_operativas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM unidades_operativas uo
    JOIN usuarios_empresa ue ON uo.empresa_id = ue.empresa_id
    WHERE uo.id = historial_unidades_operativas.unidad_operativa_id
      AND ue.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Coordinadores insertan historial" ON historial_unidades_operativas;
CREATE POLICY "Coordinadores insertan historial"
ON historial_unidades_operativas FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND ue.rol_interno IN ('coordinador', 'admin', 'admin_nodexia', 'super_admin')
  )
);

-- ============================================================================
-- SECCIÓN D: RLS - NOTIFICACIONES (026) — solo actualizar policies existentes
-- ============================================================================

ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven sus notificaciones" ON notificaciones;
CREATE POLICY "Usuarios ven sus notificaciones"
ON notificaciones FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Sistema inserta notificaciones" ON notificaciones;
CREATE POLICY "Sistema inserta notificaciones"
ON notificaciones FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios marcan como leídas" ON notificaciones;
CREATE POLICY "Usuarios marcan como leídas"
ON notificaciones FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- SECCIÓN E: RLS - CANCELACIONES_DESPACHOS (028)
-- ============================================================================

ALTER TABLE cancelaciones_despachos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_cancelaciones_empresa ON cancelaciones_despachos;
CREATE POLICY select_cancelaciones_empresa ON cancelaciones_despachos FOR SELECT
  USING (empresa_id IN (SELECT ue.empresa_id FROM usuarios_empresa ue WHERE ue.user_id = auth.uid()));

DROP POLICY IF EXISTS insert_cancelaciones_coordinadores ON cancelaciones_despachos;
CREATE POLICY insert_cancelaciones_coordinadores ON cancelaciones_despachos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
        AND ue.empresa_id = cancelaciones_despachos.empresa_id
        AND ue.rol_interno IN ('coordinador', 'admin_empresa', 'super_admin')
    )
  );

DROP POLICY IF EXISTS select_cancelaciones_admin ON cancelaciones_despachos;
CREATE POLICY select_cancelaciones_admin ON cancelaciones_despachos FOR SELECT
  USING (EXISTS (SELECT 1 FROM usuarios_empresa ue WHERE ue.user_id = auth.uid() AND ue.rol_interno = 'super_admin'));

-- ============================================================================
-- SECCIÓN F: RLS - DOCUMENTOS_RECURSOS (046)
-- ============================================================================

ALTER TABLE documentos_recursos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver documentos de mi empresa" ON documentos_recursos;
CREATE POLICY "Ver documentos de mi empresa" ON documentos_recursos FOR SELECT
  USING (empresa_id IN (SELECT ue.empresa_id FROM usuarios_empresa ue WHERE ue.user_id = auth.uid() AND ue.activo = TRUE));

DROP POLICY IF EXISTS "Transporte sube documentos" ON documentos_recursos;
CREATE POLICY "Transporte sube documentos" ON documentos_recursos FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT ue.empresa_id FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
        AND ue.rol_interno IN ('coordinador_transporte', 'administrador_transporte', 'supervisor_transporte', 'coordinador')
    )
  );

DROP POLICY IF EXISTS "Admin Nodexia valida documentos" ON documentos_recursos;
CREATE POLICY "Admin Nodexia valida documentos" ON documentos_recursos FOR UPDATE
  USING (EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol_global = 'superadmin'));

DROP POLICY IF EXISTS "Coordinador Planta valida por incidencia" ON documentos_recursos;
CREATE POLICY "Coordinador Planta valida por incidencia" ON documentos_recursos FOR UPDATE
  USING (
    empresa_id IN (
      SELECT ue.empresa_id FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
        AND ue.rol_interno IN ('coordinador_planta', 'supervisor_planta', 'coordinador')
    )
  );

DROP POLICY IF EXISTS "Solo admin elimina documentos" ON documentos_recursos;
CREATE POLICY "Solo admin elimina documentos" ON documentos_recursos FOR DELETE
  USING (EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol_global = 'superadmin'));

-- ============================================================================
-- SECCIÓN G: RLS - HISTORIAL_DESPACHOS (055)
-- ============================================================================

ALTER TABLE historial_despachos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "historial_despachos_select" ON historial_despachos;
CREATE POLICY "historial_despachos_select" ON historial_despachos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "historial_despachos_insert" ON historial_despachos;
CREATE POLICY "historial_despachos_insert" ON historial_despachos
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================================
-- SECCIÓN H: RLS - PARADAS (058)
-- ============================================================================

ALTER TABLE paradas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "paradas_select_all" ON paradas;
CREATE POLICY "paradas_select_all" ON paradas FOR SELECT USING (true);

DROP POLICY IF EXISTS "paradas_insert_auth" ON paradas;
CREATE POLICY "paradas_insert_auth" ON paradas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "paradas_update_auth" ON paradas;
CREATE POLICY "paradas_update_auth" ON paradas FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- SECCIÓN I: RLS - AUDITORIA_ESTADOS (archive/029)
-- ============================================================================

ALTER TABLE auditoria_estados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven auditoría de sus viajes" ON auditoria_estados;
CREATE POLICY "Usuarios ven auditoría de sus viajes" ON auditoria_estados FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM viajes_despacho vd
      JOIN despachos d ON d.id = vd.despacho_id
      JOIN usuarios_empresa ue ON ue.empresa_id = d.empresa_id
      WHERE vd.id = auditoria_estados.viaje_id
        AND ue.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM viajes_despacho vd
      WHERE vd.id = auditoria_estados.viaje_id
        AND vd.id_transporte IN (SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid())
    )
  );

-- ============================================================================
-- SECCIÓN J: RLS - DOCUMENTOS_ENTIDAD (archive/046_CORREGIDO)
-- ============================================================================

ALTER TABLE documentos_entidad ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver documentos según rol" ON documentos_entidad;
CREATE POLICY "Ver documentos según rol" ON documentos_entidad FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND activo = TRUE)
    OR empresa_id IN (SELECT ue.empresa_id FROM usuarios_empresa ue WHERE ue.user_id = auth.uid() AND ue.activo = TRUE)
    OR (entidad_tipo = 'chofer' AND entidad_id IN (SELECT c.id FROM choferes c WHERE c.usuario_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Subir documentos según rol" ON documentos_entidad;
CREATE POLICY "Subir documentos según rol" ON documentos_entidad FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT ue.empresa_id FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
        AND ue.rol_interno IN ('coordinador', 'administrativo', 'supervisor')
    )
    OR (entidad_tipo = 'chofer' AND entidad_id IN (SELECT c.id FROM choferes c WHERE c.usuario_id = auth.uid()))
    OR (
      validacion_excepcional = TRUE
      AND EXISTS (
        SELECT 1 FROM usuarios_empresa ue
        WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
          AND ue.rol_interno IN ('control_acceso', 'coordinador', 'supervisor')
      )
    )
  );

DROP POLICY IF EXISTS "Validar documentos según rol" ON documentos_entidad;
CREATE POLICY "Validar documentos según rol" ON documentos_entidad FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND activo = TRUE)
    OR empresa_id IN (
      SELECT ue.empresa_id FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
        AND ue.rol_interno IN ('coordinador', 'supervisor', 'control_acceso')
    )
  );

DROP POLICY IF EXISTS "Solo superadmin elimina documentos" ON documentos_entidad;
CREATE POLICY "Solo superadmin elimina documentos" ON documentos_entidad FOR DELETE
  USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND activo = TRUE));

-- ============================================================================
-- SECCIÓN K: RLS - AUDITORIA_DOCUMENTOS (archive/046_CORREGIDO)
-- ============================================================================

ALTER TABLE auditoria_documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver auditoría según permisos" ON auditoria_documentos;
CREATE POLICY "Ver auditoría según permisos" ON auditoria_documentos FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND activo = TRUE)
    OR documento_id IN (
      SELECT de.id FROM documentos_entidad de
      WHERE de.empresa_id IN (
        SELECT ue.empresa_id FROM usuarios_empresa ue
        WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
      )
    )
  );

-- ============================================================================
-- SECCIÓN L: RLS - DOCUMENTOS_VIAJE_SEGURO (archive/046_CORREGIDO)
-- ============================================================================

ALTER TABLE documentos_viaje_seguro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver seguros de viaje" ON documentos_viaje_seguro;
CREATE POLICY "Ver seguros de viaje" ON documentos_viaje_seguro FOR SELECT
  USING (
    viaje_id IN (
      SELECT vd.id FROM viajes_despacho vd
      WHERE vd.id_transporte IN (
        SELECT ue.empresa_id FROM usuarios_empresa ue
        WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
      )
    )
  );

-- ============================================================================
-- SECCIÓN M: RLS - VIAJES_RED_NODEXIA (archive/029)
-- ============================================================================

ALTER TABLE viajes_red_nodexia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Plantas ven sus viajes en red" ON viajes_red_nodexia;
CREATE POLICY "Plantas ven sus viajes en red" ON viajes_red_nodexia FOR SELECT
  USING (EXISTS (SELECT 1 FROM usuarios_empresa ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = empresa_solicitante_id));

DROP POLICY IF EXISTS "Transportes ven viajes abiertos" ON viajes_red_nodexia;
CREATE POLICY "Transportes ven viajes abiertos" ON viajes_red_nodexia FOR SELECT
  USING (
    estado_red IN ('abierto', 'con_ofertas')
    AND EXISTS (
      SELECT 1 FROM usuarios_empresa ue
      JOIN empresas e ON e.id = ue.empresa_id
      WHERE ue.user_id = auth.uid() AND e.tipo_empresa = 'transporte'
    )
  );

DROP POLICY IF EXISTS "Plantas crean viajes en red" ON viajes_red_nodexia;
CREATE POLICY "Plantas crean viajes en red" ON viajes_red_nodexia FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM usuarios_empresa ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = empresa_solicitante_id));

DROP POLICY IF EXISTS "Plantas actualizan sus viajes" ON viajes_red_nodexia;
CREATE POLICY "Plantas actualizan sus viajes" ON viajes_red_nodexia FOR UPDATE
  USING (EXISTS (SELECT 1 FROM usuarios_empresa ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = empresa_solicitante_id));

-- ============================================================================
-- SECCIÓN N: RLS CROSS-EMPRESA CHOFERES/CAMIONES/ACOPLADOS (044)
-- ============================================================================

DROP POLICY IF EXISTS choferes_select_cross_empresa ON choferes;
CREATE POLICY choferes_select_cross_empresa ON choferes
FOR SELECT USING (id IN (SELECT chofer_id FROM get_visible_chofer_ids()));

DROP POLICY IF EXISTS camiones_select_cross_empresa ON camiones;
CREATE POLICY camiones_select_cross_empresa ON camiones
FOR SELECT USING (id IN (SELECT camion_id FROM get_visible_camion_ids()));

DROP POLICY IF EXISTS acoplados_select_cross_empresa ON acoplados;
CREATE POLICY acoplados_select_cross_empresa ON acoplados
FOR SELECT USING (id IN (SELECT acoplado_id FROM get_visible_acoplado_ids()));

-- ============================================================================
-- SECCIÓN O: SECURITY REVOKES (044)
-- ============================================================================

-- Drop test functions that shouldn't exist
DROP FUNCTION IF EXISTS simular_contexto_usuario(TEXT);
DROP FUNCTION IF EXISTS obtener_despachos_usuario(UUID);
DROP FUNCTION IF EXISTS crear_usuario_si_no_existe(TEXT, TEXT);

-- Revoke public/anon from SECURITY DEFINER functions (safe with EXCEPTION handler)
DO $$ BEGIN REVOKE ALL ON FUNCTION get_visible_chofer_ids() FROM public, anon; GRANT EXECUTE ON FUNCTION get_visible_chofer_ids() TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION get_visible_camion_ids() FROM public, anon; GRANT EXECUTE ON FUNCTION get_visible_camion_ids() TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION get_visible_acoplado_ids() FROM public, anon; GRANT EXECUTE ON FUNCTION get_visible_acoplado_ids() TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION actualizar_estado_unidad FROM public, anon; GRANT EXECUTE ON FUNCTION actualizar_estado_unidad TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION actualizar_estado_carga FROM public, anon; GRANT EXECUTE ON FUNCTION actualizar_estado_carga TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION validar_transicion_estado_unidad FROM public, anon; GRANT EXECUTE ON FUNCTION validar_transicion_estado_unidad TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION registrar_ubicacion_gps FROM public, anon; GRANT EXECUTE ON FUNCTION registrar_ubicacion_gps TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION get_notificaciones_count(UUID) FROM public, anon; GRANT EXECUTE ON FUNCTION get_notificaciones_count(UUID) TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION marcar_todas_leidas(UUID) FROM public, anon; GRANT EXECUTE ON FUNCTION marcar_todas_leidas(UUID) TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION get_documentos_viaje(UUID) FROM public, anon; GRANT EXECUTE ON FUNCTION get_documentos_viaje(UUID) TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION get_ultima_ubicacion_viaje(UUID) FROM public, anon; GRANT EXECUTE ON FUNCTION get_ultima_ubicacion_viaje(UUID) TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION buscar_ubicaciones FROM public, anon; GRANT EXECUTE ON FUNCTION buscar_ubicaciones TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION asignar_usuario_empresa FROM public, anon; GRANT EXECUTE ON FUNCTION asignar_usuario_empresa TO service_role; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION is_super_admin FROM public, anon; GRANT EXECUTE ON FUNCTION is_super_admin TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION get_empresas_admin FROM public, anon; GRANT EXECUTE ON FUNCTION get_empresas_admin TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION crear_empresa_admin FROM public, anon; GRANT EXECUTE ON FUNCTION crear_empresa_admin TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION actualizar_estado_empresa FROM public, anon; GRANT EXECUTE ON FUNCTION actualizar_estado_empresa TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION cambiar_plan_empresa FROM public, anon; GRANT EXECUTE ON FUNCTION cambiar_plan_empresa TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION get_estadisticas_sistema FROM public, anon; GRANT EXECUTE ON FUNCTION get_estadisticas_sistema TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION get_logs_admin FROM public, anon; GRANT EXECUTE ON FUNCTION get_logs_admin TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION get_user_permisos FROM public, anon; GRANT EXECUTE ON FUNCTION get_user_permisos TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION user_has_permission(TEXT) FROM public, anon; GRANT EXECUTE ON FUNCTION user_has_permission(TEXT) TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION get_usuarios_mi_empresa FROM public, anon; GRANT EXECUTE ON FUNCTION get_usuarios_mi_empresa TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION agregar_usuario_empresa FROM public, anon; GRANT EXECUTE ON FUNCTION agregar_usuario_empresa TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION get_user_empresa FROM public, anon; GRANT EXECUTE ON FUNCTION get_user_empresa TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION get_available_transportistas FROM public, anon; GRANT EXECUTE ON FUNCTION get_available_transportistas TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION get_mis_clientes FROM public, anon; GRANT EXECUTE ON FUNCTION get_mis_clientes TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION crear_relacion_empresa FROM public, anon; GRANT EXECUTE ON FUNCTION crear_relacion_empresa TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION get_network_stats FROM public, anon; GRANT EXECUTE ON FUNCTION get_network_stats TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION get_viaje_estados_historial FROM public, anon; GRANT EXECUTE ON FUNCTION get_viaje_estados_historial TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION get_estados_statistics FROM public, anon; GRANT EXECUTE ON FUNCTION get_estados_statistics TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION get_dashboard_kpis FROM public, anon; GRANT EXECUTE ON FUNCTION get_dashboard_kpis TO authenticated; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- ============================================================================
-- SECCIÓN P: GRANTS GENERALES
-- ============================================================================

-- Tablas
GRANT SELECT ON tracking_gps TO authenticated;
GRANT SELECT ON ultima_ubicacion_choferes TO authenticated;
GRANT SELECT ON historial_unidades_operativas TO authenticated;
GRANT INSERT ON historial_unidades_operativas TO authenticated;
GRANT SELECT ON vista_historial_unidades TO authenticated;
GRANT SELECT, UPDATE ON notificaciones TO authenticated;
GRANT SELECT ON vista_notificaciones_pendientes TO authenticated;
GRANT SELECT ON vista_analytics_cancelaciones TO authenticated;
GRANT SELECT ON vista_kpis_cancelaciones_empresa TO authenticated;
GRANT SELECT ON vista_viajes_expirados TO authenticated;
GRANT SELECT ON vista_despachos_con_descarga TO authenticated;
GRANT SELECT ON vista_disponibilidad_unidades TO authenticated;
GRANT SELECT ON documentos_proximos_vencer TO authenticated;

-- Funciones
GRANT EXECUTE ON FUNCTION get_metricas_expiracion TO authenticated;
GRANT EXECUTE ON FUNCTION reprogramar_viaje TO authenticated;
GRANT EXECUTE ON FUNCTION limpiar_viajes_abandonados TO authenticated;
GRANT EXECUTE ON FUNCTION esta_en_ventana_descarga TO authenticated;
GRANT EXECUTE ON FUNCTION calcular_disponibilidad_unidad TO authenticated;
GRANT EXECUTE ON FUNCTION limpiar_tracking_antiguo TO authenticated;
GRANT EXECUTE ON FUNCTION limpiar_notificaciones_antiguas TO authenticated;
GRANT EXECUTE ON FUNCTION limpiar_cancelaciones_antiguas TO authenticated;
GRANT EXECUTE ON FUNCTION verificar_estado_documentacion_recurso TO authenticated;
GRANT EXECUTE ON FUNCTION verificar_documentacion_viaje TO authenticated;
GRANT EXECUTE ON FUNCTION get_viaje_estados_historial(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_viaje_estados_historial(BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION verificar_documentacion_entidad TO authenticated;
GRANT EXECUTE ON FUNCTION verificar_documentacion_unidad_operativa TO authenticated;
GRANT EXECUTE ON FUNCTION obtener_documentacion_historica_viaje TO authenticated;

-- Administrativas (solo service_role)
REVOKE ALL ON FUNCTION actualizar_vigencia_documentos_batch FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION reemplazar_documento FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION crear_incidencia_documentacion FROM public, anon;
GRANT EXECUTE ON FUNCTION crear_incidencia_documentacion TO authenticated;

-- ============================================================================
-- SECCIÓN Q: CONSTRAINT estado_unidad_viaje (059)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estado_unidad_viaje') THEN
    ALTER TABLE estado_unidad_viaje
      DROP CONSTRAINT IF EXISTS estado_unidad_viaje_estado_unidad_check;
    ALTER TABLE estado_unidad_viaje
      ADD CONSTRAINT estado_unidad_viaje_estado_unidad_check
      CHECK (estado_unidad IN (
        'pendiente', 'transporte_asignado', 'camion_asignado', 'confirmado_chofer',
        'en_transito_origen', 'ingresado_origen', 'llamado_carga', 'cargando', 'cargado',
        'egreso_origen', 'en_transito_destino', 'ingresado_destino',
        'llamado_descarga', 'descargando', 'descargado', 'egreso_destino',
        'completado', 'cancelado'
      ));
    RAISE NOTICE 'CHECK constraint actualizado en estado_unidad_viaje';
  ELSE
    RAISE NOTICE 'Tabla estado_unidad_viaje no existe, saltando constraint';
  END IF;
END $$;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE 
  v_policies INTEGER;
  v_functions INTEGER;
  v_views INTEGER;
  v_indexes INTEGER;
  v_tables INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policies FROM pg_policies WHERE schemaname = 'public';
  SELECT COUNT(*) INTO v_functions FROM pg_proc WHERE pronamespace = 'public'::regnamespace;
  SELECT COUNT(*) INTO v_views FROM information_schema.views WHERE table_schema = 'public';
  SELECT COUNT(*) INTO v_indexes FROM pg_indexes WHERE schemaname = 'public';
  SELECT COUNT(*) INTO v_tables FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  SYNC PRODUCCIÓN COMPLETADO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tablas:     %', v_tables;
  RAISE NOTICE 'Vistas:     %', v_views;
  RAISE NOTICE 'Funciones:  %', v_functions;
  RAISE NOTICE 'Políticas:  %', v_policies;
  RAISE NOTICE 'Índices:    %', v_indexes;
  RAISE NOTICE '========================================';
END $$;
