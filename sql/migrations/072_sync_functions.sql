-- ================================================================
-- Migración 072: Functions sync: sincronizar funciones entre DEV y PROD
-- Fecha: 2026-02-28
-- Generado automáticamente por generate-sync-migration.js
-- Elimina funciones obsoletas e instala las de DEV.
-- ================================================================

-- ── Eliminar funciones obsoletas ────────────────────────

DROP FUNCTION IF EXISTS "actualizar_estado_carga"(p_viaje_id uuid, p_nuevo_estado text, p_user_id uuid, p_observaciones text, p_peso_real numeric, p_remito_numero text) CASCADE;
DROP FUNCTION IF EXISTS "actualizar_estado_documentos_vencidos"() CASCADE;
DROP FUNCTION IF EXISTS "actualizar_estado_unidad"(p_viaje_id uuid, p_nuevo_estado text, p_user_id uuid, p_observaciones text) CASCADE;
DROP FUNCTION IF EXISTS "agregar_usuario_empresa"(p_email_usuario text, p_rol_interno text, p_nombre_completo text, p_email_interno text, p_telefono_interno text, p_departamento text, p_fecha_ingreso date) CASCADE;
DROP FUNCTION IF EXISTS "asignar_usuario_empresa"(p_user_id uuid, p_empresa_id uuid, p_rol_nombre text, p_nombre_completo text, p_email_interno text, p_departamento text) CASCADE;
DROP FUNCTION IF EXISTS "auto_asignar_camion"() CASCADE;
DROP FUNCTION IF EXISTS "buscar_ubicaciones"(p_empresa_id uuid, p_tipo_busqueda text, p_termino_busqueda text) CASCADE;
DROP FUNCTION IF EXISTS "calcular_kpis_viaje"(p_viaje_id uuid) CASCADE;
DROP FUNCTION IF EXISTS "configurar_estructura_empresas"() CASCADE;
DROP FUNCTION IF EXISTS "crear_empresa_completa"(p_nombre text, p_cuit text, p_email text, p_telefono text, p_direccion text, p_plan_nombre text, p_tipo_ecosistema text) CASCADE;
DROP FUNCTION IF EXISTS "crear_incidencia_documentacion"(p_viaje_id uuid, p_tipo character varying, p_descripcion text, p_severidad character varying) CASCADE;
DROP FUNCTION IF EXISTS "crear_notificacion_cancelacion"() CASCADE;
DROP FUNCTION IF EXISTS "crear_notificacion_viaje_asignado"() CASCADE;
DROP FUNCTION IF EXISTS "detectar_demoras_viajes"() CASCADE;
DROP FUNCTION IF EXISTS "enviar_notificacion"(p_user_id uuid, p_tipo text, p_titulo text, p_mensaje text, p_viaje_id uuid, p_despacho_id uuid, p_datos_adicionales jsonb) CASCADE;
DROP FUNCTION IF EXISTS "es_transporte_vinculado"(p_transporte_id uuid, p_empresa_solicitante_id uuid) CASCADE;
DROP FUNCTION IF EXISTS "esta_en_ventana_descarga"(p_delivery_scheduled_at timestamp with time zone, p_window_hours integer) CASCADE;
DROP FUNCTION IF EXISTS "estados_carga_permitidos_chofer"() CASCADE;
DROP FUNCTION IF EXISTS "estados_carga_permitidos_control_acceso"() CASCADE;
DROP FUNCTION IF EXISTS "estados_carga_permitidos_coord_planta"() CASCADE;
DROP FUNCTION IF EXISTS "estados_carga_permitidos_coord_transporte"() CASCADE;
DROP FUNCTION IF EXISTS "estados_carga_permitidos_supervisor"() CASCADE;
DROP FUNCTION IF EXISTS "estados_unidad_permitidos_chofer"() CASCADE;
DROP FUNCTION IF EXISTS "estados_unidad_permitidos_control_acceso"() CASCADE;
DROP FUNCTION IF EXISTS "estados_unidad_permitidos_coord_transporte"() CASCADE;
DROP FUNCTION IF EXISTS "estados_unidad_permitidos_supervisor"() CASCADE;
DROP FUNCTION IF EXISTS "expirar_ofertas_vencidas"() CASCADE;
DROP FUNCTION IF EXISTS "get_dashboard_kpis"() CASCADE;
DROP FUNCTION IF EXISTS "get_documentos_viaje"(p_viaje_id uuid) CASCADE;
DROP FUNCTION IF EXISTS "get_metricas_expiracion"(fecha_desde timestamp with time zone, fecha_hasta timestamp with time zone) CASCADE;
DROP FUNCTION IF EXISTS "get_my_role"() CASCADE;
DROP FUNCTION IF EXISTS "get_my_role_from_jwt"() CASCADE;
DROP FUNCTION IF EXISTS "get_notificaciones_count"(p_user_id uuid) CASCADE;
DROP FUNCTION IF EXISTS "get_rol_display_name"(p_rol_interno text, p_tipo_empresa text) CASCADE;
DROP FUNCTION IF EXISTS "get_user_empresas"() CASCADE;
DROP FUNCTION IF EXISTS "get_user_roles"(p_user_id uuid, p_empresa_id uuid) CASCADE;
DROP FUNCTION IF EXISTS "get_users_with_details"() CASCADE;
DROP FUNCTION IF EXISTS "get_viaje_con_detalles"(p_despacho_id uuid, p_empresa_id uuid) CASCADE;
DROP FUNCTION IF EXISTS "handle_new_user_invitation"() CASCADE;
DROP FUNCTION IF EXISTS "incrementar_visualizaciones"() CASCADE;
DROP FUNCTION IF EXISTS "is_admin"() CASCADE;
DROP FUNCTION IF EXISTS "is_super_admin"(user_uuid uuid) CASCADE;
DROP FUNCTION IF EXISTS "limpiar_ubicaciones_antiguas"() CASCADE;
DROP FUNCTION IF EXISTS "marcar_documentos_vencidos"() CASCADE;
DROP FUNCTION IF EXISTS "marcar_notificacion_leida"(p_notificacion_id uuid) CASCADE;
DROP FUNCTION IF EXISTS "marcar_todas_leidas"(p_user_id uuid) CASCADE;
DROP FUNCTION IF EXISTS "marcar_todas_notificaciones_leidas"() CASCADE;
DROP FUNCTION IF EXISTS "notificar_documento_subido"() CASCADE;
DROP FUNCTION IF EXISTS "obtener_proximos_estados_carga"(p_estado_actual text) CASCADE;
DROP FUNCTION IF EXISTS "obtener_proximos_estados_unidad"(p_estado_actual text) CASCADE;
DROP FUNCTION IF EXISTS "obtener_unidades_disponibles"() CASCADE;
DROP FUNCTION IF EXISTS "registrar_cambio_estado_carga"() CASCADE;
DROP FUNCTION IF EXISTS "registrar_cambio_estado_unidad"() CASCADE;
DROP FUNCTION IF EXISTS "registrar_cambio_estado_viaje"() CASCADE;
DROP FUNCTION IF EXISTS "registrar_ubicacion_gps"(p_viaje_id uuid, p_chofer_id uuid, p_latitud numeric, p_longitud numeric, p_velocidad_kmh numeric, p_precision_metros numeric, p_rumbo_grados numeric, p_dispositivo_info jsonb) CASCADE;
DROP FUNCTION IF EXISTS "reprogramar_viaje"(p_viaje_id uuid, p_nueva_fecha_hora timestamp with time zone, p_motivo text) CASCADE;
DROP FUNCTION IF EXISTS "sync_delivery_scheduled_fields"() CASCADE;
DROP FUNCTION IF EXISTS "sync_estados_carga_unidad"() CASCADE;
DROP FUNCTION IF EXISTS "trigger_auditoria_roles"() CASCADE;
DROP FUNCTION IF EXISTS "uid_empresa"() CASCADE;
DROP FUNCTION IF EXISTS "update_solicitudes_registro_updated_at"() CASCADE;
DROP FUNCTION IF EXISTS "update_ubicaciones_updated_at"() CASCADE;
DROP FUNCTION IF EXISTS "user_tiene_permiso"(p_recurso text, p_accion text) CASCADE;
DROP FUNCTION IF EXISTS "user_tiene_rol"(p_user_id uuid, p_empresa_id uuid, p_rol text) CASCADE;
DROP FUNCTION IF EXISTS "validar_rol_empresa"(p_rol text, p_tipo_empresa text) CASCADE;
DROP FUNCTION IF EXISTS "validar_rol_por_tipo_empresa"() CASCADE;
DROP FUNCTION IF EXISTS "validar_transicion_estado_unidad"(p_viaje_id uuid, p_nuevo_estado text, p_user_id uuid) CASCADE;
DROP FUNCTION IF EXISTS "verificar_documentacion_viaje"(p_viaje_id uuid) CASCADE;
DROP FUNCTION IF EXISTS "verificar_estado_documentacion_recurso"(p_recurso_tipo character varying, p_recurso_id uuid) CASCADE;
DROP FUNCTION IF EXISTS "vincular_usuarios_demo"() CASCADE;

-- ── Drop funciones que van a ser recreadas (por si cambió return type) ──
DROP FUNCTION IF EXISTS "actualizar_estados_viajes"() CASCADE;
DROP FUNCTION IF EXISTS "actualizar_updated_at"() CASCADE;
DROP FUNCTION IF EXISTS "actualizar_vigencia_documento"() CASCADE;
DROP FUNCTION IF EXISTS "actualizar_vigencia_documentos_batch"() CASCADE;
DROP FUNCTION IF EXISTS "asignar_recurso_a_empresa"(uuid, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS "buscar_ubicacion_por_nombre"(text) CASCADE;
DROP FUNCTION IF EXISTS "calcular_disponibilidad_unidad"(uuid, timestamptz) CASCADE;
DROP FUNCTION IF EXISTS "crear_estados_viaje_automatico"() CASCADE;
DROP FUNCTION IF EXISTS "es_recurso_asignado_a_mis_viajes"(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS "get_metricas_expiracion"() CASCADE;
DROP FUNCTION IF EXISTS "get_visible_acoplado_ids"() CASCADE;
DROP FUNCTION IF EXISTS "get_visible_camion_ids"() CASCADE;
DROP FUNCTION IF EXISTS "get_visible_chofer_ids"() CASCADE;
DROP FUNCTION IF EXISTS "limpiar_cancelaciones_antiguas"() CASCADE;
DROP FUNCTION IF EXISTS "limpiar_notificaciones_antiguas"() CASCADE;
DROP FUNCTION IF EXISTS "limpiar_tracking_antiguo"() CASCADE;
DROP FUNCTION IF EXISTS "limpiar_viajes_abandonados"() CASCADE;
DROP FUNCTION IF EXISTS "notificar_coordinadores_empresa"(uuid, tipo_notificacion, varchar, text, uuid, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS "obtener_documentacion_historica_viaje"(uuid) CASCADE;
DROP FUNCTION IF EXISTS "proteger_campos_inmutables_documento"() CASCADE;
DROP FUNCTION IF EXISTS "reemplazar_documento"(text, uuid, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS "registrar_cancelacion_despacho"(uuid, text, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS "set_viaje_scheduled_at"() CASCADE;
DROP FUNCTION IF EXISTS "update_incidencias_viaje_updated_at"() CASCADE;
DROP FUNCTION IF EXISTS "update_requisitos_viaje_red_updated_at"() CASCADE;
DROP FUNCTION IF EXISTS "update_vendedor_clientes_updated_at"() CASCADE;
DROP FUNCTION IF EXISTS "verificar_fecha_vigencia"() CASCADE;

-- ── Crear/actualizar funciones de DEV ───────────────────

CREATE OR REPLACE FUNCTION public.actualizar_estados_viajes()
 RETURNS TABLE(viajes_actualizados integer, viajes_fuera_horario integer, viajes_expirados integer, despachos_actualizados integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_total integer := 0;
  v_fuera integer := 0;
  v_exp integer := 0;
  v_desp integer := 0;
  v_ahora timestamptz := NOW();
  v_horas int := 2;
BEGIN
  -- Intentar obtener configuración, si no existe usar 2 horas
  BEGIN
    SELECT (value::text)::int INTO v_horas FROM configuracion_sistema WHERE key = 'ventana_tolerancia_horas';
  EXCEPTION WHEN OTHERS THEN
    v_horas := 2;
  END;

  WITH tarde AS (
    UPDATE viajes_despacho SET estado_unidad = 'fuera_de_horario', updated_at = NOW()
    WHERE scheduled_at IS NOT NULL AND scheduled_at < v_ahora 
      AND scheduled_at + (v_horas || ' hours')::interval > v_ahora
      AND (chofer_id IS NOT NULL OR camion_id IS NOT NULL)
      AND (estado_unidad IS NULL OR estado_unidad NOT IN ('fuera_de_horario', 'demorado', 'expirado', 'en_curso', 'finalizado', 'cancelado'))
      AND estado NOT IN ('cancelado', 'finalizado')
      AND (estado_tracking IS NULL OR estado_tracking != 'en_curso')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_fuera FROM tarde;

  WITH vencido AS (
    UPDATE viajes_despacho SET estado_unidad = 'expirado', updated_at = NOW()
    WHERE scheduled_at IS NOT NULL
      AND ((scheduled_at < v_ahora AND chofer_id IS NULL AND camion_id IS NULL)
           OR (scheduled_at + (v_horas || ' hours')::interval < v_ahora AND (estado_tracking IS NULL OR estado_tracking != 'en_curso')))
      AND (estado_unidad IS NULL OR estado_unidad NOT IN ('demorado', 'expirado', 'en_curso', 'finalizado', 'cancelado'))
      AND estado NOT IN ('cancelado', 'finalizado')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_exp FROM vencido;

  WITH desp AS (
    UPDATE despachos d SET 
      estado = CASE WHEN EXISTS (SELECT 1 FROM viajes_despacho WHERE despacho_id = d.id AND estado_unidad = 'expirado') THEN 'expirado'
                    WHEN EXISTS (SELECT 1 FROM viajes_despacho WHERE despacho_id = d.id AND estado_unidad = 'fuera_de_horario') THEN 'fuera_de_horario'
                    ELSE d.estado END,
      updated_at = NOW()
    WHERE d.id IN (SELECT DISTINCT despacho_id FROM viajes_despacho WHERE estado_unidad IN ('expirado', 'fuera_de_horario'))
      AND d.estado NOT IN ('cancelado', 'finalizado')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_desp FROM desp;

  v_total := v_fuera + v_exp;
  RETURN QUERY SELECT v_total, v_fuera, v_exp, v_desp;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.actualizar_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.actualizar_vigencia_documento()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Solo para documentos activos
  IF NEW.activo = FALSE THEN
    RETURN NEW;
  END IF;
  
  -- Si tiene fecha de vencimiento, actualizar estado según fechas
  IF NEW.fecha_vencimiento IS NOT NULL THEN
    IF NEW.fecha_vencimiento < CURRENT_DATE THEN
      NEW.estado_vigencia := 'vencido';
    ELSIF NEW.fecha_vencimiento <= CURRENT_DATE + INTERVAL '20 days' THEN
      -- Solo marcar como por_vencer si está validado
      IF NEW.estado_vigencia = 'vigente' THEN
        NEW.estado_vigencia := 'por_vencer';
      END IF;
    END IF;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.actualizar_vigencia_documentos_batch()
 RETURNS TABLE(vencidos integer, por_vencer integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_vencidos INTEGER;
  v_por_vencer INTEGER;
BEGIN
  -- Marcar como vencidos los documentos pasados de fecha
  UPDATE documentos_entidad
  SET estado_vigencia = 'vencido', 
      updated_at = NOW()
  WHERE fecha_vencimiento < CURRENT_DATE
    AND estado_vigencia IN ('vigente', 'por_vencer')
    AND activo = TRUE;
  
  GET DIAGNOSTICS v_vencidos = ROW_COUNT;
  
  -- Marcar como por_vencer los que vencen en 20 días o menos
  UPDATE documentos_entidad
  SET estado_vigencia = 'por_vencer', 
      updated_at = NOW()
  WHERE fecha_vencimiento BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '20 days')
    AND estado_vigencia = 'vigente'
    AND activo = TRUE;
  
  GET DIAGNOSTICS v_por_vencer = ROW_COUNT;
  
  RETURN QUERY SELECT v_vencidos, v_por_vencer;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.asignar_recurso_a_empresa(p_recurso_id uuid, p_tipo_recurso text, p_empresa_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_asignacion_id UUID;
BEGIN
    -- Validar tipo_recurso
    IF p_tipo_recurso NOT IN ('camion', 'chofer', 'acoplado') THEN
        RAISE EXCEPTION 'Tipo de recurso inválido: %', p_tipo_recurso;
    END IF;

    -- Cerrar asignación anterior del mismo recurso (si existe)
    UPDATE public.recurso_asignaciones
    SET fecha_fin = NOW()
    WHERE recurso_id = p_recurso_id
      AND tipo_recurso = p_tipo_recurso
      AND fecha_fin IS NULL;

    -- Crear nueva asignación
    INSERT INTO public.recurso_asignaciones (
        recurso_id,
        tipo_recurso,
        empresa_id,
        fecha_inicio
    ) VALUES (
        p_recurso_id,
        p_tipo_recurso,
        p_empresa_id,
        NOW()
    )
    RETURNING id INTO v_asignacion_id;

    RETURN v_asignacion_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.buscar_ubicacion_por_nombre(p_nombre text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  ubicacion_id UUID;
  nombre_normalizado TEXT;
BEGIN
  -- Normalizar: trim, lowercase, remover caracteres especiales
  nombre_normalizado := LOWER(TRIM(p_nombre));
  nombre_normalizado := REGEXP_REPLACE(nombre_normalizado, '[^a-z0-9 ]', '', 'g');
  
  -- Buscar coincidencia exacta primero
  SELECT id INTO ubicacion_id
  FROM ubicaciones
  WHERE LOWER(TRIM(nombre)) = nombre_normalizado
  LIMIT 1;
  
  IF ubicacion_id IS NOT NULL THEN
    RETURN ubicacion_id;
  END IF;
  
  -- Buscar coincidencia con LIKE (contiene)
  SELECT id INTO ubicacion_id
  FROM ubicaciones
  WHERE LOWER(TRIM(nombre)) LIKE '%' || nombre_normalizado || '%'
     OR nombre_normalizado LIKE '%' || LOWER(TRIM(nombre)) || '%'
  LIMIT 1;
  
  IF ubicacion_id IS NOT NULL THEN
    RETURN ubicacion_id;
  END IF;
  
  -- Buscar con similitud de texto (extensión pg_trgm requerida)
  -- Si no está habilitada, comentar esta parte
  SELECT id INTO ubicacion_id
  FROM ubicaciones
  WHERE similarity(LOWER(TRIM(nombre)), nombre_normalizado) > 0.3
  ORDER BY similarity(LOWER(TRIM(nombre)), nombre_normalizado) DESC
  LIMIT 1;
  
  RETURN ubicacion_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calcular_disponibilidad_unidad(p_unidad_id uuid, p_fecha_requerida timestamp with time zone)
 RETURNS TABLE(disponible boolean, motivo text, ubicacion_actual text, ubicacion_actual_id uuid, hora_disponible timestamp with time zone, horas_descanso_necesarias numeric)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    -- Disponible si: no tiene viaje en conflicto Y no necesita descanso
    CASE 
      WHEN v.viaje_actual IS NOT NULL THEN false
      WHEN v.necesita_descanso_obligatorio AND v.proxima_hora_disponible > p_fecha_requerida THEN false
      ELSE true
    END as disponible,
    
    -- Motivo si no estÃ¡ disponible
    CASE 
      WHEN v.viaje_actual IS NOT NULL THEN 
        'ðŸš› En viaje ' || (v.viaje_actual->>'pedido_id') || ' hasta ' || (v.viaje_actual->>'scheduled_time')
      WHEN v.necesita_descanso_obligatorio AND v.proxima_hora_disponible > p_fecha_requerida THEN
        'ðŸ˜´ En periodo de descanso obligatorio hasta ' || TO_CHAR(v.proxima_hora_disponible, 'DD/MM HH24:MI')
      ELSE 'âœ… Disponible'
    END as motivo,
    
    -- UbicaciÃ³n actual (destino del Ãºltimo viaje o viaje actual)
    COALESCE(
      v.viaje_actual->>'destino',
      v.ultimo_viaje->>'destino',
      'Sin ubicaciÃ³n conocida'
    ) as ubicacion_actual,
    
    -- ID de ubicaciÃ³n actual
    COALESCE(
      (v.viaje_actual->>'destino_id')::UUID,
      (v.ultimo_viaje->>'destino_id')::UUID
    ) as ubicacion_actual_id,
    
    v.proxima_hora_disponible as hora_disponible,
    
    -- Horas de descanso necesarias
    CASE 
      WHEN v.necesita_descanso_obligatorio THEN 12.0
      WHEN v.horas_conducidas_hoy >= 4.5 THEN 0.5  -- 30 minutos cada 4.5h
      ELSE 0
    END as horas_descanso_necesarias
    
  FROM vista_disponibilidad_unidades v
  WHERE v.id = p_unidad_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.crear_estados_viaje_automatico()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Crear registro de estado CARGA
  INSERT INTO estado_carga_viaje (
    viaje_id,
    estado_carga,
    fecha_creacion
  ) VALUES (
    NEW.id,
    'pendiente',
    NOW()
  );
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.es_recurso_asignado_a_mis_viajes(p_recurso_id uuid, p_tipo_recurso text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar si el recurso está en viajes del usuario
  RETURN EXISTS (
    SELECT 1
    FROM viajes_despacho vd
    JOIN despachos d ON d.id = vd.despacho_id
    WHERE d.created_by = auth.uid()
      AND (
        (p_tipo_recurso = 'chofer' AND vd.chofer_id = p_recurso_id)
        OR (p_tipo_recurso = 'camion' AND vd.camion_id = p_recurso_id)
        OR (p_tipo_recurso = 'acoplado' AND vd.acoplado_id = p_recurso_id)
      )
  )
  OR EXISTS (
    SELECT 1
    FROM viajes_despacho vd
    WHERE vd.id_transporte IN (
      SELECT empresa_id 
      FROM usuarios_empresa 
      WHERE user_id = auth.uid() AND activo = true
    )
    AND (
      (p_tipo_recurso = 'chofer' AND vd.chofer_id = p_recurso_id)
      OR (p_tipo_recurso = 'camion' AND vd.camion_id = p_recurso_id)
      OR (p_tipo_recurso = 'acoplado' AND vd.acoplado_id = p_recurso_id)
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_metricas_expiracion()
 RETURNS TABLE(total_expirados bigint, total_fuera_de_horario bigint, expirados_hoy bigint, fuera_horario_hoy bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_fecha_hoy date;
BEGIN
  v_fecha_hoy := (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
  
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE estado_unidad = 'expirado'),
    COUNT(*) FILTER (WHERE estado_unidad = 'fuera_de_horario'),
    COUNT(*) FILTER (WHERE estado_unidad = 'expirado' AND scheduled_at::date = v_fecha_hoy),
    COUNT(*) FILTER (WHERE estado_unidad = 'fuera_de_horario' AND scheduled_at::date = v_fecha_hoy)
  FROM viajes_despacho
  WHERE estado NOT IN ('cancelado', 'finalizado');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_visible_acoplado_ids()
 RETURNS TABLE(acoplado_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_visible_camion_ids()
 RETURNS TABLE(camion_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_visible_chofer_ids()
 RETURNS TABLE(chofer_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.limpiar_cancelaciones_antiguas()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  registros_eliminados INTEGER;
BEGIN
  DELETE FROM cancelaciones_despachos
  WHERE created_at < NOW() - INTERVAL '2 years';
  
  GET DIAGNOSTICS registros_eliminados = ROW_COUNT;
  
  RAISE NOTICE 'Cancelaciones antiguas eliminadas: %', registros_eliminados;
  RETURN registros_eliminados;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.limpiar_notificaciones_antiguas()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  DELETE FROM notificaciones
  WHERE leida = TRUE
    AND created_at < NOW() - INTERVAL '7 days';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.limpiar_tracking_antiguo()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  DELETE FROM tracking_gps
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.limpiar_viajes_abandonados()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Cancelar viajes pendientes sin actividad por más de 72 horas
  UPDATE viajes_despacho
  SET 
    estado = 'cancelado',
    estado_unidad = 'cancelado',
    updated_at = now()
  WHERE estado IN ('pendiente', 'transporte_asignado')
    AND updated_at < now() - interval '72 hours';
    
  -- Log
  RAISE NOTICE 'Limpieza de viajes abandonados ejecutada: %', now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notificar_coordinadores_empresa(p_empresa_id uuid, p_tipo tipo_notificacion, p_titulo character varying, p_mensaje text, p_viaje_id uuid DEFAULT NULL::uuid, p_despacho_id uuid DEFAULT NULL::uuid, p_unidad_operativa_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  notificaciones_creadas INTEGER := 0;
  coordinador_id UUID;
BEGIN
  -- Obtener todos los coordinadores de la empresa
  FOR coordinador_id IN
    SELECT DISTINCT re.user_id
    FROM relaciones_empresas re
    WHERE (re.empresa_cliente_id = p_empresa_id OR re.empresa_transporte_id = p_empresa_id)
      AND re.role_type = 'coordinador'
      AND re.activo = TRUE
  LOOP
    -- Insertar notificación para cada coordinador
    INSERT INTO notificaciones (
      user_id,
      tipo,
      titulo,
      mensaje,
      viaje_id,
      despacho_id,
      unidad_operativa_id
    ) VALUES (
      coordinador_id,
      p_tipo,
      p_titulo,
      p_mensaje,
      p_viaje_id,
      p_despacho_id,
      p_unidad_operativa_id
    );
    
    notificaciones_creadas := notificaciones_creadas + 1;
  END LOOP;
  
  RETURN notificaciones_creadas;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.obtener_documentacion_historica_viaje(p_viaje_id uuid)
 RETURNS TABLE(entidad_tipo text, entidad_id uuid, tipo_documento text, estado_en_momento_viaje text, documento_id uuid, fecha_vencimiento date, validado_por uuid, fecha_validacion timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_fecha_viaje TIMESTAMPTZ;
  v_chofer_id UUID;
  v_camion_id UUID;
  v_acoplado_id UUID;
BEGIN
  -- Obtener datos del viaje
  SELECT created_at, chofer_id, camion_id, acoplado_id
  INTO v_fecha_viaje, v_chofer_id, v_camion_id, v_acoplado_id
  FROM viajes_despacho
  WHERE id = p_viaje_id;
  
  IF v_fecha_viaje IS NULL THEN
    RAISE EXCEPTION 'Viaje no encontrado';
  END IF;
  
  -- Buscar documentos que estaban ACTIVOS en el momento del viaje
  RETURN QUERY
  SELECT 
    de.entidad_tipo,
    de.entidad_id,
    de.tipo_documento,
    CASE 
      WHEN de.fecha_vencimiento < v_fecha_viaje::DATE THEN 'vencido'
      WHEN de.fecha_vencimiento IS NULL OR de.fecha_vencimiento >= v_fecha_viaje::DATE THEN 'vigente'
    END AS estado_en_momento_viaje,
    de.id AS documento_id,
    de.fecha_vencimiento,
    de.validado_por,
    de.fecha_validacion
  FROM documentos_entidad de
  WHERE (
    (de.entidad_tipo = 'chofer' AND de.entidad_id = v_chofer_id) OR
    (de.entidad_tipo = 'camion' AND de.entidad_id = v_camion_id) OR
    (de.entidad_tipo = 'acoplado' AND de.entidad_id = v_acoplado_id AND v_acoplado_id IS NOT NULL)
  )
  AND de.created_at <= v_fecha_viaje  -- Documento existía en ese momento
  AND (
    de.activo = TRUE OR  -- Documento aún activo
    de.updated_at >= v_fecha_viaje  -- O fue reemplazado después del viaje
  )
  ORDER BY de.entidad_tipo, de.tipo_documento;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.proteger_campos_inmutables_documento()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.empresa_id IS DISTINCT FROM NEW.empresa_id THEN
    RAISE EXCEPTION 'No se puede cambiar empresa_id de un documento existente';
  END IF;
  IF OLD.entidad_tipo IS DISTINCT FROM NEW.entidad_tipo THEN
    RAISE EXCEPTION 'No se puede cambiar entidad_tipo de un documento existente';
  END IF;
  IF OLD.entidad_id IS DISTINCT FROM NEW.entidad_id THEN
    RAISE EXCEPTION 'No se puede cambiar entidad_id de un documento existente';
  END IF;
  IF OLD.tipo_documento IS DISTINCT FROM NEW.tipo_documento THEN
    RAISE EXCEPTION 'No se puede cambiar tipo_documento de un documento existente';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reemplazar_documento(p_entidad_tipo text, p_entidad_id uuid, p_tipo_documento text, p_nuevo_documento_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Marcar documento anterior como inactivo (archivado para auditoría)
  UPDATE documentos_entidad
  SET activo = FALSE,
      updated_at = NOW()
  WHERE entidad_tipo = p_entidad_tipo
    AND entidad_id = p_entidad_id
    AND tipo_documento = p_tipo_documento
    AND activo = TRUE
    AND id != p_nuevo_documento_id;
  
  -- El nuevo documento ya debe estar insertado con activo = TRUE
  -- El trigger de auditoría registrará automáticamente el reemplazo
  
  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.registrar_auditoria_documento()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_accion TEXT;
  v_estado_anterior TEXT;
  v_estado_nuevo TEXT;
  v_metadata JSONB := '{}'::JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_accion := 'creacion';
    v_estado_nuevo := NEW.estado_vigencia;
    v_metadata := jsonb_build_object(
      'nombre_archivo', NEW.nombre_archivo,
      'tipo_documento', NEW.tipo_documento,
      'entidad_tipo', NEW.entidad_tipo,
      'entidad_id', NEW.entidad_id
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_estado_anterior := OLD.estado_vigencia;
    v_estado_nuevo := NEW.estado_vigencia;
    
    -- Determinar tipo de acción
    IF OLD.estado_vigencia = 'pendiente_validacion' AND NEW.estado_vigencia = 'vigente' THEN
      IF NEW.validacion_excepcional THEN
        v_accion := 'validacion_excepcional';
        v_metadata := jsonb_build_object(
          'validado_por', NEW.validado_excepcionalmente_por,
          'incidencia_id', NEW.incidencia_id
        );
      ELSE
        v_accion := 'validacion';
        v_metadata := jsonb_build_object('validado_por', NEW.validado_por);
      END IF;
      
    ELSIF OLD.estado_vigencia = 'pendiente_validacion' AND NEW.estado_vigencia = 'rechazado' THEN
      v_accion := 'rechazo';
      v_metadata := jsonb_build_object(
        'motivo', NEW.motivo_rechazo,
        'validado_por', NEW.validado_por
      );
      
    ELSIF OLD.requiere_reconfirmacion_backoffice = TRUE AND NEW.requiere_reconfirmacion_backoffice = FALSE THEN
      v_accion := 'reconfirmacion';
      v_metadata := jsonb_build_object('reconfirmado_por', NEW.reconfirmado_por);
      
    ELSIF OLD.activo = TRUE AND NEW.activo = FALSE THEN
      v_accion := 'reemplazo';
      v_metadata := jsonb_build_object('motivo', 'Documento reemplazado por versión más reciente');
      
    ELSIF OLD.estado_vigencia != NEW.estado_vigencia THEN
      IF NEW.estado_vigencia = 'vencido' THEN
        v_accion := 'vencimiento_automatico';
      ELSE
        v_accion := 'cambio_estado';
      END IF;
    ELSE
      -- Otras actualizaciones, no registrar en auditoría
      RETURN NEW;
    END IF;
  END IF;
  
  -- Insertar registro de auditoría
  INSERT INTO auditoria_documentos (
    documento_id,
    accion,
    usuario_id,
    estado_anterior,
    estado_nuevo,
    metadata,
    created_at
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    v_accion,
    auth.uid(),
    v_estado_anterior,
    v_estado_nuevo,
    v_metadata,
    NOW()
  );
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reprogramar_viaje(p_viaje_id uuid, p_nueva_fecha date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_resultado JSONB;
BEGIN
  UPDATE public.viajes_despacho
  SET 
    fecha_creacion = p_nueva_fecha::timestamptz,
    estado = 'pendiente',
    id_transporte = NULL,
    id_camion = NULL,
    id_acoplado = NULL,
    id_chofer = NULL,
    fecha_asignacion_transporte = NULL,
    fecha_asignacion_camion = NULL,
    fecha_confirmacion_chofer = NULL
  WHERE id = p_viaje_id;
  
  v_resultado := jsonb_build_object(
    'success', true,
    'message', 'Viaje reprogramado exitosamente'
  );
  
  RETURN v_resultado;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.restore_despacho(despacho_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Verificar que el despacho pertenece al usuario actual
    IF NOT EXISTS (
        SELECT 1 FROM public.despachos 
        WHERE id = despacho_uuid 
            AND created_by = auth.uid()
            AND deleted_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Despacho no encontrado o sin permisos';
    END IF;
    
    -- Restaurar despacho
    UPDATE public.despachos
    SET deleted_at = NULL,
        updated_at = NOW()
    WHERE id = despacho_uuid;
    
    RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_viaje_scheduled_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_despacho_scheduled timestamp with time zone;
BEGIN
  -- Si el viaje ya tiene scheduled_at, no hacer nada
  IF NEW.scheduled_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener fecha/hora del despacho padre
  SELECT 
    CASE 
      -- Si el despacho tiene scheduled_date_time, usarlo
      WHEN d.scheduled_date_time IS NOT NULL THEN d.scheduled_date_time
      -- Si tiene local_date y local_time, combinarlos
      WHEN d.scheduled_local_date IS NOT NULL AND d.scheduled_local_time IS NOT NULL THEN
        (d.scheduled_local_date || ' ' || d.scheduled_local_time)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'
      -- Si tiene fecha_programada, usarla
      WHEN d.fecha_programada IS NOT NULL THEN d.fecha_programada
      ELSE NULL
    END
  INTO v_despacho_scheduled
  FROM despachos d
  WHERE d.id = NEW.despacho_id;

  -- Asignar al viaje
  NEW.scheduled_at := v_despacho_scheduled;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.soft_delete_despacho(despacho_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    viajes_count INTEGER;
BEGIN
    -- Verificar que el despacho pertenece al usuario actual
    IF NOT EXISTS (
        SELECT 1 FROM public.despachos 
        WHERE id = despacho_uuid 
            AND created_by = auth.uid()
            AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Despacho no encontrado o sin permisos';
    END IF;
    
    -- Contar viajes activos asociados
    SELECT COUNT(*) INTO viajes_count
    FROM public.viajes_despacho
    WHERE despacho_id = despacho_uuid
        AND deleted_at IS NULL;
    
    IF viajes_count > 0 THEN
        RAISE EXCEPTION 'No se puede eliminar despacho con % viajes activos', viajes_count;
    END IF;
    
    -- Realizar soft delete
    UPDATE public.despachos
    SET deleted_at = NOW(),
        updated_at = NOW()
    WHERE id = despacho_uuid;
    
    RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.soft_delete_viaje(viaje_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Verificar que el usuario tiene permiso
    -- (es coordinador del despacho O pertenece a empresa transportista)
    IF NOT EXISTS (
        SELECT 1 FROM public.viajes_despacho vd
        INNER JOIN public.despachos d ON vd.despacho_id = d.id
        WHERE vd.id = viaje_uuid
            AND vd.deleted_at IS NULL
            AND (
                d.created_by = auth.uid()
                OR
                vd.transport_id IN (
                    SELECT empresa_id 
                    FROM public.usuarios_empresa 
                    WHERE user_id = auth.uid()
                )
            )
    ) THEN
        RAISE EXCEPTION 'Viaje no encontrado o sin permisos';
    END IF;
    
    -- Realizar soft delete
    UPDATE public.viajes_despacho
    SET deleted_at = NOW(),
        updated_at = NOW()
    WHERE id = viaje_uuid;
    
    RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_notificar_arribo_destino()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  despacho_data RECORD;
  empresa_cliente_id UUID;
BEGIN
  -- Solo actuar en cambio de estado a arribo_destino
  IF NEW.estado = 'arribo_destino' AND (OLD.estado IS NULL OR OLD.estado != 'arribo_destino') THEN
    -- Obtener datos del despacho
    SELECT d.*, d.empresa_id
    INTO despacho_data
    FROM despachos d
    WHERE d.id = NEW.despacho_id;
    
    IF despacho_data IS NOT NULL THEN
      -- Notificar a coordinadores de la empresa cliente
      PERFORM notificar_coordinadores_empresa(
        despacho_data.empresa_id,
        'arribo_destino'::tipo_notificacion,
        'Arribo a Destino',
        'El viaje ' || NEW.id || ' del pedido ' || despacho_data.pedido_id || ' ha arribado al destino: ' || despacho_data.destino,
        NEW.id,
        NEW.despacho_id,
        NULL
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_registrar_cambio_estado()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Solo registrar si el estado cambió
    IF (TG_OP = 'INSERT') OR (OLD.estado IS DISTINCT FROM NEW.estado) THEN
        INSERT INTO auditoria_estados (
            viaje_id,
            estado_anterior,
            estado_nuevo,
            user_id,
            metadata
        ) VALUES (
            NEW.id,
            CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.estado END,
            NEW.estado,
            auth.uid(),
            jsonb_build_object(
                'operacion', TG_OP,
                'tabla', TG_TABLE_NAME,
                'timestamp', NOW()
            )
        );
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_incidencias_viaje_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_requisitos_viaje_red_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_vendedor_clientes_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validar_coordenadas_argentina()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.latitud < -55 OR NEW.latitud > -21 THEN
    RAISE EXCEPTION 'Latitud fuera del rango de Argentina: %', NEW.latitud;
  END IF;
  
  IF NEW.longitud < -73 OR NEW.longitud > -53 THEN
    RAISE EXCEPTION 'Longitud fuera del rango de Argentina: %', NEW.longitud;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validar_entidad_existe()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Validar que la entidad existe y pertenece a la empresa indicada
  IF NEW.entidad_tipo = 'chofer' THEN
    IF NOT EXISTS (
      SELECT 1 FROM choferes 
      WHERE id = NEW.entidad_id 
        AND empresa_id = NEW.empresa_id
    ) THEN
      RAISE EXCEPTION 'Chofer % no existe o no pertenece a la empresa %', NEW.entidad_id, NEW.empresa_id;
    END IF;
    
  ELSIF NEW.entidad_tipo = 'camion' THEN
    IF NOT EXISTS (
      SELECT 1 FROM camiones 
      WHERE id = NEW.entidad_id 
        AND empresa_id = NEW.empresa_id
    ) THEN
      RAISE EXCEPTION 'Camión % no existe o no pertenece a la empresa %', NEW.entidad_id, NEW.empresa_id;
    END IF;
    
  ELSIF NEW.entidad_tipo = 'acoplado' THEN
    IF NOT EXISTS (
      SELECT 1 FROM acoplados 
      WHERE id = NEW.entidad_id 
        AND empresa_id = NEW.empresa_id
    ) THEN
      RAISE EXCEPTION 'Acoplado % no existe o no pertenece a la empresa %', NEW.entidad_id, NEW.empresa_id;
    END IF;
    
  ELSIF NEW.entidad_tipo = 'transporte' THEN
    IF NOT EXISTS (
      SELECT 1 FROM empresas 
      WHERE id = NEW.entidad_id 
        AND tipo_empresa = 'transporte'
        AND activa = TRUE
    ) THEN
      RAISE EXCEPTION 'Empresa de transporte % no existe o está inactiva', NEW.entidad_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validar_transicion_estado_unidad(p_viaje_id uuid, p_nuevo_estado text, p_observaciones text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_estado_actual TEXT;
  v_resultado JSONB;
BEGIN
  -- Obtener user_id del JWT
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('exitoso', false, 'mensaje', 'No autenticado');
  END IF;

  -- Obtener estado actual
  SELECT estado_unidad INTO v_estado_actual
  FROM viajes_despacho
  WHERE id = p_viaje_id;
  
  IF v_estado_actual IS NULL THEN
    RETURN jsonb_build_object('exitoso', false, 'mensaje', 'Viaje no encontrado');
  END IF;

  -- Actualizar el estado directamente (la validación de transiciones se hace en el frontend)
  UPDATE viajes_despacho
  SET 
    estado_unidad = p_nuevo_estado,
    updated_at = NOW()
  WHERE id = p_viaje_id;

  RETURN jsonb_build_object(
    'exitoso', true, 
    'mensaje', format('Estado actualizado: %s → %s', v_estado_actual, p_nuevo_estado),
    'estado_anterior', v_estado_actual,
    'estado_nuevo', p_nuevo_estado
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.verificar_documentacion_entidad(p_entidad_tipo text, p_entidad_id uuid)
 RETURNS TABLE(tiene_documentos boolean, documentos_vigentes integer, documentos_por_vencer integer, documentos_vencidos integer, documentos_pendientes integer, documentos_faltantes text[], detalle jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_empresa_id UUID;
  v_puede_acceder BOOLEAN := FALSE;
BEGIN
  -- Obtener empresa_id de la entidad
  IF p_entidad_tipo = 'transporte' THEN
    -- Para transporte, la empresa ES la entidad
    v_empresa_id := p_entidad_id;
    IF NOT EXISTS (SELECT 1 FROM empresas WHERE id = v_empresa_id AND tipo_empresa = 'transporte') THEN
      RAISE EXCEPTION 'Entidad no encontrada';
    END IF;
  ELSE
    EXECUTE format(
      'SELECT empresa_id FROM %I WHERE id = $1',
      CASE p_entidad_tipo
        WHEN 'chofer' THEN 'choferes'
        WHEN 'camion' THEN 'camiones'
        WHEN 'acoplado' THEN 'acoplados'
      END
    ) INTO v_empresa_id USING p_entidad_id;
    
    IF v_empresa_id IS NULL THEN
      RAISE EXCEPTION 'Entidad no encontrada';
    END IF;
  END IF;
  
  -- Verificar permisos: Usuario debe pertenecer a la empresa O ser superadmin
  SELECT EXISTS (
    SELECT 1 FROM super_admins
    WHERE user_id = auth.uid() AND activo = TRUE
  ) OR EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid() 
      AND ue.empresa_id = v_empresa_id
      AND ue.activo = TRUE
  ) INTO v_puede_acceder;
  
  IF NOT v_puede_acceder THEN
    RAISE EXCEPTION 'Sin permisos para acceder a la documentación de esta entidad';
  END IF;
  
  -- Retornar estadísticas de documentación
  RETURN QUERY
  WITH docs AS (
    SELECT 
      de.tipo_documento,
      de.estado_vigencia,
      de.fecha_vencimiento,
      de.validacion_excepcional,
      de.requiere_reconfirmacion_backoffice
    FROM documentos_entidad de
    WHERE de.entidad_tipo = p_entidad_tipo
      AND de.entidad_id = p_entidad_id
      AND de.activo = TRUE
  ),
  docs_requeridos AS (
    SELECT UNNEST(CASE p_entidad_tipo
      WHEN 'chofer' THEN ARRAY['licencia_conducir', 'art_clausula_no_repeticion']
      WHEN 'camion' THEN ARRAY['seguro', 'rto', 'cedula']
      WHEN 'acoplado' THEN ARRAY['seguro', 'rto', 'cedula']
      ELSE ARRAY[]::TEXT[]
    END) AS tipo
  )
  SELECT 
    EXISTS(SELECT 1 FROM docs),
    (SELECT COUNT(*)::INTEGER FROM docs WHERE estado_vigencia = 'vigente'),
    (SELECT COUNT(*)::INTEGER FROM docs WHERE estado_vigencia = 'por_vencer'),
    (SELECT COUNT(*)::INTEGER FROM docs WHERE estado_vigencia = 'vencido'),
    (SELECT COUNT(*)::INTEGER FROM docs WHERE estado_vigencia = 'pendiente_validacion'),
    ARRAY(
      SELECT dr.tipo 
      FROM docs_requeridos dr
      WHERE NOT EXISTS (SELECT 1 FROM docs d WHERE d.tipo_documento = dr.tipo)
    ),
    jsonb_agg(
      jsonb_build_object(
        'tipo_documento', docs.tipo_documento,
        'estado_vigencia', docs.estado_vigencia,
        'fecha_vencimiento', docs.fecha_vencimiento,
        'validacion_excepcional', docs.validacion_excepcional,
        'requiere_reconfirmacion', docs.requiere_reconfirmacion_backoffice
      )
    )
  FROM docs;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.verificar_documentacion_unidad_operativa(p_chofer_id uuid, p_camion_id uuid, p_acoplado_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(puede_recibir_viajes boolean, puede_ingresar_planta boolean, motivo_bloqueo text, alertas text[], detalle jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_chofer_tiene_docs BOOLEAN;
  v_camion_tiene_docs BOOLEAN;
  v_acoplado_tiene_docs BOOLEAN := TRUE;
  v_docs_vencidos INTEGER := 0;
  v_docs_pendientes INTEGER := 0;
  v_puede_recibir BOOLEAN := TRUE;
  v_puede_ingresar BOOLEAN := TRUE;
  v_motivo TEXT := NULL;
  v_alertas TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Verificar que chofer tiene al menos 1 documento cargado
  SELECT tiene_documentos, documentos_vencidos, documentos_pendientes
  INTO v_chofer_tiene_docs, v_docs_vencidos, v_docs_pendientes
  FROM verificar_documentacion_entidad('chofer', p_chofer_id);
  
  IF NOT v_chofer_tiene_docs THEN
    v_puede_recibir := FALSE;
    v_puede_ingresar := FALSE;
    v_motivo := 'Chofer sin documentación cargada';
  END IF;
  
  -- Verificar camión
  SELECT tiene_documentos INTO v_camion_tiene_docs
  FROM verificar_documentacion_entidad('camion', p_camion_id);
  
  IF NOT v_camion_tiene_docs THEN
    v_puede_recibir := FALSE;
    v_puede_ingresar := FALSE;
    v_motivo := COALESCE(v_motivo || ' | ', '') || 'Camión sin documentación cargada';
  END IF;
  
  -- Verificar acoplado si existe
  IF p_acoplado_id IS NOT NULL THEN
    SELECT tiene_documentos INTO v_acoplado_tiene_docs
    FROM verificar_documentacion_entidad('acoplado', p_acoplado_id);
    
    IF NOT v_acoplado_tiene_docs THEN
      v_puede_recibir := FALSE;
      v_puede_ingresar := FALSE;
      v_motivo := COALESCE(v_motivo || ' | ', '') || 'Acoplado sin documentación cargada';
    END IF;
  END IF;
  
  -- Si tiene docs pero hay vencidos → NO bloquea asignación pero SÍ bloquea ingreso
  IF v_docs_vencidos > 0 THEN
    v_puede_ingresar := FALSE;
    v_motivo := COALESCE(v_motivo || ' | ', '') || format('Documentos vencidos: %s', v_docs_vencidos);
    v_alertas := array_append(v_alertas, format('⚠️ %s documento(s) vencido(s)', v_docs_vencidos));
  END IF;
  
  -- Si hay docs pendientes de validación → alerta pero no bloquea
  IF v_docs_pendientes > 0 THEN
    v_alertas := array_append(v_alertas, format('⏳ %s documento(s) pendiente(s) de validación', v_docs_pendientes));
  END IF;
  
  -- Retornar resultado
  RETURN QUERY
  SELECT 
    v_puede_recibir,
    v_puede_ingresar,
    v_motivo,
    v_alertas,
    jsonb_build_object(
      'chofer', (SELECT detalle FROM verificar_documentacion_entidad('chofer', p_chofer_id)),
      'camion', (SELECT detalle FROM verificar_documentacion_entidad('camion', p_camion_id)),
      'acoplado', (
        CASE WHEN p_acoplado_id IS NOT NULL 
        THEN (SELECT detalle FROM verificar_documentacion_entidad('acoplado', p_acoplado_id))
        ELSE NULL END
      )
    );
END;
$function$
;

-- ── Eliminar triggers obsoletos ─────────────────────────

DROP TRIGGER IF EXISTS "trigger_sync_delivery_scheduled" ON "despachos";
DROP TRIGGER IF EXISTS "trigger_sync_delivery_scheduled" ON "despachos";
DROP TRIGGER IF EXISTS "trigger_actualizar_estado_docs" ON "documentos_recursos";
DROP TRIGGER IF EXISTS "trigger_empresa_ubicaciones_updated_at" ON "empresa_ubicaciones";
DROP TRIGGER IF EXISTS "trigger_actualizar_estado_carga_updated_at" ON "estado_carga_viaje";
DROP TRIGGER IF EXISTS "trigger_registrar_cambio_estado_carga" ON "estado_carga_viaje";
DROP TRIGGER IF EXISTS "trigger_actualizar_estado_unidad_updated_at" ON "estado_unidad_viaje";
DROP TRIGGER IF EXISTS "trigger_registrar_cambio_estado_unidad" ON "estado_unidad_viaje";
DROP TRIGGER IF EXISTS "trigger_auditoria_roles" ON "roles_empresa";
DROP TRIGGER IF EXISTS "trigger_auditoria_roles" ON "roles_empresa";
DROP TRIGGER IF EXISTS "trigger_auditoria_roles" ON "roles_empresa";
DROP TRIGGER IF EXISTS "trigger_validar_coordenadas" ON "tracking_gps";
DROP TRIGGER IF EXISTS "trigger_validar_coordenadas" ON "tracking_gps";
DROP TRIGGER IF EXISTS "trigger_ubicaciones_updated_at" ON "ubicaciones";
DROP TRIGGER IF EXISTS "trigger_auditoria_viajes" ON "viajes_despacho";
DROP TRIGGER IF EXISTS "trigger_auditoria_viajes" ON "viajes_despacho";
DROP TRIGGER IF EXISTS "trigger_auto_asignar_camion" ON "viajes_despacho";
DROP TRIGGER IF EXISTS "trigger_notificacion_cancelacion" ON "viajes_despacho";
DROP TRIGGER IF EXISTS "trigger_notificacion_viaje_asignado" ON "viajes_despacho";
DROP TRIGGER IF EXISTS "trigger_notificacion_viaje_asignado" ON "viajes_despacho";
DROP TRIGGER IF EXISTS "trigger_sync_estados" ON "viajes_despacho";

-- ── Crear triggers (drop primero para idempotencia) ─────

DROP TRIGGER IF EXISTS "trigger_proteger_campos_inmutables" ON "documentos_entidad";
CREATE TRIGGER "trigger_proteger_campos_inmutables"
  BEFORE UPDATE
  ON "documentos_entidad"
  FOR EACH ROW
  EXECUTE FUNCTION proteger_campos_inmutables_documento();

DROP TRIGGER IF EXISTS "trigger_update_incidencias_viaje_updated_at" ON "incidencias_viaje";
CREATE TRIGGER "trigger_update_incidencias_viaje_updated_at"
  BEFORE UPDATE
  ON "incidencias_viaje"
  FOR EACH ROW
  EXECUTE FUNCTION update_incidencias_viaje_updated_at();

DROP TRIGGER IF EXISTS "trigger_ofertas_updated_at" ON "ofertas_red_nodexia";
CREATE TRIGGER "trigger_ofertas_updated_at"
  BEFORE UPDATE
  ON "ofertas_red_nodexia"
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS "update_recurso_asignaciones_updated_at" ON "recurso_asignaciones";
CREATE TRIGGER "update_recurso_asignaciones_updated_at"
  BEFORE UPDATE
  ON "recurso_asignaciones"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS "trigger_update_requisitos_updated_at" ON "requisitos_viaje_red";
CREATE TRIGGER "trigger_update_requisitos_updated_at"
  BEFORE UPDATE
  ON "requisitos_viaje_red"
  FOR EACH ROW
  EXECUTE FUNCTION update_requisitos_viaje_red_updated_at();

DROP TRIGGER IF EXISTS "trg_vendedor_clientes_updated_at" ON "vendedor_clientes";
CREATE TRIGGER "trg_vendedor_clientes_updated_at"
  BEFORE UPDATE
  ON "vendedor_clientes"
  FOR EACH ROW
  EXECUTE FUNCTION update_vendedor_clientes_updated_at();

DROP TRIGGER IF EXISTS "trigger_set_viaje_scheduled_at" ON "viajes_despacho";
CREATE TRIGGER "trigger_set_viaje_scheduled_at"
  BEFORE INSERT OR UPDATE
  ON "viajes_despacho"
  FOR EACH ROW
  EXECUTE FUNCTION set_viaje_scheduled_at();


-- ── Resultado ────────────────────────────────────────────
-- Migración 072: eliminados: 70, creados: 37
DO $$ BEGIN
  RAISE NOTICE '✅ Migración 072 completada: eliminados: 70, creados: 37';
END $$;