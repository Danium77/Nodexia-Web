-- ============================================================================
-- SYNC PRODUCCIÓN - PARTE 4: Funciones, Triggers y Vistas
-- ============================================================================
-- Ejecutar en: https://supabase.com/dashboard/project/lkdcofsfjnltuzzzwoir/sql/new
-- DESPUÉS de Parte 3 (indexes)
-- NOTA: Cada sección es idempotente (CREATE OR REPLACE / DROP IF EXISTS)
-- ============================================================================

-- ============================================================================
-- SECCIÓN A: FUNCIONES DE EXPIRACIÓN Y REPROGRAMACIÓN (013, 016, 058)
-- ============================================================================

-- Nota: 058 reemplaza marcar_viajes_expirados() por limpiar_viajes_abandonados()
-- Por seguridad, primero creamos la versión 016, luego 058 hace el drop+reemplazo

-- Función de limpieza (058 - reemplaza la función de expiración)
DROP FUNCTION IF EXISTS marcar_viajes_expirados();
DROP FUNCTION IF EXISTS ejecutar_expiracion_viajes();

CREATE OR REPLACE FUNCTION limpiar_viajes_abandonados()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE viajes_despacho
  SET estado = 'cancelado', estado_unidad = 'cancelado', updated_at = now()
  WHERE estado IN ('pendiente', 'transporte_asignado')
    AND updated_at < now() - interval '72 hours';
  RAISE NOTICE 'Limpieza de viajes abandonados ejecutada: %', now();
END;
$$;

-- get_metricas_expiracion (013)
CREATE OR REPLACE FUNCTION get_metricas_expiracion(
    fecha_desde timestamptz DEFAULT NOW() - INTERVAL '30 days',
    fecha_hasta timestamptz DEFAULT NOW()
)
RETURNS TABLE (
    total_expirados bigint,
    por_falta_chofer bigint,
    por_falta_camion bigint,
    por_falta_ambos bigint,
    urgentes_expirados bigint,
    promedio_horas_retraso numeric,
    tasa_expiracion_pct numeric
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) AS total_expirados,
        COUNT(*) FILTER (WHERE v.chofer_id IS NULL AND v.camion_id IS NOT NULL) AS por_falta_chofer,
        COUNT(*) FILTER (WHERE v.camion_id IS NULL AND v.chofer_id IS NOT NULL) AS por_falta_camion,
        COUNT(*) FILTER (WHERE v.chofer_id IS NULL AND v.camion_id IS NULL) AS por_falta_ambos,
        0::bigint AS urgentes_expirados,
        0::numeric AS promedio_horas_retraso,
        ROUND(
            (COUNT(*)::numeric / NULLIF(
                (SELECT COUNT(*) FROM viajes_despacho 
                 WHERE fecha_creacion BETWEEN fecha_desde AND fecha_hasta), 
                0
            )) * 100, 
            2
        ) AS tasa_expiracion_pct
    FROM viajes_despacho v
    WHERE v.estado = 'cancelado' AND v.fue_expirado = true
      AND v.updated_at BETWEEN fecha_desde AND fecha_hasta;
END;
$$;

-- reprogramar_viaje (016)
CREATE OR REPLACE FUNCTION reprogramar_viaje(
  p_viaje_id UUID,
  p_nueva_fecha_hora TIMESTAMPTZ,
  p_motivo TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  mensaje TEXT,
  viaje_id UUID
) AS $$
DECLARE
  v_estado_actual TEXT;
  v_fue_expirado BOOLEAN;
BEGIN
  SELECT estado, fue_expirado
  INTO v_estado_actual, v_fue_expirado
  FROM viajes_despacho
  WHERE id = p_viaje_id;

  IF v_estado_actual IS NULL THEN
    RETURN QUERY SELECT false, 'Viaje no encontrado'::TEXT, p_viaje_id;
    RETURN;
  END IF;

  IF v_estado_actual NOT IN ('cancelado', 'expirado') THEN
    RETURN QUERY SELECT false, 'El viaje no está en estado cancelado/expirado'::TEXT, p_viaje_id;
    RETURN;
  END IF;

  UPDATE viajes_despacho v
  SET 
    estado = 'pendiente',
    estado_unidad = 'pendiente',
    fue_expirado = true,
    fecha_expiracion_original = COALESCE(fecha_expiracion_original, v.updated_at),
    cantidad_reprogramaciones = cantidad_reprogramaciones + 1,
    motivo_reprogramacion = COALESCE(p_motivo, motivo_reprogramacion),
    updated_at = NOW()
  WHERE id = p_viaje_id;

  UPDATE despachos d
  SET 
    scheduled_at = p_nueva_fecha_hora,
    updated_at = NOW()
  FROM viajes_despacho v
  WHERE v.id = p_viaje_id
    AND d.id = v.despacho_id;

  RETURN QUERY SELECT true, 'Viaje reprogramado exitosamente'::TEXT, p_viaje_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECCIÓN B: FUNCIONES DE DELIVERY/DESCARGA (014)
-- ============================================================================

CREATE OR REPLACE FUNCTION esta_en_ventana_descarga(
  p_delivery_scheduled_at TIMESTAMPTZ,
  p_window_hours INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_delivery_scheduled_at IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN NOW() BETWEEN 
    (p_delivery_scheduled_at - (p_window_hours || ' hours')::INTERVAL) AND
    (p_delivery_scheduled_at + (p_window_hours || ' hours')::INTERVAL);
END;
$$;

CREATE OR REPLACE FUNCTION sync_delivery_scheduled_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.delivery_scheduled_at IS DISTINCT FROM OLD.delivery_scheduled_at THEN
    NEW.delivery_scheduled_date := (NEW.delivery_scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE;
    NEW.delivery_scheduled_time := (NEW.delivery_scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::TIME;
  END IF;
  IF (NEW.delivery_scheduled_date IS DISTINCT FROM OLD.delivery_scheduled_date 
      OR NEW.delivery_scheduled_time IS DISTINCT FROM OLD.delivery_scheduled_time)
     AND NEW.delivery_scheduled_date IS NOT NULL 
     AND NEW.delivery_scheduled_time IS NOT NULL THEN
    NEW.delivery_scheduled_at := (NEW.delivery_scheduled_date || ' ' || NEW.delivery_scheduled_time)::TIMESTAMP 
      AT TIME ZONE 'America/Argentina/Buenos_Aires';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_delivery_scheduled ON despachos;
CREATE TRIGGER trigger_sync_delivery_scheduled
  BEFORE INSERT OR UPDATE ON despachos
  FOR EACH ROW
  EXECUTE FUNCTION sync_delivery_scheduled_fields();

-- ============================================================================
-- SECCIÓN C: UNIDADES OPERATIVAS (017)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_unidades_operativas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_unidades_operativas_updated_at ON unidades_operativas;
CREATE TRIGGER trigger_update_unidades_operativas_updated_at
  BEFORE UPDATE ON unidades_operativas
  FOR EACH ROW
  EXECUTE FUNCTION update_unidades_operativas_updated_at();

CREATE OR REPLACE FUNCTION calcular_disponibilidad_unidad(
  p_unidad_id UUID,
  p_fecha_requerida TIMESTAMPTZ
)
RETURNS TABLE (
  disponible BOOLEAN,
  motivo TEXT,
  ubicacion_actual TEXT,
  ubicacion_actual_id UUID,
  hora_disponible TIMESTAMPTZ,
  horas_descanso_necesarias DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN v.viaje_actual IS NOT NULL THEN false
      WHEN v.necesita_descanso_obligatorio AND v.proxima_hora_disponible > p_fecha_requerida THEN false
      ELSE true
    END as disponible,
    CASE 
      WHEN v.viaje_actual IS NOT NULL THEN 
        'En viaje ' || (v.viaje_actual->>'pedido_id') || ' hasta ' || (v.viaje_actual->>'scheduled_time')
      WHEN v.necesita_descanso_obligatorio AND v.proxima_hora_disponible > p_fecha_requerida THEN
        'En periodo de descanso obligatorio hasta ' || TO_CHAR(v.proxima_hora_disponible, 'DD/MM HH24:MI')
      ELSE 'Disponible'
    END as motivo,
    COALESCE(
      v.viaje_actual->>'destino',
      v.ultimo_viaje->>'destino',
      'Sin ubicación conocida'
    ) as ubicacion_actual,
    COALESCE(
      (v.viaje_actual->>'destino_id')::UUID,
      (v.ultimo_viaje->>'destino_id')::UUID
    ) as ubicacion_actual_id,
    v.proxima_hora_disponible as hora_disponible,
    CASE 
      WHEN v.necesita_descanso_obligatorio THEN 12.0
      WHEN v.horas_conducidas_hoy >= 4.5 THEN 0.5
      ELSE 0
    END as horas_descanso_necesarias
  FROM vista_disponibilidad_unidades v
  WHERE v.id = p_unidad_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- SECCIÓN D: TRACKING GPS (024)
-- ============================================================================

CREATE OR REPLACE FUNCTION limpiar_tracking_antiguo()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM tracking_gps
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$;

CREATE OR REPLACE FUNCTION validar_coordenadas_argentina()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.latitud < -55 OR NEW.latitud > -21 THEN
    RAISE EXCEPTION 'Latitud fuera del rango de Argentina: %', NEW.latitud;
  END IF;
  IF NEW.longitud < -73 OR NEW.longitud > -53 THEN
    RAISE EXCEPTION 'Longitud fuera del rango de Argentina: %', NEW.longitud;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validar_coordenadas ON tracking_gps;
CREATE TRIGGER trigger_validar_coordenadas
BEFORE INSERT OR UPDATE ON tracking_gps
FOR EACH ROW
EXECUTE FUNCTION validar_coordenadas_argentina();

-- ============================================================================
-- SECCIÓN E: NOTIFICACIONES (026)
-- ============================================================================

-- Crear TYPE si no existe (PROD ya tiene tabla notificaciones de mig 011)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_notificacion') THEN
    CREATE TYPE tipo_notificacion AS ENUM (
      'arribo_origen', 'arribo_destino', 'demora_detectada', 'cambio_estado',
      'recepcion_nueva', 'unidad_asignada', 'viaje_iniciado', 'viaje_completado', 'alerta_sistema'
    );
  END IF;
END $$;

-- Agregar columnas faltantes a notificaciones existente (PROD ya tiene la tabla)
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS viaje_id UUID REFERENCES viajes_despacho(id) ON DELETE SET NULL;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS despacho_id UUID REFERENCES despachos(id) ON DELETE SET NULL;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS unidad_operativa_id UUID REFERENCES unidades_operativas(id) ON DELETE SET NULL;

-- Crear índices faltantes
CREATE INDEX IF NOT EXISTS idx_notificaciones_user ON notificaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha ON notificaciones(created_at DESC);

-- Función para notificar coordinadores (026)
CREATE OR REPLACE FUNCTION notificar_coordinadores_empresa(
  p_empresa_id UUID,
  p_tipo tipo_notificacion,
  p_titulo VARCHAR,
  p_mensaje TEXT,
  p_viaje_id UUID DEFAULT NULL,
  p_despacho_id UUID DEFAULT NULL,
  p_unidad_operativa_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  notificaciones_creadas INTEGER := 0;
  coordinador_id UUID;
BEGIN
  FOR coordinador_id IN
    SELECT DISTINCT re.user_id
    FROM relaciones_empresas re
    WHERE (re.empresa_cliente_id = p_empresa_id OR re.empresa_transporte_id = p_empresa_id)
      AND re.role_type = 'coordinador'
      AND re.activo = TRUE
  LOOP
    INSERT INTO notificaciones (
      user_id, tipo, titulo, mensaje,
      viaje_id, despacho_id, unidad_operativa_id
    ) VALUES (
      coordinador_id, p_tipo, p_titulo, p_mensaje,
      p_viaje_id, p_despacho_id, p_unidad_operativa_id
    );
    notificaciones_creadas := notificaciones_creadas + 1;
  END LOOP;
  RETURN notificaciones_creadas;
END;
$$;

-- Trigger notificación arribo destino (026)
CREATE OR REPLACE FUNCTION trigger_notificar_arribo_destino()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  despacho_data RECORD;
BEGIN
  IF NEW.estado = 'arribo_destino' AND (OLD.estado IS NULL OR OLD.estado != 'arribo_destino') THEN
    SELECT d.*, d.empresa_id
    INTO despacho_data
    FROM despachos d
    WHERE d.id = NEW.despacho_id;
    
    IF despacho_data IS NOT NULL THEN
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
$$;

DROP TRIGGER IF EXISTS trigger_notificacion_arribo_destino ON viajes_despacho;
CREATE TRIGGER trigger_notificacion_arribo_destino
AFTER UPDATE ON viajes_despacho
FOR EACH ROW
WHEN (NEW.estado = 'arribo_destino')
EXECUTE FUNCTION trigger_notificar_arribo_destino();

-- Función limpiar notificaciones (026)
-- DROP necesario: PROD tiene esta función con RETURNS integer, no se puede cambiar con CREATE OR REPLACE
DROP FUNCTION IF EXISTS limpiar_notificaciones_antiguas();
CREATE OR REPLACE FUNCTION limpiar_notificaciones_antiguas()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM notificaciones
  WHERE leida = TRUE
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- ============================================================================
-- SECCIÓN F: CANCELACIONES (028)
-- ============================================================================

CREATE OR REPLACE FUNCTION limpiar_cancelaciones_antiguas()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  registros_eliminados INTEGER;
BEGIN
  DELETE FROM cancelaciones_despachos
  WHERE created_at < NOW() - INTERVAL '2 years';
  GET DIAGNOSTICS registros_eliminados = ROW_COUNT;
  RETURN registros_eliminados;
END;
$$;

-- ============================================================================
-- SECCIÓN G: DOCUMENTACIÓN RECURSOS (046)
-- ============================================================================

CREATE OR REPLACE FUNCTION verificar_estado_documentacion_recurso(
  p_recurso_tipo VARCHAR,
  p_recurso_id UUID
)
RETURNS TABLE (
  estado_general VARCHAR,
  documentos_criticos_faltantes INTEGER,
  documentos_vencidos INTEGER,
  documentos_por_vencer INTEGER,
  detalles JSONB
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_total_criticos INTEGER;
  v_criticos_ok INTEGER;
  v_vencidos INTEGER;
  v_por_vencer INTEGER;
  v_estado VARCHAR;
BEGIN
  SELECT COUNT(*) INTO v_total_criticos
  FROM (
    SELECT UNNEST(CASE 
      WHEN p_recurso_tipo = 'chofer' THEN ARRAY['licencia_conducir', 'carnet_psicofisico']
      WHEN p_recurso_tipo = 'camion' THEN ARRAY['vtv', 'seguro', 'habilitacion_ruta']
      WHEN p_recurso_tipo = 'acoplado' THEN ARRAY['vtv', 'seguro']
      ELSE ARRAY[]::VARCHAR[]
    END) AS tipo
  ) requeridos;
  
  SELECT COUNT(*) INTO v_criticos_ok
  FROM documentos_recursos dr
  WHERE dr.recurso_tipo = p_recurso_tipo
    AND dr.recurso_id = p_recurso_id
    AND dr.es_critico = TRUE
    AND dr.estado = 'validado'
    AND (dr.fecha_vencimiento IS NULL OR dr.fecha_vencimiento > CURRENT_DATE);
  
  SELECT COUNT(*) INTO v_vencidos
  FROM documentos_recursos dr
  WHERE dr.recurso_tipo = p_recurso_tipo
    AND dr.recurso_id = p_recurso_id
    AND dr.estado = 'validado'
    AND dr.fecha_vencimiento IS NOT NULL
    AND dr.fecha_vencimiento < CURRENT_DATE;
  
  SELECT COUNT(*) INTO v_por_vencer
  FROM documentos_recursos dr
  WHERE dr.recurso_tipo = p_recurso_tipo
    AND dr.recurso_id = p_recurso_id
    AND dr.estado = 'validado'
    AND dr.fecha_vencimiento IS NOT NULL
    AND dr.fecha_vencimiento >= CURRENT_DATE
    AND dr.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days';
  
  IF v_vencidos > 0 OR v_criticos_ok < v_total_criticos THEN
    v_estado := 'bloqueado';
  ELSIF v_por_vencer > 0 THEN
    v_estado := 'advertencia';
  ELSE
    v_estado := 'ok';
  END IF;
  
  RETURN QUERY
  SELECT 
    v_estado,
    (v_total_criticos - v_criticos_ok)::INTEGER,
    v_vencidos::INTEGER,
    v_por_vencer::INTEGER,
    jsonb_build_object(
      'total_criticos_requeridos', v_total_criticos,
      'criticos_validados', v_criticos_ok,
      'documentos', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'tipo_documento', tipo_documento,
            'estado', estado,
            'fecha_vencimiento', fecha_vencimiento,
            'es_critico', es_critico
          )
        )
        FROM documentos_recursos
        WHERE recurso_tipo = p_recurso_tipo AND recurso_id = p_recurso_id
      )
    );
END;
$$;

CREATE OR REPLACE FUNCTION verificar_documentacion_viaje(
  p_viaje_id UUID
)
RETURNS TABLE (
  estado_general VARCHAR,
  puede_operar BOOLEAN,
  problemas JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_chofer_id UUID;
  v_camion_id UUID;
  v_acoplado_id UUID;
  v_estado_chofer VARCHAR;
  v_estado_camion VARCHAR;
  v_estado_acoplado VARCHAR;
  v_puede_operar BOOLEAN := TRUE;
  v_problemas JSONB := '[]'::JSONB;
BEGIN
  SELECT chofer_id, camion_id, acoplado_id 
  INTO v_chofer_id, v_camion_id, v_acoplado_id
  FROM viajes_despacho
  WHERE id = p_viaje_id;
  
  IF v_chofer_id IS NOT NULL THEN
    SELECT edr.estado_general INTO v_estado_chofer
    FROM verificar_estado_documentacion_recurso('chofer', v_chofer_id) edr;
    IF v_estado_chofer = 'bloqueado' THEN
      v_puede_operar := FALSE;
      v_problemas := v_problemas || jsonb_build_object('recurso', 'chofer', 'problema', 'documentacion_bloqueada');
    ELSIF v_estado_chofer = 'advertencia' THEN
      v_problemas := v_problemas || jsonb_build_object('recurso', 'chofer', 'problema', 'documentacion_proxima_vencer');
    END IF;
  END IF;
  
  IF v_camion_id IS NOT NULL THEN
    SELECT edr.estado_general INTO v_estado_camion
    FROM verificar_estado_documentacion_recurso('camion', v_camion_id) edr;
    IF v_estado_camion = 'bloqueado' THEN
      v_puede_operar := FALSE;
      v_problemas := v_problemas || jsonb_build_object('recurso', 'camion', 'problema', 'documentacion_bloqueada');
    ELSIF v_estado_camion = 'advertencia' THEN
      v_problemas := v_problemas || jsonb_build_object('recurso', 'camion', 'problema', 'documentacion_proxima_vencer');
    END IF;
  END IF;
  
  IF v_acoplado_id IS NOT NULL THEN
    SELECT edr.estado_general INTO v_estado_acoplado
    FROM verificar_estado_documentacion_recurso('acoplado', v_acoplado_id) edr;
    IF v_estado_acoplado = 'bloqueado' THEN
      v_puede_operar := FALSE;
      v_problemas := v_problemas || jsonb_build_object('recurso', 'acoplado', 'problema', 'documentacion_bloqueada');
    ELSIF v_estado_acoplado = 'advertencia' THEN
      v_problemas := v_problemas || jsonb_build_object('recurso', 'acoplado', 'problema', 'documentacion_proxima_vencer');
    END IF;
  END IF;
  
  RETURN QUERY
  SELECT 
    CASE 
      WHEN NOT v_puede_operar THEN 'bloqueado'
      WHEN jsonb_array_length(v_problemas) > 0 THEN 'advertencia'
      ELSE 'ok'
    END::VARCHAR,
    v_puede_operar,
    v_problemas;
END;
$$;

CREATE OR REPLACE FUNCTION crear_incidencia_documentacion(
  p_viaje_id UUID,
  p_tipo VARCHAR,
  p_descripcion TEXT,
  p_severidad VARCHAR DEFAULT 'media'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_incidencia_id UUID;
BEGIN
  INSERT INTO incidencias_viaje (
    viaje_id, tipo_incidencia, severidad, estado, descripcion,
    reportado_por, reportado_en
  ) VALUES (
    p_viaje_id, p_tipo, p_severidad, 'abierta', p_descripcion,
    auth.uid(), NOW()
  )
  RETURNING id INTO v_incidencia_id;
  RETURN v_incidencia_id;
END;
$$;

CREATE OR REPLACE FUNCTION actualizar_estado_documentos_vencidos()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.fecha_vencimiento IS NOT NULL 
     AND NEW.estado = 'validado' 
     AND NEW.fecha_vencimiento < CURRENT_DATE THEN
    NEW.estado := 'vencido';
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_actualizar_estado_docs ON documentos_recursos;
CREATE TRIGGER trigger_actualizar_estado_docs
  BEFORE UPDATE ON documentos_recursos
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_estado_documentos_vencidos();

CREATE OR REPLACE FUNCTION marcar_documentos_vencidos()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE documentos_recursos
  SET estado = 'vencido', updated_at = NOW()
  WHERE estado = 'validado'
    AND fecha_vencimiento IS NOT NULL
    AND fecha_vencimiento < CURRENT_DATE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================================
-- SECCIÓN H: AUDITORÍA DE ESTADOS (archive/029)
-- ============================================================================

-- Función get_viaje_estados_historial
CREATE OR REPLACE FUNCTION get_viaje_estados_historial(viaje_id_param BIGINT)
RETURNS TABLE (
    id BIGINT,
    viaje_id BIGINT,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50),
    cambiado_por_email TEXT,
    cambiado_por_rol VARCHAR(50),
    motivo TEXT,
    ubicacion_lat DECIMAL(10, 8),
    ubicacion_lon DECIMAL(11, 8),
    timestamp_cambio TIMESTAMPTZ,
    metadata JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae.id,
        ae.viaje_id::BIGINT,
        ae.estado_anterior::VARCHAR(50),
        ae.estado_nuevo::VARCHAR(50),
        COALESCE(u.email, 'Sistema')::TEXT as cambiado_por_email,
        COALESCE(ae.rol_usuario, 'sistema')::VARCHAR(50) as cambiado_por_rol,
        ae.motivo::TEXT,
        ae.ubicacion_latitud,
        ae.ubicacion_longitud,
        ae.created_at as timestamp_cambio,
        ae.metadata
    FROM auditoria_estados ae
    LEFT JOIN auth.users u ON u.id = ae.user_id
    WHERE ae.viaje_id = viaje_id_param
    ORDER BY ae.created_at DESC;
END;
$$;

-- Trigger para registrar cambios de estado
CREATE OR REPLACE FUNCTION trigger_registrar_cambio_estado()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') OR (OLD.estado IS DISTINCT FROM NEW.estado) THEN
        INSERT INTO auditoria_estados (
            viaje_id, estado_anterior, estado_nuevo, user_id, metadata
        ) VALUES (
            NEW.id,
            CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.estado END,
            NEW.estado,
            auth.uid(),
            jsonb_build_object('operacion', TG_OP, 'tabla', TG_TABLE_NAME, 'timestamp', NOW())
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_viajes_cambio_estado ON viajes_despacho;
CREATE TRIGGER tr_viajes_cambio_estado
    AFTER INSERT OR UPDATE OF estado ON viajes_despacho
    FOR EACH ROW
    EXECUTE FUNCTION trigger_registrar_cambio_estado();

-- ============================================================================
-- SECCIÓN I: DOCUMENTACIÓN ENTIDADES (archive/046_CORREGIDO)
-- ============================================================================

-- Trigger validar entidad existe
CREATE OR REPLACE FUNCTION validar_entidad_existe()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entidad_tipo = 'chofer' THEN
    IF NOT EXISTS (SELECT 1 FROM choferes WHERE id = NEW.entidad_id AND empresa_id = NEW.empresa_id) THEN
      RAISE EXCEPTION 'Chofer % no existe o no pertenece a la empresa %', NEW.entidad_id, NEW.empresa_id;
    END IF;
  ELSIF NEW.entidad_tipo = 'camion' THEN
    IF NOT EXISTS (SELECT 1 FROM camiones WHERE id = NEW.entidad_id AND empresa_id = NEW.empresa_id) THEN
      RAISE EXCEPTION 'Camión % no existe o no pertenece a la empresa %', NEW.entidad_id, NEW.empresa_id;
    END IF;
  ELSIF NEW.entidad_tipo = 'acoplado' THEN
    IF NOT EXISTS (SELECT 1 FROM acoplados WHERE id = NEW.entidad_id AND empresa_id = NEW.empresa_id) THEN
      RAISE EXCEPTION 'Acoplado % no existe o no pertenece a la empresa %', NEW.entidad_id, NEW.empresa_id;
    END IF;
  ELSIF NEW.entidad_tipo = 'transporte' THEN
    IF NOT EXISTS (SELECT 1 FROM empresas WHERE id = NEW.entidad_id AND tipo_empresa = 'transporte' AND activa = TRUE) THEN
      RAISE EXCEPTION 'Empresa de transporte % no existe o está inactiva', NEW.entidad_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validar_entidad_existe ON documentos_entidad;
CREATE TRIGGER trigger_validar_entidad_existe
  BEFORE INSERT OR UPDATE ON documentos_entidad
  FOR EACH ROW
  EXECUTE FUNCTION validar_entidad_existe();

-- Trigger vigencia automática
CREATE OR REPLACE FUNCTION actualizar_vigencia_documento()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.activo = FALSE THEN RETURN NEW; END IF;
  IF NEW.fecha_vencimiento IS NOT NULL THEN
    IF NEW.fecha_vencimiento < CURRENT_DATE THEN
      NEW.estado_vigencia := 'vencido';
    ELSIF NEW.fecha_vencimiento <= CURRENT_DATE + INTERVAL '20 days' THEN
      IF NEW.estado_vigencia = 'vigente' THEN
        NEW.estado_vigencia := 'por_vencer';
      END IF;
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_vigencia ON documentos_entidad;
CREATE TRIGGER trigger_actualizar_vigencia
  BEFORE INSERT OR UPDATE ON documentos_entidad
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_vigencia_documento();

-- Trigger auditoría automática
CREATE OR REPLACE FUNCTION registrar_auditoria_documento()
RETURNS TRIGGER AS $$
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
    IF OLD.estado_vigencia = 'pendiente_validacion' AND NEW.estado_vigencia = 'vigente' THEN
      IF NEW.validacion_excepcional THEN
        v_accion := 'validacion_excepcional';
        v_metadata := jsonb_build_object('validado_por', NEW.validado_excepcionalmente_por, 'incidencia_id', NEW.incidencia_id);
      ELSE
        v_accion := 'validacion';
        v_metadata := jsonb_build_object('validado_por', NEW.validado_por);
      END IF;
    ELSIF OLD.estado_vigencia = 'pendiente_validacion' AND NEW.estado_vigencia = 'rechazado' THEN
      v_accion := 'rechazo';
      v_metadata := jsonb_build_object('motivo', NEW.motivo_rechazo, 'validado_por', NEW.validado_por);
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
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO auditoria_documentos (
    documento_id, accion, usuario_id, estado_anterior, estado_nuevo, metadata, created_at
  ) VALUES (
    COALESCE(NEW.id, OLD.id), v_accion, auth.uid(), v_estado_anterior, v_estado_nuevo, v_metadata, NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auditoria_documento ON documentos_entidad;
CREATE TRIGGER trigger_auditoria_documento
  AFTER INSERT OR UPDATE ON documentos_entidad
  FOR EACH ROW
  EXECUTE FUNCTION registrar_auditoria_documento();

-- Función batch vigencias diaria
CREATE OR REPLACE FUNCTION actualizar_vigencia_documentos_batch()
RETURNS TABLE (
  vencidos INTEGER,
  por_vencer INTEGER
) AS $$
DECLARE
  v_vencidos INTEGER;
  v_por_vencer INTEGER;
BEGIN
  UPDATE documentos_entidad
  SET estado_vigencia = 'vencido', updated_at = NOW()
  WHERE fecha_vencimiento < CURRENT_DATE
    AND estado_vigencia IN ('vigente', 'por_vencer')
    AND activo = TRUE;
  GET DIAGNOSTICS v_vencidos = ROW_COUNT;
  
  UPDATE documentos_entidad
  SET estado_vigencia = 'por_vencer', updated_at = NOW()
  WHERE fecha_vencimiento BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '20 days')
    AND estado_vigencia = 'vigente'
    AND activo = TRUE;
  GET DIAGNOSTICS v_por_vencer = ROW_COUNT;
  
  RETURN QUERY SELECT v_vencidos, v_por_vencer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función verificar documentación entidad (con permisos)
CREATE OR REPLACE FUNCTION verificar_documentacion_entidad(
  p_entidad_tipo TEXT,
  p_entidad_id UUID
)
RETURNS TABLE (
  tiene_documentos BOOLEAN,
  documentos_vigentes INTEGER,
  documentos_por_vencer INTEGER,
  documentos_vencidos INTEGER,
  documentos_pendientes INTEGER,
  documentos_faltantes TEXT[],
  detalle JSONB
) AS $$
DECLARE
  v_empresa_id UUID;
  v_puede_acceder BOOLEAN := FALSE;
BEGIN
  IF p_entidad_tipo = 'transporte' THEN
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
  
  SELECT EXISTS (
    SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND activo = TRUE
  ) OR EXISTS (
    SELECT 1 FROM usuarios_empresa ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = v_empresa_id AND ue.activo = TRUE
  ) INTO v_puede_acceder;
  
  IF NOT v_puede_acceder THEN
    RAISE EXCEPTION 'Sin permisos para acceder a la documentación de esta entidad';
  END IF;
  
  RETURN QUERY
  WITH docs AS (
    SELECT de.tipo_documento, de.estado_vigencia, de.fecha_vencimiento,
      de.validacion_excepcional, de.requiere_reconfirmacion_backoffice
    FROM documentos_entidad de
    WHERE de.entidad_tipo = p_entidad_tipo AND de.entidad_id = p_entidad_id AND de.activo = TRUE
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
    ARRAY(SELECT dr.tipo FROM docs_requeridos dr WHERE NOT EXISTS (SELECT 1 FROM docs d WHERE d.tipo_documento = dr.tipo)),
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función verificar documentación unidad operativa
CREATE OR REPLACE FUNCTION verificar_documentacion_unidad_operativa(
  p_chofer_id UUID,
  p_camion_id UUID,
  p_acoplado_id UUID DEFAULT NULL
)
RETURNS TABLE (
  puede_recibir_viajes BOOLEAN,
  puede_ingresar_planta BOOLEAN,
  motivo_bloqueo TEXT,
  alertas TEXT[],
  detalle JSONB
) AS $$
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
  SELECT tiene_documentos, documentos_vencidos, documentos_pendientes
  INTO v_chofer_tiene_docs, v_docs_vencidos, v_docs_pendientes
  FROM verificar_documentacion_entidad('chofer', p_chofer_id);
  
  IF NOT v_chofer_tiene_docs THEN
    v_puede_recibir := FALSE;
    v_puede_ingresar := FALSE;
    v_motivo := 'Chofer sin documentación cargada';
  END IF;
  
  SELECT tiene_documentos INTO v_camion_tiene_docs
  FROM verificar_documentacion_entidad('camion', p_camion_id);
  
  IF NOT v_camion_tiene_docs THEN
    v_puede_recibir := FALSE;
    v_puede_ingresar := FALSE;
    v_motivo := COALESCE(v_motivo || ' | ', '') || 'Camión sin documentación cargada';
  END IF;
  
  IF p_acoplado_id IS NOT NULL THEN
    SELECT tiene_documentos INTO v_acoplado_tiene_docs
    FROM verificar_documentacion_entidad('acoplado', p_acoplado_id);
    IF NOT v_acoplado_tiene_docs THEN
      v_puede_recibir := FALSE;
      v_puede_ingresar := FALSE;
      v_motivo := COALESCE(v_motivo || ' | ', '') || 'Acoplado sin documentación cargada';
    END IF;
  END IF;
  
  IF v_docs_vencidos > 0 THEN
    v_puede_ingresar := FALSE;
    v_motivo := COALESCE(v_motivo || ' | ', '') || format('Documentos vencidos: %s', v_docs_vencidos);
    v_alertas := array_append(v_alertas, format('%s documento(s) vencido(s)', v_docs_vencidos));
  END IF;
  
  IF v_docs_pendientes > 0 THEN
    v_alertas := array_append(v_alertas, format('%s documento(s) pendiente(s) de validación', v_docs_pendientes));
  END IF;
  
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función reemplazar documento
CREATE OR REPLACE FUNCTION reemplazar_documento(
  p_entidad_tipo TEXT,
  p_entidad_id UUID,
  p_tipo_documento TEXT,
  p_nuevo_documento_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE documentos_entidad
  SET activo = FALSE, updated_at = NOW()
  WHERE entidad_tipo = p_entidad_tipo
    AND entidad_id = p_entidad_id
    AND tipo_documento = p_tipo_documento
    AND activo = TRUE
    AND id != p_nuevo_documento_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función auditoría retrospectiva de viaje
CREATE OR REPLACE FUNCTION obtener_documentacion_historica_viaje(
  p_viaje_id UUID
)
RETURNS TABLE (
  entidad_tipo TEXT,
  entidad_id UUID,
  tipo_documento TEXT,
  estado_en_momento_viaje TEXT,
  documento_id UUID,
  fecha_vencimiento DATE,
  validado_por UUID,
  fecha_validacion TIMESTAMPTZ
) AS $$
DECLARE
  v_fecha_viaje TIMESTAMPTZ;
  v_chofer_id UUID;
  v_camion_id UUID;
  v_acoplado_id UUID;
BEGIN
  SELECT created_at, chofer_id, camion_id, acoplado_id
  INTO v_fecha_viaje, v_chofer_id, v_camion_id, v_acoplado_id
  FROM viajes_despacho
  WHERE id = p_viaje_id;
  
  IF v_fecha_viaje IS NULL THEN RAISE EXCEPTION 'Viaje no encontrado'; END IF;
  
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
  AND de.created_at <= v_fecha_viaje
  AND (de.activo = TRUE OR de.updated_at >= v_fecha_viaje)
  ORDER BY de.entidad_tipo, de.tipo_documento;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECCIÓN J: FUNCIONES DE VISIBILIDAD CROSS-EMPRESA (044, fixed 062)
-- ============================================================================

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

-- Drop old UUID-parameter versions if exist
DO $$ BEGIN DROP FUNCTION IF EXISTS get_visible_chofer_ids(UUID); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP FUNCTION IF EXISTS get_visible_camion_ids(UUID); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP FUNCTION IF EXISTS get_visible_acoplado_ids(UUID); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM pg_proc WHERE pronamespace = 'public'::regnamespace;
  RAISE NOTICE 'PARTE 4 COMPLETADA: Total funciones en public: %', v_count;
END $$;
