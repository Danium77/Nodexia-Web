-- =====================================================
-- MIGRACIÓN 015: Sistema Dual de Estados
-- =====================================================
-- Fecha: 2026-01-09
-- Descripción: Implementa sistema completo de estados separados:
--   - estado_unidad: 20 estados (tracking físico del camión/chofer)
--   - estado_carga: 14 estados (tracking del producto/documentación)
-- 
-- Basado en: docs/DIAGRAMA-FLUJO-ESTADOS-CRUZADOS.md
-- Patrón: Uber Freight / Amazon Relay
-- =====================================================

BEGIN;

-- =====================================================
-- 1. AGREGAR NUEVAS COLUMNAS
-- =====================================================

ALTER TABLE viajes_despacho 
  ADD COLUMN IF NOT EXISTS estado_unidad TEXT,
  ADD COLUMN IF NOT EXISTS estado_carga TEXT;

COMMENT ON COLUMN viajes_despacho.estado_unidad IS 'Estado físico del camión/chofer (20 estados). Tracking logístico de la unidad de transporte.';
COMMENT ON COLUMN viajes_despacho.estado_carga IS 'Estado del producto/documentación (14 estados). Tracking de la carga y compliance.';

-- =====================================================
-- 2. MIGRAR DATOS EXISTENTES
-- =====================================================
-- Mapeo del estado antiguo a estados duales

UPDATE viajes_despacho 
SET 
  estado_unidad = CASE 
    WHEN estado = 'pendiente' THEN 'pendiente'
    WHEN estado = 'transporte_asignado' THEN 'asignado'
    WHEN estado = 'en_transito' THEN 'en_transito_destino'
    WHEN estado = 'completado' THEN 'viaje_completado'
    WHEN estado = 'cancelado' THEN 'cancelado'
    ELSE 'pendiente'
  END,
  estado_carga = CASE 
    WHEN estado = 'pendiente' THEN 'pendiente'
    WHEN estado = 'transporte_asignado' THEN 'documentacion_preparada'
    WHEN estado = 'en_transito' THEN 'en_transito'
    WHEN estado = 'completado' THEN 'completado'
    WHEN estado = 'cancelado' THEN 'cancelado'
    ELSE 'pendiente'
  END
WHERE estado_unidad IS NULL OR estado_carga IS NULL;

-- =====================================================
-- 3. APLICAR CONSTRAINTS
-- =====================================================

-- Estado Unidad: 20 estados
ALTER TABLE viajes_despacho
  DROP CONSTRAINT IF EXISTS viajes_despacho_estado_unidad_check,
  ADD CONSTRAINT viajes_despacho_estado_unidad_check 
  CHECK (estado_unidad IN (
    'pendiente',              -- Viaje creado, sin asignar
    'asignado',               -- Camión + chofer asignados por coord. transporte
    'confirmado_chofer',      -- Chofer aceptó el viaje desde app móvil
    'en_transito_origen',     -- Chofer en camino a planta de carga
    'arribo_origen',          -- Chofer reporta llegada a origen
    'ingreso_planta',         -- Control Acceso registra ingreso físico
    'en_playa_espera',        -- En playa esperando llamado a carga
    'en_proceso_carga',       -- 🤖 AUTO: Supervisor inició proceso de carga
    'cargado',                -- 🤖 AUTO: Carga completada (trigger)
    'egreso_planta',          -- 🤖 AUTO: Listo para egresar (trigger)
    'en_transito_destino',    -- En camino a destino
    'arribo_destino',         -- Chofer reporta llegada a destino
    'ingreso_destino',        -- Control Acceso destino registra ingreso
    'llamado_descarga',       -- Operador destino llama a descarga
    'en_descarga',            -- 🤖 AUTO: Descarga en progreso (trigger)
    'vacio',                  -- Camión vacío confirmado por operador
    'egreso_destino',         -- Control Acceso destino registra egreso
    'disponible_carga',       -- 🤖 AUTO: Unidad lista para nuevo viaje
    'viaje_completado',       -- Viaje cerrado administrativamente
    'cancelado',              -- Viaje cancelado
    'expirado'                -- 🤖 AUTO: Viaje expirado (sin recursos)
  ));

-- Estado Carga: 14 estados
ALTER TABLE viajes_despacho
  DROP CONSTRAINT IF EXISTS viajes_despacho_estado_carga_check,
  ADD CONSTRAINT viajes_despacho_estado_carga_check 
  CHECK (estado_carga IN (
    'pendiente',              -- Despacho creado, sin documentación
    'documentacion_preparada',-- 🤖 AUTO: Docs listas (trigger asignación)
    'llamado_carga',          -- Supervisor llama camión a cargar
    'posicionado_carga',      -- Camión posicionado en bay de carga
    'iniciando_carga',        -- Supervisor inicia proceso de carga
    'cargando',               -- Carga en progreso
    'carga_completada',       -- Carga finalizada, registrado peso/remito
    'documentacion_validada', -- Control Acceso validó remito/carta porte
    'en_transito',            -- 🤖 AUTO: Producto en tránsito a destino
    'arribado_destino',       -- 🤖 AUTO: Producto arribó (trigger)
    'iniciando_descarga',     -- Operador destino inicia descarga
    'descargando',            -- Descarga en progreso
    'descargado',             -- Descarga completa, producto recibido
    'entregado',              -- Documentación firmada, entrega confirmada
    'completado',             -- 🤖 AUTO: Proceso completo (trigger)
    'cancelado'               -- Carga cancelada
  ));

-- NOT NULL constraints (después de migrar datos)
ALTER TABLE viajes_despacho
  ALTER COLUMN estado_unidad SET NOT NULL,
  ALTER COLUMN estado_carga SET NOT NULL;

-- =====================================================
-- 4. ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_viajes_estado_unidad ON viajes_despacho(estado_unidad);
CREATE INDEX IF NOT EXISTS idx_viajes_estado_carga ON viajes_despacho(estado_carga);
CREATE INDEX IF NOT EXISTS idx_viajes_estados_combinados ON viajes_despacho(estado_unidad, estado_carga);

-- Índice para tracking en tiempo real (chofer+camión asignados)
CREATE INDEX IF NOT EXISTS idx_viajes_trackeo_activo 
  ON viajes_despacho(estado_unidad, chofer_id, camion_id)
  WHERE chofer_id IS NOT NULL AND camion_id IS NOT NULL;

-- =====================================================
-- 5. TRIGGERS AUTOMÁTICOS DE TRANSICIÓN
-- =====================================================

-- 🤖 Trigger 1: Asignación → Documentación preparada
CREATE OR REPLACE FUNCTION auto_transicion_documentacion_preparada()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando se asigna camión+chofer, la documentación está lista
  IF NEW.chofer_id IS NOT NULL 
     AND NEW.camion_id IS NOT NULL 
     AND OLD.chofer_id IS NULL 
     AND NEW.estado_unidad = 'asignado'
  THEN
    NEW.estado_carga := 'documentacion_preparada';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_documentacion_preparada ON viajes_despacho;
CREATE TRIGGER trigger_auto_documentacion_preparada
  BEFORE UPDATE ON viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION auto_transicion_documentacion_preparada();

-- 🤖 Trigger 2: Iniciando carga → En proceso carga
CREATE OR REPLACE FUNCTION auto_transicion_en_proceso_carga()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado_carga = 'iniciando_carga' AND OLD.estado_carga != 'iniciando_carga' THEN
    NEW.estado_unidad := 'en_proceso_carga';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_en_proceso_carga ON viajes_despacho;
CREATE TRIGGER trigger_auto_en_proceso_carga
  BEFORE UPDATE ON viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION auto_transicion_en_proceso_carga();

-- 🤖 Trigger 3: Carga completada → Cargado
CREATE OR REPLACE FUNCTION auto_transicion_cargado()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado_carga = 'carga_completada' AND OLD.estado_carga != 'carga_completada' THEN
    NEW.estado_unidad := 'cargado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_cargado ON viajes_despacho;
CREATE TRIGGER trigger_auto_cargado
  BEFORE UPDATE ON viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION auto_transicion_cargado();

-- 🤖 Trigger 4: Documentación validada → Egreso planta
CREATE OR REPLACE FUNCTION auto_transicion_egreso_planta()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado_carga = 'documentacion_validada' AND OLD.estado_carga != 'documentacion_validada' THEN
    NEW.estado_unidad := 'egreso_planta';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_egreso_planta ON viajes_despacho;
CREATE TRIGGER trigger_auto_egreso_planta
  BEFORE UPDATE ON viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION auto_transicion_egreso_planta();

-- 🤖 Trigger 5: Egreso planta → En tránsito destino + En tránsito carga
CREATE OR REPLACE FUNCTION auto_transicion_en_transito()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando control acceso autoriza egreso, se inicia tránsito automáticamente
  IF NEW.estado_unidad = 'egreso_planta' 
     AND OLD.estado_unidad != 'egreso_planta' 
     AND OLD.estado_unidad != 'en_transito_destino'
  THEN
    -- Dar 5 minutos para que chofer salga físicamente
    -- Este trigger puede ser reemplazado por acción del chofer "Iniciar viaje"
    NEW.estado_unidad := 'en_transito_destino';
    NEW.estado_carga := 'en_transito';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_en_transito ON viajes_despacho;
CREATE TRIGGER trigger_auto_en_transito
  BEFORE UPDATE ON viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION auto_transicion_en_transito();

-- 🤖 Trigger 6: Arribo destino → Arribado destino (carga)
CREATE OR REPLACE FUNCTION auto_transicion_arribado_destino()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado_unidad = 'arribo_destino' AND OLD.estado_unidad != 'arribo_destino' THEN
    NEW.estado_carga := 'arribado_destino';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_arribado_destino ON viajes_despacho;
CREATE TRIGGER trigger_auto_arribado_destino
  BEFORE UPDATE ON viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION auto_transicion_arribado_destino();

-- 🤖 Trigger 7: Iniciando descarga → En descarga
CREATE OR REPLACE FUNCTION auto_transicion_en_descarga()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado_carga = 'iniciando_descarga' AND OLD.estado_carga != 'iniciando_descarga' THEN
    NEW.estado_unidad := 'en_descarga';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_en_descarga ON viajes_despacho;
CREATE TRIGGER trigger_auto_en_descarga
  BEFORE UPDATE ON viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION auto_transicion_en_descarga();

-- 🤖 Trigger 8: Descargado → Vacío
CREATE OR REPLACE FUNCTION auto_transicion_vacio()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado_carga = 'descargado' AND OLD.estado_carga != 'descargado' THEN
    NEW.estado_unidad := 'vacio';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_vacio ON viajes_despacho;
CREATE TRIGGER trigger_auto_vacio
  BEFORE UPDATE ON viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION auto_transicion_vacio();

-- 🤖 Trigger 9: Entregado → Disponible carga + Completado
CREATE OR REPLACE FUNCTION auto_transicion_completado()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado_carga = 'entregado' AND OLD.estado_carga != 'entregado' THEN
    NEW.estado_unidad := 'disponible_carga';
    NEW.estado_carga := 'completado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_completado ON viajes_despacho;
CREATE TRIGGER trigger_auto_completado
  BEFORE UPDATE ON viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION auto_transicion_completado();

-- =====================================================
-- 6. FUNCIONES HELPER POR ROL
-- =====================================================

-- Estados permitidos para CHOFER
CREATE OR REPLACE FUNCTION estados_permitidos_chofer()
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY[
    'confirmado_chofer',
    'en_transito_origen',
    'arribo_origen',
    'arribo_destino',
    'viaje_completado'
  ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION estados_permitidos_chofer() IS 'Estados de UNIDAD que el chofer puede actualizar manualmente desde la app móvil.';

-- Estados permitidos para CONTROL ACCESO
CREATE OR REPLACE FUNCTION estados_permitidos_control_acceso()
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY[
    'ingreso_planta',
    'en_playa_espera',
    'documentacion_validada',
    'ingreso_destino',
    'egreso_destino'
  ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION estados_permitidos_control_acceso() IS 'Estados de UNIDAD que control de acceso puede actualizar en portería.';

-- Estados permitidos para SUPERVISOR CARGA (estado_carga)
CREATE OR REPLACE FUNCTION estados_carga_permitidos_supervisor()
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY[
    'llamado_carga',
    'posicionado_carga',
    'iniciando_carga',
    'cargando',
    'carga_completada'
  ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION estados_carga_permitidos_supervisor() IS 'Estados de CARGA que supervisor de carga puede actualizar en planta.';

-- Estados permitidos para OPERADOR DESCARGA (estado_carga)
CREATE OR REPLACE FUNCTION estados_carga_permitidos_operador_descarga()
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY[
    'iniciando_descarga',
    'descargando',
    'descargado',
    'entregado'
  ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION estados_carga_permitidos_operador_descarga() IS 'Estados de CARGA que operador de descarga puede actualizar en destino.';

-- Estados permitidos para COORDINADOR TRANSPORTE
CREATE OR REPLACE FUNCTION estados_permitidos_coord_transporte()
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY[
    'asignado',
    'cancelado'
  ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION estados_permitidos_coord_transporte() IS 'Estados de UNIDAD que coordinador de transporte puede actualizar.';

-- Estados permitidos para COORDINADOR PLANTA
CREATE OR REPLACE FUNCTION estados_permitidos_coord_planta()
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY[
    'cancelado'
  ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION estados_permitidos_coord_planta() IS 'Estados de UNIDAD que coordinador de planta puede actualizar (solo cancelación).';

-- =====================================================
-- 7. VISTA CONSOLIDADA DE ESTADOS
-- =====================================================

CREATE OR REPLACE VIEW vista_viajes_estados_completos AS
SELECT 
  v.id,
  v.despacho_id,
  d.pedido_id,
  
  -- Estados actuales
  v.estado_unidad,
  v.estado_carga,
  v.estado AS estado_legacy, -- Para referencia
  
  -- Información de recursos
  c.nombre AS camion,
  ch.nombre AS chofer,
  emp.nombre_empresa AS empresa_transporte,
  
  -- Clasificación de estado
  CASE 
    WHEN v.estado_unidad IN ('viaje_completado', 'cancelado', 'expirado') THEN 'finalizado'
    WHEN v.estado_unidad IN ('en_transito_origen', 'en_transito_destino') THEN 'en_transito'
    WHEN v.estado_unidad IN ('en_proceso_carga', 'cargando', 'cargado', 'en_descarga', 'descargando') THEN 'operacion_activa'
    WHEN v.estado_unidad IN ('pendiente', 'asignado', 'confirmado_chofer') THEN 'planificacion'
    ELSE 'otros'
  END AS categoria_estado,
  
  -- Indicadores
  CASE 
    WHEN v.estado_unidad = 'expirado' THEN true
    ELSE false
  END AS es_expirado,
  
  CASE 
    WHEN v.estado_unidad IN ('viaje_completado', 'cancelado', 'expirado') THEN true
    ELSE false
  END AS es_final,
  
  CASE 
    WHEN v.chofer_id IS NOT NULL AND v.camion_id IS NOT NULL THEN true
    ELSE false
  END AS es_trackeable,
  
  -- Fechas
  d.scheduled_at AS fecha_programada,
  v.created_at AS fecha_creacion,
  v.updated_at AS ultima_actualizacion
  
FROM viajes_despacho v
JOIN despachos d ON v.despacho_id = d.id
LEFT JOIN camiones c ON v.camion_id = c.id
LEFT JOIN choferes ch ON v.chofer_id = ch.id
LEFT JOIN empresas emp ON ch.empresa_id = emp.id;

COMMENT ON VIEW vista_viajes_estados_completos IS 'Vista consolidada con estados duales, clasificación y metadatos para uso en frontend.';

-- =====================================================
-- 8. ACTUALIZAR FUNCIÓN DE EXPIRACIÓN
-- =====================================================

-- Actualizar función para usar estado_unidad
CREATE OR REPLACE FUNCTION marcar_viajes_expirados()
RETURNS TABLE(
  viaje_id UUID,
  pedido_id TEXT,
  razon_expiracion TEXT,
  estado_anterior_unidad TEXT,
  estado_anterior_carga TEXT
) AS $$
BEGIN
  RETURN QUERY
  UPDATE viajes_despacho v
  SET 
    estado_unidad = 'expirado',
    updated_at = NOW()
  FROM despachos d
  WHERE v.despacho_id = d.id
    AND d.scheduled_at < NOW() -- Fecha programada pasó
    AND (v.chofer_id IS NULL OR v.camion_id IS NULL) -- Sin recursos asignados
    AND v.estado_unidad NOT IN ('expirado', 'viaje_completado', 'cancelado', 'disponible_carga') -- Excluir estados finales
  RETURNING 
    v.id AS viaje_id,
    d.pedido_id,
    CASE 
      WHEN v.chofer_id IS NULL AND v.camion_id IS NULL THEN 'Sin chofer ni camión asignado'
      WHEN v.chofer_id IS NULL THEN 'Sin chofer asignado'
      WHEN v.camion_id IS NULL THEN 'Sin camión asignado'
    END AS razon_expiracion,
    v.estado_unidad AS estado_anterior_unidad,
    v.estado_carga AS estado_anterior_carga;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION marcar_viajes_expirados() IS 'Marca viajes como expirados si pasó la fecha programada y no tienen recursos asignados. Actualiza estado_unidad a expirado.';

-- =====================================================
-- 9. VISTA ANALYTICS DE VIAJES EXPIRADOS (ACTUALIZADA)
-- =====================================================

CREATE OR REPLACE VIEW vista_viajes_expirados_analytics AS
SELECT 
  v.id,
  d.pedido_id,
  d.scheduled_at AS fecha_programada,
  v.created_at AS fecha_creacion,
  v.updated_at AS fecha_expiracion,
  
  -- Razón de expiración
  CASE 
    WHEN v.chofer_id IS NULL AND v.camion_id IS NULL THEN 'Sin chofer ni camión'
    WHEN v.chofer_id IS NULL THEN 'Sin chofer'
    WHEN v.camion_id IS NULL THEN 'Sin camión'
    ELSE 'Otro'
  END AS razon_expiracion,
  
  -- Estados
  v.estado_unidad,
  v.estado_carga,
  
  -- Tiempos
  EXTRACT(EPOCH FROM (v.updated_at - d.scheduled_at))/3600 AS horas_desde_programado,
  EXTRACT(EPOCH FROM (v.updated_at - v.created_at))/3600 AS horas_desde_creacion,
  
  -- Información adicional
  emp_planta.nombre_empresa AS planta_origen,
  cli.nombre_empresa AS cliente_destino,
  d.producto,
  d.cantidad_kg,
  
  -- Empresa transporte (si estaba asignada)
  emp_trans.nombre_empresa AS empresa_transporte
  
FROM viajes_despacho v
JOIN despachos d ON v.despacho_id = d.id
LEFT JOIN empresas emp_planta ON d.empresa_id = emp_planta.id
LEFT JOIN empresas cli ON d.cliente_id = cli.id
LEFT JOIN choferes ch ON v.chofer_id = ch.id
LEFT JOIN empresas emp_trans ON ch.empresa_id = emp_trans.id
WHERE v.estado_unidad = 'expirado'
ORDER BY v.updated_at DESC;

COMMENT ON VIEW vista_viajes_expirados_analytics IS 'Analytics de viajes expirados con métricas de tiempo y clasificación de razones (actualizada para estados duales).';

-- =====================================================
-- 10. DEPRECAR CAMPO ESTADO ANTIGUO (OPCIONAL)
-- =====================================================

-- Renombrar campo antiguo en lugar de eliminarlo (para no romper código existente)
-- Comentar esta línea si querés mantener retrocompatibilidad temporal
-- ALTER TABLE viajes_despacho RENAME COLUMN estado TO estado_legacy;

-- Por ahora solo agregamos comentario de deprecación
COMMENT ON COLUMN viajes_despacho.estado IS '⚠️ DEPRECATED: Usar estado_unidad y estado_carga. Campo mantenido por retrocompatibilidad.';

-- =====================================================
-- 11. PERMISOS RLS (Row Level Security)
-- =====================================================

-- Política: Choferes solo pueden actualizar sus propios estados permitidos
CREATE POLICY viajes_chofer_actualizar_estado_unidad
  ON viajes_despacho
  FOR UPDATE
  USING (
    chofer_id IN (
      SELECT id FROM choferes 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    estado_unidad = ANY(estados_permitidos_chofer())
  );

-- Política: Control acceso puede actualizar estados en sus plantas
CREATE POLICY viajes_control_acceso_actualizar
  ON viajes_despacho
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresa ue
      JOIN despachos d ON viajes_despacho.despacho_id = d.id
      WHERE ue.user_id = auth.uid()
        AND ue.rol_interno = 'control_acceso'
        AND ue.empresa_id = d.empresa_id
    )
  )
  WITH CHECK (
    estado_unidad = ANY(estados_permitidos_control_acceso())
  );

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================

COMMIT;

-- =====================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =====================================================

-- Verificar estados de viajes existentes
SELECT 
  id,
  estado AS estado_legacy,
  estado_unidad,
  estado_carga,
  chofer_id IS NOT NULL AS tiene_chofer,
  camion_id IS NOT NULL AS tiene_camion
FROM viajes_despacho
ORDER BY created_at DESC;

-- Verificar triggers creados
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'viajes_despacho'
  AND trigger_name LIKE 'trigger_auto_%'
ORDER BY trigger_name;

-- Verificar funciones helper
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'estados_%permitidos%'
ORDER BY routine_name;
