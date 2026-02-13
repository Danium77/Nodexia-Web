-- =====================================================
-- MIGRACIÓN 015 V2: Sistema Dual de Estados Definitivo
-- =====================================================
-- Fecha: 2026-01-10
-- Descripción: Implementa sistema dual basado en flujo operativo real:
--   - estado_carga: 17 estados (tracking del producto y documentación)
--   - estado_unidad: 17 estados (tracking físico del camión/chofer)
--   - Tabla incidencias separada (no es estado)
-- 
-- Basado en: Excel "Flujo de Estados" - 10 Ene 2026
-- Patrón: Uber Freight / Amazon Relay
-- =====================================================

BEGIN;

-- =====================================================
-- 1. AGREGAR NUEVAS COLUMNAS A viajes_despacho
-- =====================================================

ALTER TABLE viajes_despacho 
  ADD COLUMN IF NOT EXISTS estado_carga TEXT,
  ADD COLUMN IF NOT EXISTS estado_unidad TEXT;

COMMENT ON COLUMN viajes_despacho.estado_carga IS 'Estado del producto y documentación (17 estados). Refleja el ciclo de vida de la carga.';
COMMENT ON COLUMN viajes_despacho.estado_unidad IS 'Estado físico del camión/chofer (17 estados). Refleja ubicación y operación del vehículo.';

-- =====================================================
-- 2. MIGRAR DATOS EXISTENTES
-- =====================================================

-- Mapear estados antiguos a estados duales según Excel
UPDATE viajes_despacho 
SET 
  estado_carga = CASE 
    WHEN estado = 'pendiente' THEN 'pendiente_asignacion'
    WHEN estado = 'transporte_asignado' THEN 'transporte_asignado'
    WHEN estado = 'en_transito' THEN 'en_transito_destino'
    WHEN estado = 'completado' THEN 'completado'
    WHEN estado = 'cancelado' THEN 'cancelado'
    ELSE 'pendiente_asignacion'
  END,
  estado_unidad = CASE 
    WHEN estado = 'pendiente' THEN NULL  -- Sin unidad asignada
    WHEN estado = 'transporte_asignado' AND camion_id IS NOT NULL THEN 'camion_asignado'
    WHEN estado = 'transporte_asignado' AND camion_id IS NULL THEN NULL
    WHEN estado = 'en_transito' THEN 'en_transito_destino'
    WHEN estado = 'completado' THEN 'completado'
    WHEN estado = 'cancelado' THEN 'cancelado'
    ELSE NULL
  END
WHERE estado_carga IS NULL;

-- =====================================================
-- 3. CONSTRAINTS - ESTADOS DE CARGA (17 estados)
-- =====================================================

ALTER TABLE viajes_despacho
  DROP CONSTRAINT IF EXISTS viajes_despacho_estado_carga_check,
  ADD CONSTRAINT viajes_despacho_estado_carga_check 
  CHECK (estado_carga IN (
    -- FASE 1: PLANIFICACIÓN (Coordinador Planta)
    'pendiente_asignacion',    -- Despacho creado, esperando asignación de transporte
    'transporte_asignado',     -- Transporte asignado por coordinador planta
    
    -- FASE 2: ASIGNACIÓN RECURSOS (Coordinador Transporte)
    'camion_asignado',         -- Camión y chofer asignados
    
    -- FASE 3: TRÁNSITO A ORIGEN (Chofer)
    'en_transito_origen',      -- Chofer viajando hacia planta de carga
    
    -- FASE 4: OPERACIÓN EN ORIGEN (Control Acceso + Supervisor)
    'en_playa_origen',         -- En planta esperando proceso de carga
    'llamado_carga',           -- Supervisor llamó al camión para cargar
    'cargando',                -- Proceso de carga en progreso
    'cargado',                 -- Carga completada
    
    -- FASE 5: EGRESO Y TRÁNSITO (Control Acceso + Chofer)
    'egresado_origen',         -- Control acceso autorizó salida de planta
    'en_transito_destino',     -- Viajando hacia destino
    
    -- FASE 6: OPERACIÓN EN DESTINO (Control Acceso Destino + Supervisor)
    'arribado_destino',        -- Chofer arribó a destino
    'llamado_descarga',        -- Supervisor destino llamó a descarga
    'descargando',             -- Proceso de descarga en progreso
    'entregado',               -- Producto entregado y documentado
    
    -- FASE 7: FINALIZACIÓN (Sistema)
    'disponible',              -- Unidad disponible para nuevo viaje
    
    -- ESTADOS FINALES
    'completado',              -- Viaje completado exitosamente
    'cancelado',               -- Viaje cancelado
    'expirado'                 -- Viaje expirado (sin recursos a tiempo)
  ));

-- =====================================================
-- 4. CONSTRAINTS - ESTADOS DE UNIDAD (17 estados)
-- =====================================================

ALTER TABLE viajes_despacho
  DROP CONSTRAINT IF EXISTS viajes_despacho_estado_unidad_check,
  ADD CONSTRAINT viajes_despacho_estado_unidad_check 
  CHECK (
    estado_unidad IS NULL OR  -- Permitir NULL cuando no hay unidad asignada
    estado_unidad IN (
      -- FASE 1: ASIGNACIÓN
      'camion_asignado',         -- Camión y chofer asignados
      
      -- FASE 2: TRÁNSITO A ORIGEN
      'en_transito_origen',      -- Viajando hacia planta de carga
      
      -- FASE 3: OPERACIÓN EN ORIGEN
      'ingresado_origen',        -- Control acceso registró ingreso
      'en_playa_origen',         -- En playa de espera
      'llamado_carga',           -- Llamado a posición de carga
      'cargando',                -- En proceso de carga
      
      -- FASE 4: EGRESO
      'egreso_origen',           -- Egresando de planta
      
      -- FASE 5: TRÁNSITO A DESTINO
      'en_transito_destino',     -- Viajando a destino
      
      -- FASE 6: OPERACIÓN EN DESTINO
      'arribado_destino',        -- Arribó a destino
      'ingresado_destino',       -- Control acceso destino registró ingreso
      'llamado_descarga',        -- Llamado a descarga
      'descargando',             -- En proceso de descarga
      'vacio',                   -- Camión vacío
      
      -- FASE 7: FINALIZACIÓN (Estado final reutilizable)
      'disponible',              -- ✅ ESTADO FINAL: Disponible para nuevo viaje
      
      -- ESTADOS FINALES NO REUTILIZABLES
      'cancelado',               -- Viaje cancelado (no reutilizable)
      'expirado',                -- Viaje expirado (no reutilizable)
      'incidencia'               -- En proceso de resolución de incidencia
    )
  );

-- NOT NULL solo para estado_carga (siempre debe tener)
-- estado_unidad puede ser NULL si no hay camión asignado
ALTER TABLE viajes_despacho
  ALTER COLUMN estado_carga SET NOT NULL;

-- =====================================================
-- 5. TABLA DE INCIDENCIAS (Separada del flujo de estados)
-- =====================================================

CREATE TABLE IF NOT EXISTS incidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  
  -- Clasificación
  tipo_incidencia TEXT NOT NULL CHECK (tipo_incidencia IN (
    'faltante_carga',          -- Producto faltante en carga/descarga
    'rechazo_carga',           -- Carga rechazada por calidad
    'demora_excesiva',         -- Retraso significativo
    'documentacion_incorrecta',-- Problemas con remito/carta porte
    'averia_camion',           -- Problema mecánico
    'accidente',               -- Accidente de tránsito
    'otro'                     -- Otros casos
  )),
  
  -- Descripción
  titulo TEXT NOT NULL,
  descripcion TEXT,
  
  -- Estado de la incidencia
  estado_incidencia TEXT NOT NULL DEFAULT 'reportada' CHECK (estado_incidencia IN (
    'reportada',               -- Recién reportada
    'en_revision',             -- Siendo analizada
    'en_resolucion',           -- En proceso de resolución
    'resuelta',                -- Resuelta
    'cerrada'                  -- Cerrada (viaje continúa o se cancela)
  )),
  
  -- Severidad
  severidad TEXT NOT NULL DEFAULT 'media' CHECK (severidad IN (
    'baja',                    -- No afecta el viaje
    'media',                   -- Requiere atención
    'alta',                    -- Bloquea el viaje
    'critica'                  -- Requiere cancelación
  )),
  
  -- Impacto en el viaje
  bloquea_viaje BOOLEAN DEFAULT false,
  requiere_cancelacion BOOLEAN DEFAULT false,
  
  -- Actor que reporta
  reportado_por_user_id UUID REFERENCES auth.users(id),
  reportado_por_rol TEXT,  -- 'chofer', 'supervisor', 'control_acceso', etc.
  
  -- Resolución
  resuelto_por_user_id UUID REFERENCES auth.users(id),
  resolucion TEXT,
  fecha_resolucion TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidencias_viaje_id ON incidencias(viaje_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_estado ON incidencias(estado_incidencia);
CREATE INDEX IF NOT EXISTS idx_incidencias_severidad ON incidencias(severidad);
CREATE INDEX IF NOT EXISTS idx_incidencias_fecha ON incidencias(created_at DESC);

COMMENT ON TABLE incidencias IS 'Registro de problemas/incidencias durante viajes. NO afecta el estado del viaje directamente.';

-- =====================================================
-- 6.1 FUNCIÓN PARA OBTENER UNIDADES DISPONIBLES
-- =====================================================

-- Función helper para coordinador de transporte: ver camiones disponibles para asignar
CREATE OR REPLACE FUNCTION obtener_unidades_disponibles()
RETURNS TABLE(
  camion_id UUID,
  chofer_id UUID,
  patente TEXT,
  nombre_chofer TEXT,
  empresa_id UUID,
  ultimo_viaje_completado TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.camion_id,
    v.chofer_id,
    c.patente,
    ch.nombre AS nombre_chofer,
    v.transport_id AS empresa_id,
    MAX(v.updated_at) AS ultimo_viaje_completado
  FROM viajes_despacho v
  JOIN camiones c ON v.camion_id = c.id
  JOIN choferes ch ON v.chofer_id = ch.id
  WHERE v.estado_unidad = 'disponible'
    AND v.camion_id IS NOT NULL
    AND v.chofer_id IS NOT NULL
  GROUP BY v.camion_id, v.chofer_id, c.patente, ch.nombre, v.transport_id
  ORDER BY MAX(v.updated_at) DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION obtener_unidades_disponibles() IS 'Lista camiones+choferes en estado disponible, listos para asignar a nuevo viaje. Para uso del coordinador de transporte.';

-- =====================================================
-- 7. ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_viajes_estado_carga ON viajes_despacho(estado_carga);
CREATE INDEX IF NOT EXISTS idx_viajes_estado_unidad ON viajes_despacho(estado_unidad) WHERE estado_unidad IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_viajes_estados_combinados ON viajes_despacho(estado_carga, estado_unidad);

-- Para tracking activo (viajes con recursos asignados)
CREATE INDEX IF NOT EXISTS idx_viajes_activos 
  ON viajes_despacho(estado_carga, chofer_id, camion_id)
  WHERE chofer_id IS NOT NULL 
    AND camion_id IS NOT NULL
    AND estado_carga NOT IN ('completado', 'cancelado', 'expirado');

-- =====================================================
-- 7. FUNCIONES HELPER POR ROL
-- =====================================================

-- Estados de CARGA permitidos para COORDINADOR PLANTA
CREATE OR REPLACE FUNCTION estados_carga_permitidos_coord_planta()
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY[
    'transporte_asignado',  -- Puede asignar transporte
    'cancelado'             -- Puede cancelar viaje
  ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION estados_carga_permitidos_coord_planta() IS 'Estados de CARGA que coordinador de planta puede modificar.';

-- Estados de CARGA permitidos para COORDINADOR TRANSPORTE
CREATE OR REPLACE FUNCTION estados_carga_permitidos_coord_transporte()
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY[
    'camion_asignado',  -- Asigna camión+chofer
    'cancelado'         -- Puede cancelar si aún no salió
  ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Estados de UNIDAD permitidos para COORDINADOR TRANSPORTE
CREATE OR REPLACE FUNCTION estados_unidad_permitidos_coord_transporte()
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY[
    'camion_asignado',
    'cancelado'
  ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Estados de CARGA permitidos para CHOFER
CREATE OR REPLACE FUNCTION estados_carga_permitidos_chofer()
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY[
    'en_transito_origen',
    'en_transito_destino',
    'arribado_destino'
  ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Estados de UNIDAD permitidos para CHOFER
CREATE OR REPLACE FUNCTION estados_unidad_permitidos_chofer()
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY[
    'en_transito_origen',
    'arribado_destino',
    'en_transito_destino'
  ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Estados de CARGA permitidos para CONTROL ACCESO
CREATE OR REPLACE FUNCTION estados_carga_permitidos_control_acceso()
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY[
    'en_playa_origen',
    'egresado_origen'
  ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Estados de UNIDAD permitidos para CONTROL ACCESO
CREATE OR REPLACE FUNCTION estados_unidad_permitidos_control_acceso()
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY[
    'ingresado_origen',
    'en_playa_origen',
    'egreso_origen',
    'ingresado_destino'
  ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Estados de CARGA permitidos para SUPERVISOR CARGA
CREATE OR REPLACE FUNCTION estados_carga_permitidos_supervisor()
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY[
    'llamado_carga',
    'cargando',
    'cargado',
    'llamado_descarga',
    'descargando',
    'entregado'
  ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Estados de UNIDAD permitidos para SUPERVISOR CARGA
CREATE OR REPLACE FUNCTION estados_unidad_permitidos_supervisor()
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY[
    'llamado_carga',
    'cargando',
    'llamado_descarga',
    'descargando',
    'vacio'
  ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 8. TRIGGERS DE TRANSICIÓN AUTOMÁTICA
-- =====================================================

-- Trigger: Cuando se asigna camión → estado_unidad = 'camion_asignado'
CREATE OR REPLACE FUNCTION auto_asignar_camion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.camion_id IS NOT NULL 
     AND NEW.chofer_id IS NOT NULL 
     AND OLD.camion_id IS NULL 
  THEN
    NEW.estado_unidad := 'camion_asignado';
    NEW.estado_carga := 'camion_asignado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_asignar_camion ON viajes_despacho;
CREATE TRIGGER trigger_auto_asignar_camion
  BEFORE UPDATE ON viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION auto_asignar_camion();

-- Trigger: Sincronizar estados de carga y unidad durante operaciones
CREATE OR REPLACE FUNCTION sync_estados_carga_unidad()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando CARGA pasa a "llamado_carga" → UNIDAD también
  IF NEW.estado_carga = 'llamado_carga' AND OLD.estado_carga != 'llamado_carga' THEN
    NEW.estado_unidad := 'llamado_carga';
  END IF;
  
  -- Cuando CARGA pasa a "cargando" → UNIDAD también
  IF NEW.estado_carga = 'cargando' AND OLD.estado_carga != 'cargando' THEN
    NEW.estado_unidad := 'cargando';
  END IF;
  
  -- Cuando CARGA pasa a "en_transito_destino" → UNIDAD también
  IF NEW.estado_carga = 'en_transito_destino' AND OLD.estado_carga != 'en_transito_destino' THEN
    NEW.estado_unidad := 'en_transito_destino';
  END IF;
  
  -- Cuando CARGA pasa a "llamado_descarga" → UNIDAD también
  IF NEW.estado_carga = 'llamado_descarga' AND OLD.estado_carga != 'llamado_descarga' THEN
    NEW.estado_unidad := 'llamado_descarga';
  END IF;
  
  -- Cuando CARGA pasa a "descargando" → UNIDAD también
  IF NEW.estado_carga = 'descargando' AND OLD.estado_carga != 'descargando' THEN
    NEW.estado_unidad := 'descargando';
  END IF;
  
  -- Cuando UNIDAD pasa a "vacio" → CARGA pasa a "disponible" y UNIDAD también
  IF NEW.estado_unidad = 'vacio' AND OLD.estado_unidad != 'vacio' THEN
    NEW.estado_carga := 'disponible';
    NEW.estado_unidad := 'disponible';  -- Unidad queda disponible para reasignación
  END IF;
  
  -- Cuando CARGA pasa a "disponible" → Solo CARGA pasa a "completado"
  -- UNIDAD queda "disponible" para que coordinador pueda reasignarla a nuevo viaje
  IF NEW.estado_carga = 'disponible' AND OLD.estado_carga != 'disponible' THEN
    NEW.estado_carga := 'completado';  -- Carga finalizada
    -- NEW.estado_unidad mantiene 'disponible' (NO cambia)
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_estados ON viajes_despacho;
CREATE TRIGGER trigger_sync_estados
  BEFORE UPDATE ON viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION sync_estados_carga_unidad();

-- =====================================================
-- 9. FUNCIÓN DE EXPIRACIÓN ACTUALIZADA
-- =====================================================

-- Primero eliminar función existente (puede tener firma diferente)
DROP FUNCTION IF EXISTS marcar_viajes_expirados();

-- Crear función con nueva firma
CREATE OR REPLACE FUNCTION marcar_viajes_expirados()
RETURNS TABLE(
  viaje_id UUID,
  pedido_id TEXT,
  razon_expiracion TEXT,
  estado_anterior_carga TEXT,
  estado_anterior_unidad TEXT
) AS $$
BEGIN
  RETURN QUERY
  UPDATE viajes_despacho v
  SET 
    estado_carga = 'expirado',
    estado_unidad = COALESCE(estado_unidad, 'expirado'),
    estado = 'expirado', -- Actualizar también campo legacy para retrocompatibilidad
    updated_at = NOW()
  FROM despachos d
  WHERE v.despacho_id = d.id
    AND d.scheduled_at < NOW() -- Fecha programada pasó
    AND (v.chofer_id IS NULL OR v.camion_id IS NULL) -- Sin recursos asignados
    AND v.estado_carga NOT IN ('expirado', 'completado', 'cancelado') -- Excluir estados finales
  RETURNING 
    v.id AS viaje_id,
    d.pedido_id,
    CASE 
      WHEN v.chofer_id IS NULL AND v.camion_id IS NULL THEN 'Sin chofer ni camión asignado'
      WHEN v.chofer_id IS NULL THEN 'Sin chofer asignado'
      WHEN v.camion_id IS NULL THEN 'Sin camión asignado'
    END AS razon_expiracion,
    v.estado_carga AS estado_anterior_carga,
    v.estado_unidad AS estado_anterior_unidad;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION marcar_viajes_expirados() IS 'Marca viajes como expirados si pasó la fecha y no tienen recursos. Actualiza ambos estados.';

-- =====================================================
-- 10. VISTAS CONSOLIDADAS
-- =====================================================

-- Vista principal de viajes con estados
CREATE OR REPLACE VIEW vista_viajes_estados AS
SELECT 
  v.id,
  v.despacho_id,
  d.pedido_id,
  
  -- Estados actuales
  v.estado_carga,
  v.estado_unidad,
  v.estado AS estado_legacy,
  
  -- Recursos
  c.patente AS camion_patente,
  ch.nombre AS chofer_nombre,
  emp.nombre AS empresa_transporte,
  
  -- Clasificación
  CASE 
    WHEN v.estado_carga IN ('completado', 'cancelado', 'expirado') THEN 'finalizado'
    WHEN v.estado_carga IN ('en_transito_origen', 'en_transito_destino') THEN 'en_transito'
    WHEN v.estado_carga IN ('cargando', 'descargando') THEN 'operacion_activa'
    WHEN v.estado_carga IN ('pendiente_asignacion', 'transporte_asignado', 'camion_asignado') THEN 'planificacion'
    ELSE 'otros'
  END AS categoria_estado,
  
  -- Flags
  (v.estado_carga = 'expirado') AS es_expirado,
  (v.estado_carga IN ('completado', 'cancelado', 'expirado')) AS es_final,
  (v.chofer_id IS NOT NULL AND v.camion_id IS NOT NULL) AS tiene_recursos,
  
  -- Incidencias activas
  (SELECT COUNT(*) FROM incidencias i 
   WHERE i.viaje_id = v.id 
     AND i.estado_incidencia NOT IN ('resuelta', 'cerrada')) AS incidencias_activas,
  
  -- Fechas
  d.scheduled_at AS fecha_programada,
  v.created_at,
  v.updated_at
  
FROM viajes_despacho v
JOIN despachos d ON v.despacho_id = d.id
LEFT JOIN camiones c ON v.camion_id = c.id
LEFT JOIN choferes ch ON v.chofer_id = ch.id
LEFT JOIN empresas emp ON v.transport_id = emp.id;

COMMENT ON VIEW vista_viajes_estados IS 'Vista consolidada de viajes con estados duales, recursos e incidencias.';

-- Vista de viajes expirados (SIMPLIFICADA - solo campos existentes)
CREATE OR REPLACE VIEW vista_viajes_expirados_analytics AS
SELECT 
  v.id,
  d.pedido_id,
  d.scheduled_at AS fecha_programada,
  v.created_at AS fecha_creacion,
  v.updated_at AS fecha_expiracion,
  
  -- Razón
  CASE 
    WHEN v.chofer_id IS NULL AND v.camion_id IS NULL THEN 'Sin chofer ni camión'
    WHEN v.chofer_id IS NULL THEN 'Sin chofer'
    WHEN v.camion_id IS NULL THEN 'Sin camión'
    ELSE 'Otro'
  END AS razon_expiracion,
  
  -- Estados
  v.estado_carga,
  v.estado_unidad,
  
  -- Tiempos
  EXTRACT(EPOCH FROM (v.updated_at - d.scheduled_at))/3600 AS horas_desde_programado,
  
  -- Info básica (campos que existen en despachos)
  d.origen,
  d.destino,
  d.type,
  d.prioridad
  
FROM viajes_despacho v
JOIN despachos d ON v.despacho_id = d.id
WHERE v.estado_carga = 'expirado'
ORDER BY v.updated_at DESC;

-- =====================================================
-- 11. DEPRECAR CAMPO ESTADO ANTIGUO
-- =====================================================

COMMENT ON COLUMN viajes_despacho.estado IS '⚠️ DEPRECATED: Usar estado_carga y estado_unidad. Mantenido por retrocompatibilidad temporal.';

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================

COMMIT;

-- =====================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =====================================================

-- 1. Verificar columnas nuevas
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'viajes_despacho'
  AND column_name IN ('estado_carga', 'estado_unidad')
ORDER BY column_name;

-- 2. Ver migración de viajes existentes
SELECT 
  id,
  estado AS legacy,
  estado_carga,
  estado_unidad,
  chofer_id IS NOT NULL AS tiene_chofer,
  camion_id IS NOT NULL AS tiene_camion
FROM viajes_despacho
ORDER BY created_at DESC;

-- 3. Verificar tabla incidencias
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_name = 'incidencias';

-- 4. Verificar funciones helper
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%permitidos%'
ORDER BY routine_name;

-- 5. Verificar triggers
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'viajes_despacho'
ORDER BY trigger_name;
