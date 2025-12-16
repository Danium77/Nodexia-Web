-- =====================================================
-- FUNCIONES AUXILIARES PARA SISTEMA DE ESTADOS
-- =====================================================
-- Fecha: 21 Nov 2025
-- Descripción: Funciones helper para gestión de estados
-- =====================================================

-- =====================================================
-- Función: Obtener próximos estados válidos (UNIDAD)
-- =====================================================

CREATE OR REPLACE FUNCTION obtener_proximos_estados_unidad(
  p_estado_actual TEXT
)
RETURNS TEXT[] AS $$
BEGIN
  RETURN CASE p_estado_actual
    WHEN 'pendiente' THEN ARRAY['asignado', 'cancelado']
    WHEN 'asignado' THEN ARRAY['confirmado_chofer', 'cancelado']
    WHEN 'confirmado_chofer' THEN ARRAY['en_transito_origen', 'cancelado']
    WHEN 'en_transito_origen' THEN ARRAY['arribo_origen', 'cancelado']
    WHEN 'arribo_origen' THEN ARRAY['ingreso_planta', 'cancelado']
    WHEN 'ingreso_planta' THEN ARRAY['en_playa_espera', 'cancelado']
    WHEN 'en_playa_espera' THEN ARRAY['en_proceso_carga', 'cancelado']
    WHEN 'en_proceso_carga' THEN ARRAY['cargado', 'cancelado']
    WHEN 'cargado' THEN ARRAY['egreso_planta', 'cancelado']
    WHEN 'egreso_planta' THEN ARRAY['en_transito_destino']
    WHEN 'en_transito_destino' THEN ARRAY['arribo_destino', 'cancelado']
    WHEN 'arribo_destino' THEN ARRAY['ingreso_destino', 'cancelado']
    WHEN 'ingreso_destino' THEN ARRAY['llamado_descarga', 'cancelado']
    WHEN 'llamado_descarga' THEN ARRAY['en_descarga', 'cancelado']
    WHEN 'en_descarga' THEN ARRAY['vacio']
    WHEN 'vacio' THEN ARRAY['egreso_destino']
    WHEN 'egreso_destino' THEN ARRAY['disponible_carga']
    WHEN 'disponible_carga' THEN ARRAY['viaje_completado']
    ELSE ARRAY[]::TEXT[]
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION obtener_proximos_estados_unidad IS 
'Retorna array de estados válidos a los que puede transicionar desde el estado actual (UNIDAD)';

-- =====================================================
-- Función: Obtener próximos estados válidos (CARGA)
-- =====================================================

CREATE OR REPLACE FUNCTION obtener_proximos_estados_carga(
  p_estado_actual TEXT
)
RETURNS TEXT[] AS $$
BEGIN
  RETURN CASE p_estado_actual
    WHEN 'pendiente' THEN ARRAY['planificado', 'cancelado']
    WHEN 'planificado' THEN ARRAY['documentacion_preparada', 'cancelado']
    WHEN 'documentacion_preparada' THEN ARRAY['llamado_carga', 'cancelado']
    WHEN 'llamado_carga' THEN ARRAY['posicionado_carga', 'cancelado']
    WHEN 'posicionado_carga' THEN ARRAY['iniciando_carga', 'cancelado']
    WHEN 'iniciando_carga' THEN ARRAY['cargando', 'cancelado']
    WHEN 'cargando' THEN ARRAY['carga_completada', 'cancelado']
    WHEN 'carga_completada' THEN ARRAY['documentacion_validada']
    WHEN 'documentacion_validada' THEN ARRAY['en_transito']
    WHEN 'en_transito' THEN ARRAY['arribado_destino']
    WHEN 'arribado_destino' THEN ARRAY['iniciando_descarga']
    WHEN 'iniciando_descarga' THEN ARRAY['descargando']
    WHEN 'descargando' THEN ARRAY['descargado', 'con_rechazo']
    WHEN 'descargado' THEN ARRAY['entregado', 'con_faltante']
    WHEN 'entregado' THEN ARRAY['cancelado']
    WHEN 'con_faltante' THEN ARRAY['entregado']
    WHEN 'con_rechazo' THEN ARRAY['entregado']
    ELSE ARRAY[]::TEXT[]
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION obtener_proximos_estados_carga IS 
'Retorna array de estados válidos a los que puede transicionar desde el estado actual (CARGA)';

-- =====================================================
-- Función: Validar transición de estado UNIDAD
-- =====================================================

CREATE OR REPLACE FUNCTION validar_transicion_estado_unidad(
  p_viaje_id UUID,
  p_nuevo_estado TEXT,
  p_user_id UUID
)
RETURNS TABLE(
  valido BOOLEAN,
  mensaje TEXT,
  rol_requerido TEXT
) AS $$
DECLARE
  v_estado_actual TEXT;
  v_estados_validos TEXT[];
  v_rol_usuario TEXT;
BEGIN
  -- Obtener estado actual
  SELECT estado_unidad INTO v_estado_actual
  FROM estado_unidad_viaje
  WHERE viaje_id = p_viaje_id;
  
  IF v_estado_actual IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Viaje no encontrado'::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Obtener estados válidos
  v_estados_validos := obtener_proximos_estados_unidad(v_estado_actual);
  
  -- Validar si la transición es válida
  IF NOT (p_nuevo_estado = ANY(v_estados_validos)) THEN
    RETURN QUERY SELECT 
      FALSE, 
      format('Transición inválida: %s → %s', v_estado_actual, p_nuevo_estado),
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Obtener rol del usuario
  SELECT ue.rol_interno INTO v_rol_usuario
  FROM usuarios_empresa ue
  WHERE ue.user_id = p_user_id
  LIMIT 1;
  
  -- AUTORIDAD SOBRE ESTADOS: Cada rol solo puede actualizar sus estados
  -- ========================================================================
  
  -- COORDINADOR TRANSPORTE: Asignación y cancelación
  IF p_nuevo_estado IN ('asignado', 'cancelado') THEN
    IF v_rol_usuario NOT IN ('coordinador', 'coordinador_transporte') THEN
      RETURN QUERY SELECT FALSE, 'Solo coordinadores pueden actualizar este estado'::TEXT, 'coordinador'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- CHOFER: Movimientos propios (confirmar, salir, arribos, completar)
  IF p_nuevo_estado IN ('confirmado_chofer', 'en_transito_origen', 'arribo_origen', 'arribo_destino', 'viaje_completado') THEN
    IF v_rol_usuario != 'chofer' THEN
      RETURN QUERY SELECT FALSE, 'Solo el chofer puede actualizar este estado'::TEXT, 'chofer'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- CONTROL ACCESO: Ingresos, egresos
  IF p_nuevo_estado IN ('ingreso_planta', 'en_playa_espera', 'ingreso_destino', 'egreso_destino') THEN
    IF v_rol_usuario != 'control_acceso' THEN
      RETURN QUERY SELECT FALSE, 'Solo control de acceso puede actualizar este estado'::TEXT, 'control_acceso'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- OPERADOR DESCARGA: Estados de descarga
  IF p_nuevo_estado IN ('llamado_descarga', 'vacio') THEN
    IF v_rol_usuario NOT IN ('operador_descarga', 'supervisor_carga') THEN
      RETURN QUERY SELECT FALSE, 'Solo operador de descarga puede actualizar este estado'::TEXT, 'operador_descarga'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- ESTADOS AUTOMÁTICOS: NO se actualizan manualmente
  IF p_nuevo_estado IN ('pendiente', 'en_proceso_carga', 'cargado', 'egreso_planta', 'en_transito_destino', 'en_descarga', 'disponible_carga') THEN
    RETURN QUERY SELECT FALSE, 'Este estado se actualiza automáticamente por el sistema mediante triggers'::TEXT, 'sistema'::TEXT;
    RETURN;
  END IF;
  
  -- Si llegamos aquí, la transición es válida
  RETURN QUERY SELECT TRUE, 'Transición válida'::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validar_transicion_estado_unidad IS 
'Valida autoridad del usuario sobre el estado. Estados cruzados: cada rol solo actualiza sus propios estados.';

-- =====================================================
-- Función: Actualizar estado UNIDAD con validación
-- =====================================================

CREATE OR REPLACE FUNCTION actualizar_estado_unidad(
  p_viaje_id UUID,
  p_nuevo_estado TEXT,
  p_user_id UUID,
  p_observaciones TEXT DEFAULT NULL
)
RETURNS TABLE(
  exitoso BOOLEAN,
  mensaje TEXT,
  estado_anterior TEXT,
  estado_nuevo TEXT
) AS $$
DECLARE
  v_estado_actual TEXT;
  v_validacion RECORD;
BEGIN
  -- Validar transición
  SELECT * INTO v_validacion
  FROM validar_transicion_estado_unidad(p_viaje_id, p_nuevo_estado, p_user_id);
  
  IF NOT v_validacion.valido THEN
    RETURN QUERY SELECT FALSE, v_validacion.mensaje, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Obtener estado actual
  SELECT estado_unidad INTO v_estado_actual
  FROM estado_unidad_viaje
  WHERE viaje_id = p_viaje_id;
  
  -- Actualizar estado
  UPDATE estado_unidad_viaje
  SET 
    estado_unidad = p_nuevo_estado,
    observaciones_unidad = COALESCE(p_observaciones, observaciones_unidad),
    cancelado_por = CASE WHEN p_nuevo_estado = 'cancelado' THEN p_user_id ELSE cancelado_por END
  WHERE viaje_id = p_viaje_id;
  
  -- Retornar resultado
  RETURN QUERY SELECT 
    TRUE, 
    format('Estado actualizado: %s → %s', v_estado_actual, p_nuevo_estado),
    v_estado_actual,
    p_nuevo_estado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION actualizar_estado_unidad IS 
'Actualiza el estado de la unidad con validaciones de rol y transiciones';

-- =====================================================
-- Función: Actualizar estado CARGA con validación
-- =====================================================

CREATE OR REPLACE FUNCTION actualizar_estado_carga(
  p_viaje_id UUID,
  p_nuevo_estado TEXT,
  p_user_id UUID,
  p_observaciones TEXT DEFAULT NULL,
  p_peso_real DECIMAL DEFAULT NULL,
  p_remito_numero TEXT DEFAULT NULL
)
RETURNS TABLE(
  exitoso BOOLEAN,
  mensaje TEXT,
  estado_anterior TEXT,
  estado_nuevo TEXT
) AS $$
DECLARE
  v_estado_actual TEXT;
  v_estados_validos TEXT[];
  v_rol_usuario TEXT;
BEGIN
  -- Obtener estado actual
  SELECT estado_carga INTO v_estado_actual
  FROM estado_carga_viaje
  WHERE viaje_id = p_viaje_id;
  
  IF v_estado_actual IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Viaje no encontrado'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Obtener estados válidos
  v_estados_validos := obtener_proximos_estados_carga(v_estado_actual);
  
  -- Validar transición
  IF NOT (p_nuevo_estado = ANY(v_estados_validos)) THEN
    RETURN QUERY SELECT 
      FALSE, 
      format('Transición inválida: %s → %s', v_estado_actual, p_nuevo_estado),
      NULL::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Obtener rol del usuario
  SELECT ue.rol_interno INTO v_rol_usuario
  FROM usuarios_empresa ue
  WHERE ue.user_id = p_user_id
  LIMIT 1;
  
  -- AUTORIDAD SOBRE ESTADOS DE CARGA: Cada rol solo actualiza sus estados
  -- ========================================================================
  
  -- COORDINADOR PLANTA: Planificación y cierre (NO actualiza documentacion_preparada - es automático)
  IF p_nuevo_estado IN ('planificado', 'cancelado') THEN
    IF v_rol_usuario NOT IN ('coordinador', 'administrativo') THEN
      RETURN QUERY SELECT FALSE, 'Solo coordinador puede actualizar este estado'::TEXT, NULL::TEXT, NULL::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- SUPERVISOR CARGA: Proceso físico de carga (granular)
  IF p_nuevo_estado IN ('llamado_carga', 'posicionado_carga', 'iniciando_carga', 'cargando', 'carga_completada') THEN
    IF v_rol_usuario != 'supervisor_carga' THEN
      RETURN QUERY SELECT FALSE, 'Solo supervisor de carga puede actualizar este estado'::TEXT, NULL::TEXT, NULL::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- CONTROL ACCESO: Validación de documentación
  IF p_nuevo_estado = 'documentacion_validada' THEN
    IF v_rol_usuario != 'control_acceso' THEN
      RETURN QUERY SELECT FALSE, 'Solo control de acceso puede validar documentación'::TEXT, NULL::TEXT, NULL::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- OPERADOR DESCARGA: Proceso completo de descarga (granular)
  IF p_nuevo_estado IN ('iniciando_descarga', 'descargando', 'descargado', 'entregado', 'con_faltante', 'con_rechazo') THEN
    IF v_rol_usuario NOT IN ('operador_descarga', 'supervisor_carga', 'coordinador', 'visor') THEN
      RETURN QUERY SELECT FALSE, 'Solo personal de descarga puede actualizar este estado'::TEXT, NULL::TEXT, NULL::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- ESTADOS AUTOMÁTICOS: NO se actualizan manualmente
  IF p_nuevo_estado IN ('documentacion_preparada', 'en_transito', 'arribado_destino') THEN
    RETURN QUERY SELECT FALSE, 'Este estado se actualiza automáticamente por el sistema'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Actualizar estado
  UPDATE estado_carga_viaje
  SET 
    estado_carga = p_nuevo_estado,
    observaciones_carga = COALESCE(p_observaciones, observaciones_carga),
    peso_real_kg = COALESCE(p_peso_real, peso_real_kg),
    remito_numero = COALESCE(p_remito_numero, remito_numero),
    cancelado_por = CASE WHEN p_nuevo_estado = 'cancelado_sin_carga' THEN p_user_id ELSE cancelado_por END
  WHERE viaje_id = p_viaje_id;
  
  -- Retornar resultado
  RETURN QUERY SELECT 
    TRUE, 
    format('Estado carga actualizado: %s → %s', v_estado_actual, p_nuevo_estado),
    v_estado_actual,
    p_nuevo_estado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION actualizar_estado_carga IS 
'Actualiza estado de carga con validaciones de autoridad. Estados cruzados: cada rol actualiza solo sus estados.';

-- =====================================================
-- Función: Registrar ubicación GPS
-- =====================================================

CREATE OR REPLACE FUNCTION registrar_ubicacion_gps(
  p_viaje_id UUID,
  p_chofer_id UUID,
  p_latitud DECIMAL,
  p_longitud DECIMAL,
  p_velocidad_kmh DECIMAL DEFAULT NULL,
  p_precision_metros DECIMAL DEFAULT NULL,
  p_rumbo_grados DECIMAL DEFAULT NULL,
  p_dispositivo_info JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_ubicacion_id UUID;
  v_estado_actual TEXT;
BEGIN
  -- Obtener estado actual del viaje
  SELECT estado_unidad INTO v_estado_actual
  FROM estado_unidad_viaje
  WHERE viaje_id = p_viaje_id;
  
  -- Insertar en historial
  INSERT INTO historial_ubicaciones (
    viaje_id,
    chofer_id,
    latitud,
    longitud,
    velocidad_kmh,
    precision_metros,
    rumbo_grados,
    estado_unidad_momento,
    dispositivo_info
  ) VALUES (
    p_viaje_id,
    p_chofer_id,
    p_latitud,
    p_longitud,
    p_velocidad_kmh,
    p_precision_metros,
    p_rumbo_grados,
    v_estado_actual,
    p_dispositivo_info
  )
  RETURNING id INTO v_ubicacion_id;
  
  -- Actualizar ubicación actual en estado_unidad_viaje
  UPDATE estado_unidad_viaje
  SET 
    ubicacion_actual_lat = p_latitud,
    ubicacion_actual_lon = p_longitud,
    velocidad_actual_kmh = p_velocidad_kmh,
    ultima_actualizacion_gps = NOW()
  WHERE viaje_id = p_viaje_id;
  
  RETURN v_ubicacion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION registrar_ubicacion_gps IS 
'Registra ubicación GPS del chofer y actualiza ubicación actual en estado_unidad_viaje';

-- =====================================================
-- Función: Detectar demoras automáticas
-- =====================================================

CREATE OR REPLACE FUNCTION detectar_demoras_viajes()
RETURNS TABLE(
  viaje_id UUID,
  tipo_demora TEXT,
  tiempo_transcurrido_minutos INTEGER,
  mensaje TEXT
) AS $$
BEGIN
  RETURN QUERY
  
  -- Demoras en playa de espera (> 2 horas)
  SELECT 
    eu.viaje_id,
    'playa_espera'::TEXT,
    EXTRACT(EPOCH FROM (NOW() - eu.fecha_ingreso_playa))::INTEGER / 60,
    format('Viaje en playa de espera por %s minutos', 
      EXTRACT(EPOCH FROM (NOW() - eu.fecha_ingreso_playa))::INTEGER / 60
    )
  FROM estado_unidad_viaje eu
  WHERE eu.estado_unidad = 'en_playa_espera'
    AND eu.fecha_ingreso_playa IS NOT NULL
    AND (NOW() - eu.fecha_ingreso_playa) > INTERVAL '2 hours'
  
  UNION ALL
  
  -- Demoras en carga (> 1 hora)
  SELECT 
    ec.viaje_id,
    'proceso_carga'::TEXT,
    EXTRACT(EPOCH FROM (NOW() - ec.fecha_inicio_carga))::INTEGER / 60,
    format('Carga en proceso por %s minutos', 
      EXTRACT(EPOCH FROM (NOW() - ec.fecha_inicio_carga))::INTEGER / 60
    )
  FROM estado_carga_viaje ec
  WHERE ec.estado_carga = 'en_proceso_carga'
    AND ec.fecha_inicio_carga IS NOT NULL
    AND (NOW() - ec.fecha_inicio_carga) > INTERVAL '1 hour'
  
  UNION ALL
  
  -- Viajes sin confirmación de chofer (> 24 horas)
  SELECT 
    eu.viaje_id,
    'sin_confirmar'::TEXT,
    EXTRACT(EPOCH FROM (NOW() - eu.fecha_asignacion))::INTEGER / 60,
    format('Viaje asignado sin confirmar por %s horas', 
      EXTRACT(EPOCH FROM (NOW() - eu.fecha_asignacion))::INTEGER / 60 / 60
    )
  FROM estado_unidad_viaje eu
  WHERE eu.estado_unidad = 'asignado'
    AND eu.fecha_asignacion IS NOT NULL
    AND (NOW() - eu.fecha_asignacion) > INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detectar_demoras_viajes IS 
'Detecta viajes con demoras anormales en diferentes fases del proceso';

-- =====================================================
-- Función: Calcular KPIs de viaje
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_kpis_viaje(p_viaje_id UUID)
RETURNS TABLE(
  tiempo_total_horas DECIMAL,
  tiempo_en_planta_minutos INTEGER,
  tiempo_carga_minutos INTEGER,
  tiempo_transito_origen_minutos INTEGER,
  tiempo_transito_destino_minutos INTEGER,
  diferencia_peso_kg DECIMAL,
  eficiencia_carga DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Tiempo total del viaje
    EXTRACT(EPOCH FROM (
      COALESCE(eu.fecha_viaje_completado, NOW()) - eu.fecha_creacion
    ))::DECIMAL / 3600,
    
    -- Tiempo en planta (arribo a origen → egreso origen)
    EXTRACT(EPOCH FROM (
      eu.fecha_egreso_origen - eu.fecha_arribo_origen
    ))::INTEGER / 60,
    
    -- Tiempo de carga
    EXTRACT(EPOCH FROM (
      ec.fecha_cargado - ec.fecha_inicio_carga
    ))::INTEGER / 60,
    
    -- Tiempo de tránsito a origen
    EXTRACT(EPOCH FROM (
      eu.fecha_arribo_origen - eu.fecha_inicio_transito_origen
    ))::INTEGER / 60,
    
    -- Tiempo de tránsito a destino
    EXTRACT(EPOCH FROM (
      eu.fecha_arribo_destino - eu.fecha_inicio_transito_destino
    ))::INTEGER / 60,
    
    -- Diferencia de peso (real - estimado)
    (ec.peso_real_kg - ec.peso_estimado_kg),
    
    -- Eficiencia de carga (peso real / peso estimado * 100)
    CASE 
      WHEN ec.peso_estimado_kg > 0 THEN
        (ec.peso_real_kg / ec.peso_estimado_kg * 100)
      ELSE NULL
    END
    
  FROM estado_unidad_viaje eu
  INNER JOIN estado_carga_viaje ec ON ec.viaje_id = eu.viaje_id
  WHERE eu.viaje_id = p_viaje_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_kpis_viaje IS 
'Calcula KPIs operativos de un viaje específico';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ FUNCIONES DE ESTADOS CREADAS';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Funciones disponibles:';
  RAISE NOTICE '   - obtener_proximos_estados_unidad()';
  RAISE NOTICE '   - obtener_proximos_estados_carga()';
  RAISE NOTICE '   - validar_transicion_estado_unidad()';
  RAISE NOTICE '   - actualizar_estado_unidad()';
  RAISE NOTICE '   - actualizar_estado_carga()';
  RAISE NOTICE '   - registrar_ubicacion_gps()';
  RAISE NOTICE '   - detectar_demoras_viajes()';
  RAISE NOTICE '   - calcular_kpis_viaje()';
END $$;
