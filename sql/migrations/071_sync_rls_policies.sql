-- ================================================================
-- Migración 071: RLS sync: sincronizar policies entre DEV y PROD
-- Fecha: 2026-02-28
-- Generado automáticamente por generate-sync-migration.js
-- Elimina policies obsoletas de PROD e instala las de DEV.
-- ================================================================

-- ── Habilitar RLS en tablas que lo tienen en DEV ──────────

ALTER TABLE IF EXISTS "acoplados" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "auditoria_documentos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "auditoria_estados" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "camiones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "cancelaciones_despachos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "choferes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "despachos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "documentos_entidad" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "documentos_viaje_seguro" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "empresa_ubicaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "empresas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "estado_carga_viaje" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "estado_unidad_viaje" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "historial_despachos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "historial_red_nodexia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "historial_unidades_operativas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "incidencias_viaje" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "notificaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ofertas_red_nodexia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "paradas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "recurso_asignaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "registros_acceso" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "relaciones_empresas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "requisitos_viaje_red" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ubicaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "unidades_operativas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "usuarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "usuarios_empresa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "vendedor_clientes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "viajes_despacho" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "viajes_red_nodexia" ENABLE ROW LEVEL SECURITY;

-- ── Eliminar policies obsoletas de PROD ─────────────────

DROP POLICY IF EXISTS "acoplados_delete" ON "acoplados";
DROP POLICY IF EXISTS "acoplados_delete_policy" ON "acoplados";
DROP POLICY IF EXISTS "acoplados_insert" ON "acoplados";
DROP POLICY IF EXISTS "acoplados_insert_policy" ON "acoplados";
DROP POLICY IF EXISTS "acoplados_select" ON "acoplados";
DROP POLICY IF EXISTS "acoplados_select_policy" ON "acoplados";
DROP POLICY IF EXISTS "acoplados_update" ON "acoplados";
DROP POLICY IF EXISTS "acoplados_update_policy" ON "acoplados";
DROP POLICY IF EXISTS "coordinador_delete_acoplados" ON "acoplados";
DROP POLICY IF EXISTS "coordinador_insert_acoplados" ON "acoplados";
DROP POLICY IF EXISTS "coordinador_select_acoplados" ON "acoplados";
DROP POLICY IF EXISTS "coordinador_update_acoplados" ON "acoplados";
DROP POLICY IF EXISTS "camiones_delete" ON "camiones";
DROP POLICY IF EXISTS "camiones_delete_policy" ON "camiones";
DROP POLICY IF EXISTS "camiones_insert" ON "camiones";
DROP POLICY IF EXISTS "camiones_insert_policy" ON "camiones";
DROP POLICY IF EXISTS "camiones_select" ON "camiones";
DROP POLICY IF EXISTS "camiones_select_policy" ON "camiones";
DROP POLICY IF EXISTS "camiones_update" ON "camiones";
DROP POLICY IF EXISTS "camiones_update_policy" ON "camiones";
DROP POLICY IF EXISTS "coordinador_delete_camiones" ON "camiones";
DROP POLICY IF EXISTS "coordinador_insert_camiones" ON "camiones";
DROP POLICY IF EXISTS "coordinador_select_camiones" ON "camiones";
DROP POLICY IF EXISTS "coordinador_update_camiones" ON "camiones";
DROP POLICY IF EXISTS "choferes_delete" ON "choferes";
DROP POLICY IF EXISTS "choferes_delete_policy" ON "choferes";
DROP POLICY IF EXISTS "choferes_insert" ON "choferes";
DROP POLICY IF EXISTS "choferes_insert_policy" ON "choferes";
DROP POLICY IF EXISTS "choferes_select" ON "choferes";
DROP POLICY IF EXISTS "choferes_select_policy" ON "choferes";
DROP POLICY IF EXISTS "choferes_update" ON "choferes";
DROP POLICY IF EXISTS "choferes_update_policy" ON "choferes";
DROP POLICY IF EXISTS "coordinador_delete_choferes" ON "choferes";
DROP POLICY IF EXISTS "coordinador_insert_choferes" ON "choferes";
DROP POLICY IF EXISTS "coordinador_select_choferes" ON "choferes";
DROP POLICY IF EXISTS "coordinador_update_choferes" ON "choferes";
DROP POLICY IF EXISTS "coordinador_delete_despachos" ON "despachos";
DROP POLICY IF EXISTS "despachos_delete_policy" ON "despachos";
DROP POLICY IF EXISTS "despachos_insert_policy" ON "despachos";
DROP POLICY IF EXISTS "despachos_select_policy" ON "despachos";
DROP POLICY IF EXISTS "despachos_update_policy" ON "despachos";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "despachos";
DROP POLICY IF EXISTS "read_all_authenticated_despatches" ON "despachos";
DROP POLICY IF EXISTS "Admin Nodexia valida documentos" ON "documentos_recursos";
DROP POLICY IF EXISTS "Solo admin elimina documentos" ON "documentos_recursos";
DROP POLICY IF EXISTS "Ver documentos de mi empresa" ON "documentos_recursos";
DROP POLICY IF EXISTS "allow_insert_empresa_ubicaciones" ON "empresa_ubicaciones";
DROP POLICY IF EXISTS "allow_read_empresa_ubicaciones" ON "empresa_ubicaciones";
DROP POLICY IF EXISTS "allow_update_empresa_ubicaciones" ON "empresa_ubicaciones";
DROP POLICY IF EXISTS "coordinadores_gestionar_vinculaciones" ON "empresa_ubicaciones";
DROP POLICY IF EXISTS "super_admin_empresa_ubicaciones_all" ON "empresa_ubicaciones";
DROP POLICY IF EXISTS "usuarios_ver_vinculaciones_empresa" ON "empresa_ubicaciones";
DROP POLICY IF EXISTS "Permitir inserción de estado carga" ON "estado_carga_viaje";
DROP POLICY IF EXISTS "Usuarios pueden ver estado carga de sus viajes" ON "estado_carga_viaje";
DROP POLICY IF EXISTS "Choferes pueden actualizar estado unidad" ON "estado_unidad_viaje";
DROP POLICY IF EXISTS "Permitir inserción de estado unidad" ON "estado_unidad_viaje";
DROP POLICY IF EXISTS "Usuarios pueden ver estado unidad de sus viajes" ON "estado_unidad_viaje";
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar incidencias" ON "incidencias_viaje";
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver incidencias" ON "incidencias_viaje";
DROP POLICY IF EXISTS "Usuarios pueden marcar como leída" ON "notificaciones";
DROP POLICY IF EXISTS "Usuarios solo ven sus notificaciones" ON "notificaciones";
DROP POLICY IF EXISTS "plantas_select_ofertas" ON "ofertas_red_nodexia";
DROP POLICY IF EXISTS "plantas_update_ofertas" ON "ofertas_red_nodexia";
DROP POLICY IF EXISTS "transportes_insert_ofertas" ON "ofertas_red_nodexia";
DROP POLICY IF EXISTS "transportes_select_ofertas" ON "ofertas_red_nodexia";
DROP POLICY IF EXISTS "Ver ofertas" ON "ofertas_red_nodexia";
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON "profiles";
DROP POLICY IF EXISTS "registros_acceso_insert_policy" ON "registros_acceso";
DROP POLICY IF EXISTS "registros_acceso_select_policy" ON "registros_acceso";
DROP POLICY IF EXISTS "Plantas crean requisitos" ON "requisitos_viaje_red";
DROP POLICY IF EXISTS "Ver requisitos" ON "requisitos_viaje_red";
DROP POLICY IF EXISTS "roles_admin_policy" ON "roles_empresa";
DROP POLICY IF EXISTS "roles_select_policy" ON "roles_empresa";
DROP POLICY IF EXISTS "Todos pueden ver roles de empresa" ON "roles_empresa";
DROP POLICY IF EXISTS "Service role has full access" ON "super_admins";
DROP POLICY IF EXISTS "Users can view own super_admin record" ON "super_admins";
DROP POLICY IF EXISTS "Users can view their own super_admin status" ON "super_admins";
DROP POLICY IF EXISTS "Usuarios ven tracking de su empresa" ON "tracking_gps";
DROP POLICY IF EXISTS "Permitir todo en ubicaciones_choferes" ON "ubicaciones_choferes";
DROP POLICY IF EXISTS "allow_read_ubicaciones" ON "ubicaciones";
DROP POLICY IF EXISTS "super_admin_ubicaciones_all" ON "ubicaciones";
DROP POLICY IF EXISTS "usuarios_ver_ubicaciones_vinculadas" ON "ubicaciones";
DROP POLICY IF EXISTS "Admins pueden borrar perfiles de usuario" ON "usuarios";
DROP POLICY IF EXISTS "Admins pueden crear perfiles de usuario" ON "usuarios";
DROP POLICY IF EXISTS "Enable read access for all users" ON "usuarios";
DROP POLICY IF EXISTS "Los usuarios pueden ver y editar su propio perfil." ON "usuarios";
DROP POLICY IF EXISTS "Usuarios pueden actualizar su perfil, Admins pueden actualizar " ON "usuarios";
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil y admins pueden ver todos" ON "usuarios";
DROP POLICY IF EXISTS "plantas_insert_viajes" ON "viajes_red_nodexia";
DROP POLICY IF EXISTS "plantas_select_viajes" ON "viajes_red_nodexia";
DROP POLICY IF EXISTS "plantas_update_viajes" ON "viajes_red_nodexia";
DROP POLICY IF EXISTS "Solo transportes sin vinculo ven viajes" ON "viajes_red_nodexia";
DROP POLICY IF EXISTS "Transportes ven viajes con sus ofertas" ON "viajes_red_nodexia";

-- ── Crear/actualizar policies de DEV ────────────────────

CREATE POLICY "acoplados_insert_own_empresa"
  ON "acoplados"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((empresa_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.activo = true)));

CREATE POLICY "acoplados_update_own_empresa"
  ON "acoplados"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((empresa_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.activo = true)));

DROP POLICY IF EXISTS "Usuarios ven auditoría de sus viajes" ON "auditoria_estados";
CREATE POLICY "Usuarios ven auditoría de sus viajes"
  ON "auditoria_estados"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM viajes_despacho vd
     JOIN despachos d ON d.id = vd.despacho_id
     JOIN usuarios_empresa ue ON ue.empresa_id = d.empresa_id
  WHERE vd.id = auditoria_estados.viaje_id AND ue.user_id = auth.uid())) OR (EXISTS ( SELECT 1
   FROM viajes_despacho vd
  WHERE vd.id = auditoria_estados.viaje_id AND (vd.id_transporte IN ( SELECT usuarios_empresa.empresa_id
           FROM usuarios_empresa
          WHERE usuarios_empresa.user_id = auth.uid())))));

CREATE POLICY "camiones_insert_own_empresa"
  ON "camiones"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((empresa_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.activo = true)));

CREATE POLICY "camiones_update_own_empresa"
  ON "camiones"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((empresa_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.activo = true)));

DROP POLICY IF EXISTS "insert_cancelaciones_coordinadores" ON "cancelaciones_despachos";
CREATE POLICY "insert_cancelaciones_coordinadores"
  ON "cancelaciones_despachos"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM usuarios_empresa ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = cancelaciones_despachos.empresa_id AND (ue.rol_interno = ANY (ARRAY['coordinador'::text, 'coordinador_integral'::text, 'admin_empresa'::text, 'super_admin'::text])))));

CREATE POLICY "choferes_insert_own_empresa"
  ON "choferes"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((empresa_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.activo = true)));

CREATE POLICY "choferes_update_own_empresa"
  ON "choferes"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((empresa_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.activo = true)));

CREATE POLICY "read_all_mvp"
  ON "customers"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "update_all_mvp"
  ON "customers"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "write_all_mvp"
  ON "customers"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Usuarios autenticados actualizan despachos"
  ON "despachos"
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados crean despachos"
  ON "despachos"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados eliminan despachos"
  ON "despachos"
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados ven despachos"
  ON "despachos"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Vendedor ve despachos de sus clientes"
  ON "despachos"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM usuarios_empresa ue
     JOIN vendedor_clientes vc ON vc.vendedor_user_id = ue.user_id AND vc.empresa_id = ue.empresa_id AND vc.activo = true
  WHERE ue.user_id = auth.uid() AND ue.activo = true AND ue.rol_interno = 'vendedor'::text AND ue.empresa_id = despachos.empresa_id AND vc.cliente_empresa_id = COALESCE(despachos.destino_empresa_id, ( SELECT u.empresa_id
           FROM ubicaciones u
          WHERE u.id = despachos.destino_id)))));

DROP POLICY IF EXISTS "Subir documentos según rol" ON "documentos_entidad";
CREATE POLICY "Subir documentos según rol"
  ON "documentos_entidad"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((empresa_id IN ( SELECT ue.empresa_id
   FROM usuarios_empresa ue
  WHERE ue.user_id = auth.uid() AND ue.activo = true AND (ue.rol_interno = ANY (ARRAY['coordinador'::text, 'coordinador_integral'::text, 'administrativo'::text, 'supervisor'::text])))) OR entidad_tipo = 'chofer'::text AND (entidad_id IN ( SELECT c.id
   FROM choferes c
  WHERE c.usuario_id = auth.uid())) OR validacion_excepcional = true AND (EXISTS ( SELECT 1
   FROM usuarios_empresa ue
  WHERE ue.user_id = auth.uid() AND ue.activo = true AND (ue.rol_interno = ANY (ARRAY['control_acceso'::text, 'coordinador'::text, 'coordinador_integral'::text, 'supervisor'::text])))));

DROP POLICY IF EXISTS "Validar documentos según rol" ON "documentos_entidad";
CREATE POLICY "Validar documentos según rol"
  ON "documentos_entidad"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((EXISTS ( SELECT 1
   FROM super_admins
  WHERE super_admins.user_id = auth.uid() AND super_admins.activo = true)) OR (empresa_id IN ( SELECT ue.empresa_id
   FROM usuarios_empresa ue
  WHERE ue.user_id = auth.uid() AND ue.activo = true AND (ue.rol_interno = ANY (ARRAY['coordinador'::text, 'coordinador_integral'::text, 'supervisor'::text, 'control_acceso'::text])))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM super_admins
  WHERE super_admins.user_id = auth.uid() AND super_admins.activo = true)) OR (empresa_id IN ( SELECT ue.empresa_id
   FROM usuarios_empresa ue
  WHERE ue.user_id = auth.uid() AND ue.activo = true AND (ue.rol_interno = ANY (ARRAY['coordinador'::text, 'coordinador_integral'::text, 'supervisor'::text, 'control_acceso'::text])))));

DROP POLICY IF EXISTS "Coordinador Planta valida por incidencia" ON "documentos_recursos";
CREATE POLICY "Coordinador Planta valida por incidencia"
  ON "documentos_recursos"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((empresa_id IN ( SELECT ue.empresa_id
   FROM usuarios_empresa ue
  WHERE ue.user_id = auth.uid() AND ue.activo = true AND (ue.rol_interno = ANY (ARRAY['coordinador_planta'::text, 'supervisor_planta'::text, 'coordinador'::text, 'coordinador_integral'::text])))));

DROP POLICY IF EXISTS "Transporte sube documentos" ON "documentos_recursos";
CREATE POLICY "Transporte sube documentos"
  ON "documentos_recursos"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((empresa_id IN ( SELECT ue.empresa_id
   FROM usuarios_empresa ue
  WHERE ue.user_id = auth.uid() AND ue.activo = true AND (ue.rol_interno = ANY (ARRAY['coordinador_transporte'::text, 'administrador_transporte'::text, 'supervisor_transporte'::text, 'coordinador'::text, 'coordinador_integral'::text])))));

CREATE POLICY "Usuarios eliminan vinculos de su empresa"
  ON "empresa_ubicaciones"
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((empresa_id IN ( SELECT ue.empresa_id
   FROM usuarios_empresa ue
  WHERE ue.user_id = auth.uid())));

CREATE POLICY "Usuarios gestionan vinculos de su empresa"
  ON "empresa_ubicaciones"
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((empresa_id IN ( SELECT ue.empresa_id
   FROM usuarios_empresa ue
  WHERE ue.user_id = auth.uid())));

CREATE POLICY "Usuarios ven vinculos de su empresa"
  ON "empresa_ubicaciones"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((empresa_id IN ( SELECT ue.empresa_id
   FROM usuarios_empresa ue
  WHERE ue.user_id = auth.uid())));

CREATE POLICY "Usuarios vinculan ubicaciones a su empresa"
  ON "empresa_ubicaciones"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((empresa_id IN ( SELECT ue.empresa_id
   FROM usuarios_empresa ue
  WHERE ue.user_id = auth.uid())));

CREATE POLICY "empresas_lectura"
  ON "empresas"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "usuarios_autenticados_actualizan_empresas"
  ON "empresas"
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "usuarios_autenticados_crean_empresas"
  ON "empresas"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Sistema maneja estado_carga_viaje"
  ON "estado_carga_viaje"
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (auth.role() = 'authenticated'::text)
  WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Usuarios autenticados pueden actualizar estado_carga"
  ON "estado_carga_viaje"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden insertar estado_carga"
  ON "estado_carga_viaje"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden ver estado_carga"
  ON "estado_carga_viaje"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios ven estado_carga_viaje"
  ON "estado_carga_viaje"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Usuarios autenticados pueden actualizar estado_unidad"
  ON "estado_unidad_viaje"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden insertar estado_unidad"
  ON "estado_unidad_viaje"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden ver estado_unidad"
  ON "estado_unidad_viaje"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios ven historial de su empresa"
  ON "historial_red_nodexia"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((empresa_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid())));

DROP POLICY IF EXISTS "Coordinadores insertan historial" ON "historial_unidades_operativas";
CREATE POLICY "Coordinadores insertan historial"
  ON "historial_unidades_operativas"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM usuarios_empresa ue
  WHERE ue.user_id = auth.uid() AND (ue.rol_interno = ANY (ARRAY['coordinador'::text, 'coordinador_integral'::text, 'admin'::text, 'admin_nodexia'::text, 'super_admin'::text])))));

CREATE POLICY "Usuarios autenticados pueden crear incidencias"
  ON "incidencias_viaje"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar incidencias"
  ON "incidencias_viaje"
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden reportar incidencias"
  ON "incidencias_viaje"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios pueden ver incidencias"
  ON "incidencias_viaje"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Plantas ven ofertas de sus viajes"
  ON "ofertas_red_nodexia"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((viaje_red_id IN ( SELECT viajes_red_nodexia.id
   FROM viajes_red_nodexia
  WHERE (viajes_red_nodexia.empresa_solicitante_id IN ( SELECT usuarios_empresa.empresa_id
           FROM usuarios_empresa
          WHERE usuarios_empresa.user_id = auth.uid())))));

CREATE POLICY "Transportes crean ofertas"
  ON "ofertas_red_nodexia"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((transporte_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid())));

CREATE POLICY "Transportes ven sus ofertas"
  ON "ofertas_red_nodexia"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((transporte_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid())));

CREATE POLICY "Service role can insert profiles"
  ON "profiles"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update own profile"
  ON "profiles"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (auth.uid() = id);

CREATE POLICY "Users can view own profile"
  ON "profiles"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (auth.uid() = id);

CREATE POLICY "Empresas actualizan sus asignaciones"
  ON "recurso_asignaciones"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((empresa_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.activo = true)))
  WITH CHECK ((empresa_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.activo = true)));

CREATE POLICY "Empresas crean asignaciones para sí mismas"
  ON "recurso_asignaciones"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((empresa_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.activo = true)));

CREATE POLICY "Empresas ven sus asignaciones"
  ON "recurso_asignaciones"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((empresa_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.activo = true)));

CREATE POLICY "registros_acceso_insert_authenticated"
  ON "registros_acceso"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "registros_acceso_select_authenticated"
  ON "registros_acceso"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins pueden eliminar relaciones"
  ON "relaciones_empresas"
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((empresa_cliente_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.activo = true AND (usuarios_empresa.rol_interno = ANY (ARRAY['admin'::text, 'admin_nodexia'::text, 'super_admin'::text])))));

CREATE POLICY "Coordinadores actualizan relaciones"
  ON "relaciones_empresas"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((empresa_cliente_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.activo = true AND (usuarios_empresa.rol_interno = ANY (ARRAY['coordinador'::text, 'admin'::text, 'admin_nodexia'::text, 'super_admin'::text])))));

CREATE POLICY "Coordinadores crean relaciones"
  ON "relaciones_empresas"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((empresa_cliente_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.activo = true AND (usuarios_empresa.rol_interno = ANY (ARRAY['coordinador'::text, 'admin'::text, 'admin_nodexia'::text, 'super_admin'::text])))));

CREATE POLICY "relaciones_empresa_lectura"
  ON "relaciones_empresas"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (estado = 'activa'::text AND ((empresa_cliente_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid())) OR (empresa_transporte_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid()))));

CREATE POLICY "Ver relaciones de mis empresas"
  ON "relaciones_empresas"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((empresa_cliente_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.activo = true)) OR (empresa_transporte_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid() AND usuarios_empresa.activo = true)));

CREATE POLICY "Actualizar requisitos de viaje"
  ON "requisitos_viaje_red"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((EXISTS ( SELECT 1
   FROM viajes_red_nodexia vrn
     JOIN usuarios_empresa ue ON ue.empresa_id = vrn.empresa_solicitante_id
  WHERE vrn.id = requisitos_viaje_red.viaje_red_id AND ue.user_id = auth.uid() AND ue.activo = true)));

CREATE POLICY "Crear requisitos de viaje"
  ON "requisitos_viaje_red"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM viajes_red_nodexia vrn
     JOIN usuarios_empresa ue ON ue.empresa_id = vrn.empresa_solicitante_id
  WHERE vrn.id = requisitos_viaje_red.viaje_red_id AND ue.user_id = auth.uid() AND ue.activo = true)));

DROP POLICY IF EXISTS "Ver requisitos de viajes accesibles" ON "requisitos_viaje_red";
CREATE POLICY "Ver requisitos de viajes accesibles"
  ON "requisitos_viaje_red"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role puede gestionar ubicaciones"
  ON "ubicaciones"
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (true);

CREATE POLICY "Ubicaciones visibles para usuarios autenticados"
  ON "ubicaciones"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin_puede_actualizar_asociaciones"
  ON "usuarios_empresa"
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "admin_puede_crear_asociaciones"
  ON "usuarios_empresa"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "admin_puede_ver_todas_asociaciones"
  ON "usuarios_empresa"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "usuarios_ven_sus_propias_asociaciones"
  ON "usuarios_empresa"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (user_id = auth.uid());

CREATE POLICY "admin_puede_actualizar_usuarios"
  ON "usuarios"
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "admin_puede_crear_usuarios"
  ON "usuarios"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "admin_puede_ver_todos_usuarios"
  ON "usuarios"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage usuarios"
  ON "usuarios"
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (true);

CREATE POLICY "Users can view own usuario"
  ON "usuarios"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (auth.uid() = id);

CREATE POLICY "Coordinadores gestionan vendedor_clientes"
  ON "vendedor_clientes"
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((empresa_id IN ( SELECT ue.empresa_id
   FROM usuarios_empresa ue
  WHERE ue.user_id = auth.uid() AND ue.activo = true AND (ue.rol_interno = ANY (ARRAY['coordinador'::text, 'coordinador_integral'::text, 'administrativo'::text])))));

CREATE POLICY "Super admin ve vendedor_clientes"
  ON "vendedor_clientes"
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((EXISTS ( SELECT 1
   FROM super_admins
  WHERE super_admins.user_id = auth.uid() AND super_admins.activo = true)));

CREATE POLICY "Vendedor ve sus clientes"
  ON "vendedor_clientes"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (vendedor_user_id = auth.uid());

CREATE POLICY "Vendedor ve viajes de despachos de sus clientes"
  ON "viajes_despacho"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM despachos d
     JOIN usuarios_empresa ue ON ue.user_id = auth.uid() AND ue.activo = true AND ue.rol_interno = 'vendedor'::text AND ue.empresa_id = d.empresa_id
     JOIN vendedor_clientes vc ON vc.vendedor_user_id = ue.user_id AND vc.empresa_id = ue.empresa_id AND vc.activo = true AND vc.cliente_empresa_id = COALESCE(d.destino_empresa_id, ( SELECT u.empresa_id
           FROM ubicaciones u
          WHERE u.id = d.destino_id))
  WHERE d.id = viajes_despacho.despacho_id)));

CREATE POLICY "viajes_lectura"
  ON "viajes_despacho"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (deleted_at IS NULL AND ((despacho_id IN ( SELECT despachos.id
   FROM despachos
  WHERE despachos.created_by = auth.uid() AND despachos.deleted_at IS NULL)) OR (transport_id IN ( SELECT usuarios_empresa.empresa_id
   FROM usuarios_empresa
  WHERE usuarios_empresa.user_id = auth.uid())) OR (chofer_id IN ( SELECT choferes.id
   FROM choferes
  WHERE choferes.usuario_id = auth.uid()))));


-- ── Resultado ────────────────────────────────────────────
-- Migración 071: eliminados: 93, creados: 76
DO $$ BEGIN
  RAISE NOTICE '✅ Migración 071 completada: eliminados: 93, creados: 76';
END $$;