-- =====================================================
-- SISTEMA DE AUDITORÍA DE ESTADOS
-- Registra todos los cambios de estado en viajes
-- =====================================================

-- 1. CREAR TABLA DE AUDITORÍA DE ESTADOS
CREATE TABLE IF NOT EXISTS public.viajes_estados_audit (
  id BIGSERIAL PRIMARY KEY,
  viaje_id BIGINT NOT NULL REFERENCES public.viajes_despacho(id) ON DELETE CASCADE,
  tipo_estado TEXT NOT NULL, -- 'unidad' o 'carga'
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  fecha_cambio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usuario_id UUID, -- Usuario que hizo el cambio
  ubicacion_lat DECIMAL(10, 8), -- Ubicación donde se hizo el cambio
  ubicacion_lng DECIMAL(11, 8),
  notas TEXT, -- Notas adicionales del cambio
  metadata JSONB, -- Datos adicionales (IP, dispositivo, etc.)
  CONSTRAINT valid_tipo_estado CHECK (tipo_estado IN ('unidad', 'carga'))
);

-- 2. ÍNDICES PARA RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_viajes_estados_audit_viaje 
  ON public.viajes_estados_audit(viaje_id);

CREATE INDEX IF NOT EXISTS idx_viajes_estados_audit_fecha 
  ON public.viajes_estados_audit(fecha_cambio DESC);

CREATE INDEX IF NOT EXISTS idx_viajes_estados_audit_usuario 
  ON public.viajes_estados_audit(usuario_id);

CREATE INDEX IF NOT EXISTS idx_viajes_estados_audit_tipo 
  ON public.viajes_estados_audit(tipo_estado);

-- 3. FUNCIÓN: Registrar cambio de estado de unidad
CREATE OR REPLACE FUNCTION audit_estado_unidad_viaje()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo registrar si cambió el estado
  IF NEW.estado_unidad_viaje IS DISTINCT FROM OLD.estado_unidad_viaje THEN
    INSERT INTO public.viajes_estados_audit (
      viaje_id,
      tipo_estado,
      estado_anterior,
      estado_nuevo,
      usuario_id,
      fecha_cambio,
      metadata
    ) VALUES (
      NEW.id,
      'unidad',
      OLD.estado_unidad_viaje,
      NEW.estado_unidad_viaje,
      auth.uid(),
      NOW(),
      jsonb_build_object(
        'fecha_anterior_actualizacion', OLD.fecha_actualizacion_estado_unidad,
        'fecha_nueva_actualizacion', NEW.fecha_actualizacion_estado_unidad
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNCIÓN: Registrar cambio de estado de carga
CREATE OR REPLACE FUNCTION audit_estado_carga_viaje()
RETURNS TRIGGER AS $$
DECLARE
  cambios JSONB;
BEGIN
  -- Solo registrar si cambió el estado
  IF NEW.estado_carga_viaje IS DISTINCT FROM OLD.estado_carga_viaje THEN
    -- Construir metadata con todos los cambios de fechas
    cambios := jsonb_build_object(
      'fecha_planificacion_anterior', OLD.fecha_planificacion,
      'fecha_planificacion_nueva', NEW.fecha_planificacion,
      'fecha_cargando_anterior', OLD.fecha_cargando,
      'fecha_cargando_nueva', NEW.fecha_cargando,
      'fecha_carga_completada_anterior', OLD.fecha_carga_completada,
      'fecha_carga_completada_nueva', NEW.fecha_carga_completada,
      'fecha_descargando_anterior', OLD.fecha_descargando,
      'fecha_descargando_nueva', NEW.fecha_descargando,
      'peso_real_anterior', OLD.peso_real_kg,
      'peso_real_nuevo', NEW.peso_real_kg
    );

    INSERT INTO public.viajes_estados_audit (
      viaje_id,
      tipo_estado,
      estado_anterior,
      estado_nuevo,
      usuario_id,
      fecha_cambio,
      metadata
    ) VALUES (
      NEW.id,
      'carga',
      OLD.estado_carga_viaje,
      NEW.estado_carga_viaje,
      auth.uid(),
      NOW(),
      cambios
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. TRIGGERS: Activar auditoría automática
DROP TRIGGER IF EXISTS audit_estado_unidad_trigger ON public.viajes_despacho;
CREATE TRIGGER audit_estado_unidad_trigger
  AFTER UPDATE OF estado_unidad_viaje ON public.viajes_despacho
  FOR EACH ROW
  WHEN (OLD.estado_unidad_viaje IS DISTINCT FROM NEW.estado_unidad_viaje)
  EXECUTE FUNCTION audit_estado_unidad_viaje();

DROP TRIGGER IF EXISTS audit_estado_carga_trigger ON public.viajes_despacho;
CREATE TRIGGER audit_estado_carga_trigger
  AFTER UPDATE OF estado_carga_viaje ON public.viajes_despacho
  FOR EACH ROW
  WHEN (OLD.estado_carga_viaje IS DISTINCT FROM NEW.estado_carga_viaje)
  EXECUTE FUNCTION audit_estado_carga_viaje();

-- 6. FUNCIÓN: Obtener historial de estados de un viaje
CREATE OR REPLACE FUNCTION get_viaje_estados_historial(viaje_id_param BIGINT)
RETURNS TABLE(
  id BIGINT,
  tipo_estado TEXT,
  estado_anterior TEXT,
  estado_nuevo TEXT,
  fecha_cambio TIMESTAMP WITH TIME ZONE,
  usuario_email TEXT,
  usuario_nombre TEXT,
  notas TEXT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vea.id,
    vea.tipo_estado,
    vea.estado_anterior,
    vea.estado_nuevo,
    vea.fecha_cambio,
    au.email as usuario_email,
    u.nombre_completo as usuario_nombre,
    vea.notas,
    vea.metadata
  FROM public.viajes_estados_audit vea
  LEFT JOIN auth.users au ON vea.usuario_id = au.id
  LEFT JOIN public.usuarios u ON vea.usuario_id = u.id
  WHERE vea.viaje_id = viaje_id_param
  ORDER BY vea.fecha_cambio DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FUNCIÓN: Estadísticas de cambios de estado
CREATE OR REPLACE FUNCTION get_estados_statistics(
  fecha_desde TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  fecha_hasta TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE(
  tipo_estado TEXT,
  estado_nuevo TEXT,
  cantidad_cambios BIGINT,
  ultimos_cambios JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vea.tipo_estado,
    vea.estado_nuevo,
    COUNT(*)::BIGINT as cantidad_cambios,
    jsonb_agg(
      jsonb_build_object(
        'viaje_id', vea.viaje_id,
        'fecha_cambio', vea.fecha_cambio,
        'usuario', u.nombre_completo
      ) ORDER BY vea.fecha_cambio DESC
    ) FILTER (WHERE vea.id IN (
      SELECT id 
      FROM public.viajes_estados_audit vea2 
      WHERE vea2.tipo_estado = vea.tipo_estado 
        AND vea2.estado_nuevo = vea.estado_nuevo 
      ORDER BY fecha_cambio DESC 
      LIMIT 5
    )) as ultimos_cambios
  FROM public.viajes_estados_audit vea
  LEFT JOIN public.usuarios u ON vea.usuario_id = u.id
  WHERE vea.fecha_cambio BETWEEN fecha_desde AND fecha_hasta
  GROUP BY vea.tipo_estado, vea.estado_nuevo
  ORDER BY cantidad_cambios DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. FUNCIÓN: Validar transición de estado
CREATE OR REPLACE FUNCTION validar_transicion_estado(
  tipo TEXT,
  estado_actual TEXT,
  estado_nuevo TEXT
)
RETURNS TABLE(
  valido BOOLEAN,
  mensaje TEXT
) AS $$
BEGIN
  -- Validaciones para estado de UNIDAD
  IF tipo = 'unidad' THEN
    -- Asignado → En tránsito
    IF estado_actual = 'asignado' AND estado_nuevo = 'en_transito' THEN
      RETURN QUERY SELECT true, 'Transición válida: Viaje iniciado';
    -- En tránsito → Llegado destino
    ELSIF estado_actual = 'en_transito' AND estado_nuevo = 'llegado_destino' THEN
      RETURN QUERY SELECT true, 'Transición válida: Unidad llegó a destino';
    -- Llegado destino → Completado
    ELSIF estado_actual = 'llegado_destino' AND estado_nuevo = 'completado' THEN
      RETURN QUERY SELECT true, 'Transición válida: Viaje completado';
    -- Cualquier estado → Cancelado
    ELSIF estado_nuevo = 'cancelado' THEN
      RETURN QUERY SELECT true, 'Transición válida: Viaje cancelado';
    ELSE
      RETURN QUERY SELECT false, FORMAT('Transición inválida: %s → %s', estado_actual, estado_nuevo);
    END IF;
  
  -- Validaciones para estado de CARGA
  ELSIF tipo = 'carga' THEN
    -- Planificación → Cargando
    IF estado_actual = 'planificacion' AND estado_nuevo = 'cargando' THEN
      RETURN QUERY SELECT true, 'Transición válida: Inicio de carga';
    -- Cargando → Carga completada
    ELSIF estado_actual = 'cargando' AND estado_nuevo = 'carga_completada' THEN
      RETURN QUERY SELECT true, 'Transición válida: Carga finalizada';
    -- Carga completada → Descargando
    ELSIF estado_actual = 'carga_completada' AND estado_nuevo = 'descargando' THEN
      RETURN QUERY SELECT true, 'Transición válida: Inicio de descarga';
    -- Descargando → Entregado
    ELSIF estado_actual = 'descargando' AND estado_nuevo = 'entregado' THEN
      RETURN QUERY SELECT true, 'Transición válida: Entrega completada';
    ELSE
      RETURN QUERY SELECT false, FORMAT('Transición inválida: %s → %s', estado_actual, estado_nuevo);
    END IF;
  ELSE
    RETURN QUERY SELECT false, 'Tipo de estado inválido';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. VISTA: Último cambio de estado por viaje
CREATE OR REPLACE VIEW viajes_ultimo_cambio_estado AS
SELECT DISTINCT ON (viaje_id, tipo_estado)
  viaje_id,
  tipo_estado,
  estado_nuevo,
  fecha_cambio,
  usuario_id,
  notas
FROM public.viajes_estados_audit
ORDER BY viaje_id, tipo_estado, fecha_cambio DESC;

-- 10. POLÍTICAS RLS para auditoría
ALTER TABLE public.viajes_estados_audit ENABLE ROW LEVEL SECURITY;

-- Admins pueden ver todo
DROP POLICY IF EXISTS "Admins pueden ver auditoría" ON public.viajes_estados_audit;
CREATE POLICY "Admins pueden ver auditoría"
  ON public.viajes_estados_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rol_primario IN ('admin', 'super_admin')
    )
  );

-- Choferes pueden ver sus propios viajes
DROP POLICY IF EXISTS "Choferes pueden ver su auditoría" ON public.viajes_estados_audit;
CREATE POLICY "Choferes pueden ver su auditoría"
  ON public.viajes_estados_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.viajes_despacho vd
      WHERE vd.id = viaje_id
      AND vd.chofer_id = auth.uid()
    )
  );

-- 11. PERMISOS
GRANT SELECT ON public.viajes_estados_audit TO authenticated;
GRANT EXECUTE ON FUNCTION get_viaje_estados_historial(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_estados_statistics(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION validar_transicion_estado(TEXT, TEXT, TEXT) TO authenticated;
GRANT SELECT ON viajes_ultimo_cambio_estado TO authenticated;

-- 12. COMENTARIOS
COMMENT ON TABLE public.viajes_estados_audit IS 'Auditoría completa de todos los cambios de estado en viajes';
COMMENT ON FUNCTION audit_estado_unidad_viaje() IS 'Registra automáticamente cambios en estado_unidad_viaje';
COMMENT ON FUNCTION audit_estado_carga_viaje() IS 'Registra automáticamente cambios en estado_carga_viaje';
COMMENT ON FUNCTION get_viaje_estados_historial(BIGINT) IS 'Obtiene el historial completo de estados de un viaje';
COMMENT ON FUNCTION get_estados_statistics(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS 'Estadísticas de cambios de estado en un período';
COMMENT ON FUNCTION validar_transicion_estado(TEXT, TEXT, TEXT) IS 'Valida si una transición de estado es permitida';

-- =====================================================
-- INSTALACIÓN COMPLETADA
-- =====================================================
-- Los triggers están activos y registrarán automáticamente todos los cambios
-- Para ver historial: SELECT * FROM get_viaje_estados_historial(123);
-- Para ver estadísticas: SELECT * FROM get_estados_statistics();
-- Para validar transición: SELECT * FROM validar_transicion_estado('unidad', 'asignado', 'en_transito');
-- =====================================================
