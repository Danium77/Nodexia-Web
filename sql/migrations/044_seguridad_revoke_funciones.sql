-- ============================================================================
-- MIGRATION 044: PROTECCIÓN DE SEGURIDAD - REVOKE de funciones expuestas
-- ============================================================================
-- Fecha: 8 Feb 2026
-- Propósito: Bloquear acceso directo a funciones SECURITY DEFINER
-- Impacto: NINGUNO en la app. Solo bloquea llamadas directas maliciosas.
-- ============================================================================

-- ============================================================================
-- PARTE 1: ELIMINAR funciones de TEST que no deberían existir en producción
-- ============================================================================

DROP FUNCTION IF EXISTS simular_contexto_usuario(TEXT);
DROP FUNCTION IF EXISTS obtener_despachos_usuario(UUID);
DROP FUNCTION IF EXISTS crear_usuario_si_no_existe(TEXT, TEXT);

-- ============================================================================
-- PARTE 2: REVOCAR acceso público a TODAS las funciones SECURITY DEFINER
-- (Esto NO afecta el funcionamiento de la app - las funciones siguen
--  funcionando cuando son llamadas internamente por las políticas RLS)
-- ============================================================================

-- Funciones de control de acceso (las de la migración 043)
DO $$ BEGIN
  REVOKE ALL ON FUNCTION get_visible_chofer_ids(UUID) FROM public, anon;
  GRANT EXECUTE ON FUNCTION get_visible_chofer_ids(UUID) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION get_visible_camion_ids(UUID) FROM public, anon;
  GRANT EXECUTE ON FUNCTION get_visible_camion_ids(UUID) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION get_visible_acoplado_ids(UUID) FROM public, anon;
  GRANT EXECUTE ON FUNCTION get_visible_acoplado_ids(UUID) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Funciones de estados (las más peligrosas)
DO $$ BEGIN
  REVOKE ALL ON FUNCTION actualizar_estado_unidad FROM public, anon;
  GRANT EXECUTE ON FUNCTION actualizar_estado_unidad TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION actualizar_estado_carga FROM public, anon;
  GRANT EXECUTE ON FUNCTION actualizar_estado_carga TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION validar_transicion_estado_unidad FROM public, anon;
  GRANT EXECUTE ON FUNCTION validar_transicion_estado_unidad TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION registrar_ubicacion_gps FROM public, anon;
  GRANT EXECUTE ON FUNCTION registrar_ubicacion_gps TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Funciones de notificaciones
DO $$ BEGIN
  REVOKE ALL ON FUNCTION get_notificaciones_count(UUID) FROM public, anon;
  GRANT EXECUTE ON FUNCTION get_notificaciones_count(UUID) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION marcar_todas_leidas(UUID) FROM public, anon;
  GRANT EXECUTE ON FUNCTION marcar_todas_leidas(UUID) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Funciones de documentos y ubicaciones
DO $$ BEGIN
  REVOKE ALL ON FUNCTION get_documentos_viaje(UUID) FROM public, anon;
  GRANT EXECUTE ON FUNCTION get_documentos_viaje(UUID) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION get_ultima_ubicacion_viaje(UUID) FROM public, anon;
  GRANT EXECUTE ON FUNCTION get_ultima_ubicacion_viaje(UUID) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION buscar_ubicaciones FROM public, anon;
  GRANT EXECUTE ON FUNCTION buscar_ubicaciones TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Funciones de asignación (la más peligrosa)
DO $$ BEGIN
  REVOKE ALL ON FUNCTION asignar_usuario_empresa FROM public, anon;
  GRANT EXECUTE ON FUNCTION asignar_usuario_empresa TO service_role;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Funciones de super admin
DO $$ BEGIN
  REVOKE ALL ON FUNCTION is_super_admin FROM public, anon;
  GRANT EXECUTE ON FUNCTION is_super_admin TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION get_empresas_admin FROM public, anon;
  GRANT EXECUTE ON FUNCTION get_empresas_admin TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION crear_empresa_admin FROM public, anon;
  GRANT EXECUTE ON FUNCTION crear_empresa_admin TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION actualizar_estado_empresa FROM public, anon;
  GRANT EXECUTE ON FUNCTION actualizar_estado_empresa TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION cambiar_plan_empresa FROM public, anon;
  GRANT EXECUTE ON FUNCTION cambiar_plan_empresa TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION get_estadisticas_sistema FROM public, anon;
  GRANT EXECUTE ON FUNCTION get_estadisticas_sistema TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION get_logs_admin FROM public, anon;
  GRANT EXECUTE ON FUNCTION get_logs_admin TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Funciones de red/network
DO $$ BEGIN
  REVOKE ALL ON FUNCTION get_user_permisos FROM public, anon;
  GRANT EXECUTE ON FUNCTION get_user_permisos TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION user_has_permission(TEXT) FROM public, anon;
  GRANT EXECUTE ON FUNCTION user_has_permission(TEXT) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION get_usuarios_mi_empresa FROM public, anon;
  GRANT EXECUTE ON FUNCTION get_usuarios_mi_empresa TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION agregar_usuario_empresa FROM public, anon;
  GRANT EXECUTE ON FUNCTION agregar_usuario_empresa TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION get_user_empresa FROM public, anon;
  GRANT EXECUTE ON FUNCTION get_user_empresa TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION get_available_transportistas FROM public, anon;
  GRANT EXECUTE ON FUNCTION get_available_transportistas TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION get_mis_clientes FROM public, anon;
  GRANT EXECUTE ON FUNCTION get_mis_clientes TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION crear_relacion_empresa FROM public, anon;
  GRANT EXECUTE ON FUNCTION crear_relacion_empresa TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION get_network_stats FROM public, anon;
  GRANT EXECUTE ON FUNCTION get_network_stats TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Funciones de historial y auditoría
DO $$ BEGIN
  REVOKE ALL ON FUNCTION get_viaje_estados_historial FROM public, anon;
  GRANT EXECUTE ON FUNCTION get_viaje_estados_historial TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION get_estados_statistics FROM public, anon;
  GRANT EXECUTE ON FUNCTION get_estados_statistics TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Funciones de dashboard
DO $$ BEGIN
  REVOKE ALL ON FUNCTION get_dashboard_kpis FROM public, anon;
  GRANT EXECUTE ON FUNCTION get_dashboard_kpis TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- ============================================================================
-- PARTE 3: REEMPLAZAR las 3 funciones de la migración 043 con versiones seguras
-- (sin parámetro UUID - usan auth.uid() internamente)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_visible_chofer_ids()
RETURNS TABLE(chofer_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT c.id
  FROM choferes c
  WHERE 
    c.empresa_id IN (
      SELECT empresa_id FROM usuarios_empresa 
      WHERE user_id = current_user_id AND activo = true
    )
    OR c.id IN (
      SELECT DISTINCT vd.chofer_id
      FROM viajes_despacho vd
      JOIN despachos d ON d.id = vd.despacho_id
      WHERE vd.chofer_id IS NOT NULL
        AND (
          d.origen_empresa_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = current_user_id AND activo = true
          )
          OR d.destino_empresa_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = current_user_id AND activo = true
          )
        )
    )
    OR c.id IN (
      SELECT vd.chofer_id
      FROM viajes_despacho vd
      WHERE vd.empresa_id IN (
        SELECT empresa_id FROM usuarios_empresa 
        WHERE user_id = current_user_id AND activo = true
      )
      AND vd.chofer_id IS NOT NULL
    );
END;
$$;

-- Revocar la versión vieja con parámetro (si existe)
DROP FUNCTION IF EXISTS get_visible_chofer_ids(UUID);

-- Proteger la nueva versión
REVOKE ALL ON FUNCTION get_visible_chofer_ids() FROM public, anon;
GRANT EXECUTE ON FUNCTION get_visible_chofer_ids() TO authenticated;


CREATE OR REPLACE FUNCTION get_visible_camion_ids()
RETURNS TABLE(camion_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
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
      WHERE vd.camion_id IS NOT NULL
        AND (
          d.origen_empresa_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = current_user_id AND activo = true
          )
          OR d.destino_empresa_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = current_user_id AND activo = true
          )
        )
    )
    OR c.id IN (
      SELECT vd.camion_id
      FROM viajes_despacho vd
      WHERE vd.empresa_id IN (
        SELECT empresa_id FROM usuarios_empresa 
        WHERE user_id = current_user_id AND activo = true
      )
      AND vd.camion_id IS NOT NULL
    );
END;
$$;

DROP FUNCTION IF EXISTS get_visible_camion_ids(UUID);

REVOKE ALL ON FUNCTION get_visible_camion_ids() FROM public, anon;
GRANT EXECUTE ON FUNCTION get_visible_camion_ids() TO authenticated;


CREATE OR REPLACE FUNCTION get_visible_acoplado_ids()
RETURNS TABLE(acoplado_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
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
      WHERE vd.acoplado_id IS NOT NULL
        AND (
          d.origen_empresa_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = current_user_id AND activo = true
          )
          OR d.destino_empresa_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = current_user_id AND activo = true
          )
        )
    )
    OR a.id IN (
      SELECT vd.acoplado_id
      FROM viajes_despacho vd
      WHERE vd.empresa_id IN (
        SELECT empresa_id FROM usuarios_empresa 
        WHERE user_id = current_user_id AND activo = true
      )
      AND vd.acoplado_id IS NOT NULL
    );
END;
$$;

DROP FUNCTION IF EXISTS get_visible_acoplado_ids(UUID);

REVOKE ALL ON FUNCTION get_visible_acoplado_ids() FROM public, anon;
GRANT EXECUTE ON FUNCTION get_visible_acoplado_ids() TO authenticated;

-- ============================================================================
-- PARTE 4: Actualizar las políticas RLS para usar las funciones SIN parámetro
-- ============================================================================

DROP POLICY IF EXISTS choferes_select_cross_empresa ON choferes;
CREATE POLICY choferes_select_cross_empresa ON choferes
FOR SELECT
USING (id IN (SELECT chofer_id FROM get_visible_chofer_ids()));

DROP POLICY IF EXISTS camiones_select_cross_empresa ON camiones;
CREATE POLICY camiones_select_cross_empresa ON camiones
FOR SELECT
USING (id IN (SELECT camion_id FROM get_visible_camion_ids()));

DROP POLICY IF EXISTS acoplados_select_cross_empresa ON acoplados;
CREATE POLICY acoplados_select_cross_empresa ON acoplados
FOR SELECT
USING (id IN (SELECT acoplado_id FROM get_visible_acoplado_ids()));

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que las funciones nuevas existen (sin parámetro UUID)
SELECT proname, pronargs, prosecdef 
FROM pg_proc 
WHERE proname LIKE 'get_visible_%_ids'
ORDER BY proname;

-- Verificar que las funciones de test fueron eliminadas
SELECT proname FROM pg_proc 
WHERE proname IN ('simular_contexto_usuario', 'obtener_despachos_usuario', 'crear_usuario_si_no_existe');
-- ^ Este query debería devolver 0 filas

-- ============================================================================
-- RESULTADO ESPERADO:
-- - 3 funciones de test eliminadas
-- - 3 funciones get_visible_* ahora sin parámetro UUID (usan auth.uid() interno)
-- - Todas las funciones SECURITY DEFINER protegidas con REVOKE
-- - Las políticas RLS actualizadas para usar las funciones sin parámetro
-- - La app sigue funcionando exactamente igual
-- ============================================================================
