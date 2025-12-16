-- =====================================================
-- MIGRACIÓN 011: SISTEMA DE ESTADOS DUALES
-- =====================================================
-- Fecha: 23 Nov 2025
-- Descripción: Implementa estados separados para UNIDAD y CARGA
-- Incluye: GPS Tracking, Notificaciones, Cancelaciones
-- 20 Estados de Unidad + 17 Estados de Carga
-- =====================================================

-- =====================================================
-- PASO 0: LIMPIEZA DE OBJETOS EXISTENTES
-- =====================================================

-- Eliminar vistas que puedan causar conflicto
DROP VIEW IF EXISTS vista_estado_viaje_completo CASCADE;

-- Eliminar tablas existentes (esto también elimina policies y triggers)
DROP TABLE IF EXISTS estado_unidad_viaje CASCADE;
DROP TABLE IF EXISTS estado_carga_viaje CASCADE;
DROP TABLE IF EXISTS historial_ubicaciones CASCADE;
DROP TABLE IF EXISTS notificaciones CASCADE;

-- Eliminar funciones existentes
DROP FUNCTION IF EXISTS crear_estados_viaje_automatico() CASCADE;
DROP FUNCTION IF EXISTS actualizar_updated_at() CASCADE;
DROP FUNCTION IF EXISTS registrar_cambio_estado_unidad() CASCADE;
DROP FUNCTION IF EXISTS registrar_cambio_estado_carga() CASCADE;
DROP FUNCTION IF EXISTS enviar_notificacion(UUID, TEXT, TEXT, TEXT, UUID, UUID, JSONB) CASCADE;

DO $$ 
BEGIN
    RAISE NOTICE '✅ Limpieza completada - Listo para migración';
END $$;

-- =====================================================
-- PASO 1: Agregar user_id a tabla choferes
-- =====================================================

-- Agregar campo user_id para vincular chofer con usuario
ALTER TABLE choferes 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Índice para búsquedas rápidas por usuario
CREATE INDEX IF NOT EXISTS idx_choferes_user_id ON choferes(user_id);

-- Constraint: Un usuario solo puede ser chofer de una empresa (no puede tener múltiples registros)
CREATE UNIQUE INDEX IF NOT EXISTS idx_choferes_user_id_unico 
ON choferes(user_id) 
WHERE user_id IS NOT NULL;

COMMENT ON COLUMN choferes.user_id IS 'Vincula el chofer con su cuenta de usuario para acceso a la app móvil';

-- =====================================================
-- PASO 1.5: Verificar columnas necesarias en viajes_despacho
-- =====================================================

-- Agregar columnas sin foreign keys primero (por si las tablas referenciadas no existen aún)
DO $$ 
BEGIN
    -- Agregar transport_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'viajes_despacho' AND column_name = 'transport_id'
    ) THEN
        ALTER TABLE viajes_despacho ADD COLUMN transport_id UUID;
    END IF;

    -- Agregar camion_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'viajes_despacho' AND column_name = 'camion_id'
    ) THEN
        ALTER TABLE viajes_despacho ADD COLUMN camion_id UUID;
    END IF;

    -- Agregar acoplado_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'viajes_despacho' AND column_name = 'acoplado_id'
    ) THEN
        ALTER TABLE viajes_despacho ADD COLUMN acoplado_id UUID;
    END IF;

    -- Agregar chofer_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'viajes_despacho' AND column_name = 'chofer_id'
    ) THEN
        ALTER TABLE viajes_despacho ADD COLUMN chofer_id UUID;
    END IF;
END $$;

-- Índices para búsquedas (solo si no existen)
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_transport_id ON viajes_despacho(transport_id);
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_camion_id ON viajes_despacho(camion_id);
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_acoplado_id ON viajes_despacho(acoplado_id);
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_chofer_id ON viajes_despacho(chofer_id);

-- =====================================================
-- PASO 2: Crear tabla estado_unidad_viaje
-- =====================================================

CREATE TABLE IF NOT EXISTS estado_unidad_viaje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id UUID NOT NULL UNIQUE REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  
  -- Estado actual de la unidad (chofer + camión) - 20 ESTADOS
  estado_unidad TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado_unidad IN (
    'pendiente',              -- Viaje creado, sin transporte asignado
    'asignado',               -- Transporte asignado, esperando confirmación chofer
    'confirmado_chofer',      -- Chofer confirmó el viaje
    'en_transito_origen',     -- En camino a planta de carga
    'arribo_origen',          -- Chofer reporta llegada
    'ingreso_planta',         -- Control Acceso registra ingreso físico
    'en_playa_espera',        -- En playa esperando llamado
    'en_proceso_carga',       -- 🤖 AUTO: Supervisor inicia carga
    'cargado',                -- 🤖 AUTO: Carga completada (trigger)
    'egreso_planta',          -- 🤖 AUTO: Listo para salir (trigger)
    'en_transito_destino',    -- En camino a destino
    'arribo_destino',         -- Chofer reporta llegada a destino
    'ingreso_destino',        -- Control Acceso destino registra ingreso
    'llamado_descarga',       -- Operador llama a descarga
    'en_descarga',            -- 🤖 AUTO: Descarga en progreso (trigger)
    'vacio',                  -- Operador confirma camión vacío
    'egreso_destino',         -- Control Acceso destino registra egreso
    'disponible_carga',       -- 🤖 AUTO: Unidad lista para nuevo viaje (trigger)
    'viaje_completado',       -- Viaje cerrado
    'cancelado'               -- Viaje cancelado
  )),
  
  -- Timestamps de cada transición de estado
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_asignacion TIMESTAMPTZ,
  fecha_confirmacion_chofer TIMESTAMPTZ,
  fecha_inicio_transito_origen TIMESTAMPTZ,
  fecha_arribo_origen TIMESTAMPTZ,
  fecha_ingreso_planta TIMESTAMPTZ,
  fecha_ingreso_playa TIMESTAMPTZ,
  fecha_inicio_proceso_carga TIMESTAMPTZ,
  fecha_cargado TIMESTAMPTZ,
  fecha_egreso_planta TIMESTAMPTZ,
  fecha_inicio_transito_destino TIMESTAMPTZ,
  fecha_arribo_destino TIMESTAMPTZ,
  fecha_ingreso_destino TIMESTAMPTZ,
  fecha_llamado_descarga TIMESTAMPTZ,
  fecha_inicio_descarga TIMESTAMPTZ,
  fecha_vacio TIMESTAMPTZ,
  fecha_egreso_destino TIMESTAMPTZ,
  fecha_disponible_carga TIMESTAMPTZ,
  fecha_viaje_completado TIMESTAMPTZ,
  fecha_cancelacion TIMESTAMPTZ,
  
  -- Ubicación actual (GPS)
  ubicacion_actual_lat DECIMAL(10,8),
  ubicacion_actual_lon DECIMAL(11,8),
  ultima_actualizacion_gps TIMESTAMPTZ,
  velocidad_actual_kmh DECIMAL(5,2),
  
  -- Información de cancelación
  cancelado_por UUID REFERENCES auth.users(id),
  motivo_cancelacion TEXT,
  
  -- Observaciones de la unidad
  observaciones_unidad TEXT,
  
  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_estado_unidad_viaje_id ON estado_unidad_viaje(viaje_id);
CREATE INDEX IF NOT EXISTS idx_estado_unidad_estado ON estado_unidad_viaje(estado_unidad);
CREATE INDEX IF NOT EXISTS idx_estado_unidad_gps ON estado_unidad_viaje(ubicacion_actual_lat, ubicacion_actual_lon);
CREATE INDEX IF NOT EXISTS idx_estado_unidad_ultima_actualizacion ON estado_unidad_viaje(ultima_actualizacion_gps DESC);

COMMENT ON TABLE estado_unidad_viaje IS 'Estados del tracking logístico de la unidad (chofer + camión)';

-- =====================================================
-- PASO 3: Crear tabla estado_carga_viaje
-- =====================================================

CREATE TABLE IF NOT EXISTS estado_carga_viaje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id UUID NOT NULL UNIQUE REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  
  -- Estado actual de la carga (producto + documentación) - 17 ESTADOS
  estado_carga TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado_carga IN (
    'pendiente',                 -- Viaje creado, sin planificación
    'planificado',               -- Producto y cantidades definidas
    'documentacion_preparada',   -- 🤖 AUTO: Docs listos (trigger)
    'llamado_carga',             -- Supervisor llama al camión
    'posicionado_carga',         -- Camión posicionado en bay de carga
    'iniciando_carga',           -- Supervisor inicia proceso de carga
    'cargando',                  -- Carga en progreso (Supervisor)
    'carga_completada',          -- Producto cargado en camión
    'documentacion_validada',    -- Control Acceso validó docs de salida
    'en_transito',               -- 🤖 AUTO: Producto en tránsito (trigger)
    'arribado_destino',          -- 🤖 AUTO: Llegó a destino (trigger)
    'iniciando_descarga',        -- Operador inicia descarga
    'descargando',               -- Descarga en progreso
    'descargado',                -- Producto descargado completamente
    'entregado',                 -- Documentación firmada y entregada
    'con_faltante',              -- Entregado con faltante
    'con_rechazo',               -- Producto rechazado
    'cancelado'                  -- Cancelado
  )),
  
  -- Timestamps de cada transición
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_planificacion TIMESTAMPTZ,
  fecha_documentacion_preparada TIMESTAMPTZ,
  fecha_llamado_carga TIMESTAMPTZ,
  fecha_posicionado_carga TIMESTAMPTZ,
  fecha_iniciando_carga TIMESTAMPTZ,
  fecha_cargando TIMESTAMPTZ,
  fecha_carga_completada TIMESTAMPTZ,
  fecha_documentacion_validada TIMESTAMPTZ,
  fecha_en_transito TIMESTAMPTZ,
  fecha_arribado_destino TIMESTAMPTZ,
  fecha_iniciando_descarga TIMESTAMPTZ,
  fecha_descargando TIMESTAMPTZ,
  fecha_descargado TIMESTAMPTZ,
  fecha_entregado TIMESTAMPTZ,
  fecha_cancelacion TIMESTAMPTZ,
  
  -- Datos de la carga
  producto TEXT,
  peso_estimado_kg DECIMAL(10,2),
  peso_real_kg DECIMAL(10,2),
  cantidad_bultos INTEGER,
  temperatura_carga DECIMAL(5,2),
  
  -- Documentación
  remito_numero TEXT,
  remito_url TEXT,
  carta_porte_url TEXT,
  certificado_calidad_url TEXT,
  documentacion_adicional JSONB DEFAULT '[]'::jsonb,
  
  -- Control de faltantes/rechazos
  tiene_faltante BOOLEAN DEFAULT FALSE,
  detalle_faltante TEXT,
  peso_faltante_kg DECIMAL(10,2),
  tiene_rechazo BOOLEAN DEFAULT FALSE,
  detalle_rechazo TEXT,
  
  -- Información de cancelación
  cancelado_por UUID REFERENCES auth.users(id),
  motivo_cancelacion TEXT,
  
  -- Observaciones de la carga
  observaciones_carga TEXT,
  
  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_estado_carga_viaje_id ON estado_carga_viaje(viaje_id);
CREATE INDEX IF NOT EXISTS idx_estado_carga_estado ON estado_carga_viaje(estado_carga);
CREATE INDEX IF NOT EXISTS idx_estado_carga_producto ON estado_carga_viaje(producto);

COMMENT ON TABLE estado_carga_viaje IS 'Estados del tracking operativo de la carga (producto + documentación)';

-- =====================================================
-- PASO 4: Crear tabla historial_ubicaciones
-- =====================================================

CREATE TABLE IF NOT EXISTS historial_ubicaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  chofer_id UUID REFERENCES choferes(id) ON DELETE SET NULL,
  
  -- Ubicación GPS
  latitud DECIMAL(10,8) NOT NULL,
  longitud DECIMAL(11,8) NOT NULL,
  precision_metros DECIMAL(6,2),
  altitud_metros DECIMAL(7,2),
  
  -- Datos del movimiento
  velocidad_kmh DECIMAL(5,2),
  rumbo_grados DECIMAL(5,2), -- 0-360 grados
  
  -- Estado en ese momento
  estado_unidad_momento TEXT,
  
  -- Timestamp
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadatos del dispositivo
  dispositivo_info JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_historial_ubicaciones_viaje ON historial_ubicaciones(viaje_id, fecha_registro DESC);
CREATE INDEX IF NOT EXISTS idx_historial_ubicaciones_chofer ON historial_ubicaciones(chofer_id, fecha_registro DESC);
CREATE INDEX IF NOT EXISTS idx_historial_ubicaciones_fecha ON historial_ubicaciones(fecha_registro DESC);

-- Índice GIS para búsquedas geográficas (si se necesita búsqueda por área)
-- CREATE INDEX IF NOT EXISTS idx_historial_ubicaciones_geo ON historial_ubicaciones USING GIST (
--   ll_to_earth(latitud, longitud)
-- );

COMMENT ON TABLE historial_ubicaciones IS 'Historial de ubicaciones GPS de choferes durante viajes';

-- =====================================================
-- PASO 5: Crear tabla notificaciones
-- =====================================================

CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Destinatario
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tipo de notificación
  tipo TEXT NOT NULL CHECK (tipo IN (
    'viaje_asignado',
    'llamado_carga',
    'viaje_cancelado',
    'incidencia_reportada',
    'demora_detectada',
    'documentacion_rechazada',
    'viaje_completado',
    'otro'
  )),
  
  -- Contenido
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  datos_adicionales JSONB DEFAULT '{}'::jsonb,
  
  -- Vinculación
  viaje_id UUID REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  despacho_id UUID REFERENCES despachos(id) ON DELETE CASCADE,
  
  -- Estado
  leida BOOLEAN DEFAULT FALSE,
  fecha_lectura TIMESTAMPTZ,
  
  -- Push notification
  enviada_push BOOLEAN DEFAULT FALSE,
  fecha_envio_push TIMESTAMPTZ,
  token_fcm TEXT, -- Token de Firebase Cloud Messaging
  
  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notificaciones_user ON notificaciones(user_id, leida, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_viaje ON notificaciones(viaje_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_tipo ON notificaciones(tipo);
CREATE INDEX IF NOT EXISTS idx_notificaciones_no_leidas ON notificaciones(user_id) WHERE leida = FALSE;

COMMENT ON TABLE notificaciones IS 'Sistema de notificaciones in-app y push para usuarios';

-- =====================================================
-- PASO 6: Función para crear estados automáticamente
-- =====================================================

CREATE OR REPLACE FUNCTION crear_estados_viaje_automatico()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear registro de estado UNIDAD
  INSERT INTO estado_unidad_viaje (
    viaje_id,
    estado_unidad,
    fecha_creacion
  ) VALUES (
    NEW.id,
    'pendiente',
    NOW()
  );
  
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
$$ LANGUAGE plpgsql;

-- Trigger: Crear estados al crear viaje
DROP TRIGGER IF EXISTS trigger_crear_estados_viaje ON viajes_despacho;
CREATE TRIGGER trigger_crear_estados_viaje
AFTER INSERT ON viajes_despacho
FOR EACH ROW
EXECUTE FUNCTION crear_estados_viaje_automatico();

COMMENT ON FUNCTION crear_estados_viaje_automatico IS 
'Crea automáticamente registros en estado_unidad_viaje y estado_carga_viaje al crear un viaje';

-- =====================================================
-- PASO 7: Función para actualizar timestamp updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_actualizar_estado_unidad_updated_at ON estado_unidad_viaje;
CREATE TRIGGER trigger_actualizar_estado_unidad_updated_at
BEFORE UPDATE ON estado_unidad_viaje
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_actualizar_estado_carga_updated_at ON estado_carga_viaje;
CREATE TRIGGER trigger_actualizar_estado_carga_updated_at
BEFORE UPDATE ON estado_carga_viaje
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

-- =====================================================
-- PASO 8: Función para registrar cambios de estado UNIDAD
-- =====================================================

CREATE OR REPLACE FUNCTION registrar_cambio_estado_unidad()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo registrar si el estado cambió
  IF OLD.estado_unidad IS DISTINCT FROM NEW.estado_unidad THEN
    
    -- Actualizar timestamp correspondiente
    CASE NEW.estado_unidad
      WHEN 'asignado' THEN
        NEW.fecha_asignacion = NOW();
      WHEN 'confirmado_chofer' THEN
        NEW.fecha_confirmacion_chofer = NOW();
      WHEN 'en_transito_origen' THEN
        NEW.fecha_inicio_transito_origen = NOW();
      WHEN 'arribo_origen' THEN
        NEW.fecha_arribo_origen = NOW();
      WHEN 'ingreso_planta' THEN
        NEW.fecha_ingreso_planta = NOW();
      WHEN 'en_playa_espera' THEN
        NEW.fecha_ingreso_playa = NOW();
      WHEN 'en_proceso_carga' THEN
        NEW.fecha_inicio_proceso_carga = NOW();
      WHEN 'cargado' THEN
        NEW.fecha_cargado = NOW();
      WHEN 'egreso_planta' THEN
        NEW.fecha_egreso_planta = NOW();
      WHEN 'en_transito_destino' THEN
        NEW.fecha_inicio_transito_destino = NOW();
      WHEN 'arribo_destino' THEN
        NEW.fecha_arribo_destino = NOW();
      WHEN 'ingreso_destino' THEN
        NEW.fecha_ingreso_destino = NOW();
      WHEN 'llamado_descarga' THEN
        NEW.fecha_llamado_descarga = NOW();
      WHEN 'en_descarga' THEN
        NEW.fecha_inicio_descarga = NOW();
      WHEN 'vacio' THEN
        NEW.fecha_vacio = NOW();
      WHEN 'egreso_destino' THEN
        NEW.fecha_egreso_destino = NOW();
      WHEN 'disponible_carga' THEN
        NEW.fecha_disponible_carga = NOW();
      WHEN 'viaje_completado' THEN
        NEW.fecha_viaje_completado = NOW();
      WHEN 'cancelado' THEN
        NEW.fecha_cancelacion = NOW();
      ELSE
        NULL;
    END CASE;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_registrar_cambio_estado_unidad ON estado_unidad_viaje;
CREATE TRIGGER trigger_registrar_cambio_estado_unidad
BEFORE UPDATE ON estado_unidad_viaje
FOR EACH ROW
EXECUTE FUNCTION registrar_cambio_estado_unidad();

-- =====================================================
-- PASO 9: Función para registrar cambios de estado CARGA
-- =====================================================

CREATE OR REPLACE FUNCTION registrar_cambio_estado_carga()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo registrar si el estado cambió
  IF OLD.estado_carga IS DISTINCT FROM NEW.estado_carga THEN
    
    -- Actualizar timestamp correspondiente
    CASE NEW.estado_carga
      WHEN 'planificado' THEN
        NEW.fecha_planificacion = NOW();
      WHEN 'documentacion_preparada' THEN
        NEW.fecha_documentacion_preparada = NOW();
      WHEN 'llamado_carga' THEN
        NEW.fecha_llamado_carga = NOW();
      WHEN 'posicionado_carga' THEN
        NEW.fecha_posicionado_carga = NOW();
      WHEN 'iniciando_carga' THEN
        NEW.fecha_iniciando_carga = NOW();
      WHEN 'cargando' THEN
        NEW.fecha_cargando = NOW();
      WHEN 'carga_completada' THEN
        NEW.fecha_carga_completada = NOW();
      WHEN 'documentacion_validada' THEN
        NEW.fecha_documentacion_validada = NOW();
      WHEN 'en_transito' THEN
        NEW.fecha_en_transito = NOW();
      WHEN 'arribado_destino' THEN
        NEW.fecha_arribado_destino = NOW();
      WHEN 'iniciando_descarga' THEN
        NEW.fecha_iniciando_descarga = NOW();
      WHEN 'descargando' THEN
        NEW.fecha_descargando = NOW();
      WHEN 'descargado' THEN
        NEW.fecha_descargado = NOW();
      WHEN 'entregado' THEN
        NEW.fecha_entregado = NOW();
      WHEN 'cancelado' THEN
        NEW.fecha_cancelacion = NOW();
      ELSE
        NULL;
    END CASE;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_registrar_cambio_estado_carga ON estado_carga_viaje;
CREATE TRIGGER trigger_registrar_cambio_estado_carga
BEFORE UPDATE ON estado_carga_viaje
FOR EACH ROW
EXECUTE FUNCTION registrar_cambio_estado_carga();

-- =====================================================
-- PASO 10: Vista unificada de estados
-- =====================================================

CREATE OR REPLACE VIEW vista_estado_viaje_completo AS
SELECT 
  vd.id as viaje_id,
  vd.despacho_id,
  vd.numero_viaje,
  d.id as numero_despacho,
  
  -- ESTADO UNIDAD
  eu.estado_unidad,
  eu.fecha_asignacion,
  eu.fecha_confirmacion_chofer,
  eu.fecha_arribo_origen,
  ec.fecha_carga_completada as fecha_unidad_carga_ok,
  eu.fecha_egreso_planta,
  eu.fecha_arribo_destino,
  eu.fecha_viaje_completado,
  eu.ubicacion_actual_lat,
  eu.ubicacion_actual_lon,
  eu.ultima_actualizacion_gps,
  eu.velocidad_actual_kmh,
  eu.observaciones_unidad,
  
  -- ESTADO CARGA
  ec.estado_carga,
  ec.fecha_planificacion,
  ec.fecha_documentacion_preparada,
  ec.fecha_carga_completada as fecha_carga_producto_ok,
  ec.fecha_documentacion_validada,
  ec.fecha_descargado,
  ec.fecha_entregado,
  ec.producto,
  ec.peso_estimado_kg,
  ec.peso_real_kg,
  ec.remito_numero,
  ec.tiene_faltante,
  ec.tiene_rechazo,
  ec.observaciones_carga,
  
  -- DATOS RELACIONADOS
  emp_trans.nombre as transporte_nombre,
  c.patente as camion_patente,
  c.marca as camion_marca,
  c.modelo as camion_modelo,
  a.patente as acoplado_patente,
  ch.nombre || ' ' || ch.apellido as chofer_nombre,
  ch.telefono as chofer_telefono,
  ch.user_id as chofer_user_id,
  
  -- TIEMPO EN PLANTA (calculado)
  CASE 
    WHEN eu.fecha_egreso_planta IS NOT NULL AND eu.fecha_arribo_origen IS NOT NULL
    THEN EXTRACT(EPOCH FROM (eu.fecha_egreso_planta - eu.fecha_arribo_origen))/3600
    ELSE NULL
  END as horas_en_planta,
  
  -- TIEMPO DE CARGA (calculado)
  CASE 
    WHEN ec.fecha_carga_completada IS NOT NULL AND ec.fecha_iniciando_carga IS NOT NULL
    THEN EXTRACT(EPOCH FROM (ec.fecha_carga_completada - ec.fecha_iniciando_carga))/60
    ELSE NULL
  END as minutos_de_carga,
  
  vd.created_at,
  vd.updated_at

FROM viajes_despacho vd
LEFT JOIN estado_unidad_viaje eu ON eu.viaje_id = vd.id
LEFT JOIN estado_carga_viaje ec ON ec.viaje_id = vd.id
LEFT JOIN despachos d ON d.id = vd.despacho_id
LEFT JOIN empresas emp_trans ON emp_trans.id = vd.transport_id
LEFT JOIN camiones c ON c.id = vd.camion_id
LEFT JOIN acoplados a ON a.id = vd.acoplado_id
LEFT JOIN choferes ch ON ch.id = vd.chofer_id;

COMMENT ON VIEW vista_estado_viaje_completo IS 
'Vista unificada con estados de UNIDAD y CARGA para dashboards y reportes';

-- =====================================================
-- PASO 11: RLS Policies
-- =====================================================

-- Habilitar RLS
ALTER TABLE estado_unidad_viaje ENABLE ROW LEVEL SECURITY;
ALTER TABLE estado_carga_viaje ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_ubicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Policies para estado_unidad_viaje
DROP POLICY IF EXISTS "Usuarios pueden ver estado unidad de sus viajes" ON estado_unidad_viaje;
CREATE POLICY "Usuarios pueden ver estado unidad de sus viajes"
ON estado_unidad_viaje
FOR SELECT
USING (
  auth.uid() IN (
    SELECT ue.user_id 
    FROM usuarios_empresa ue
    INNER JOIN viajes_despacho vd ON vd.id = estado_unidad_viaje.viaje_id
    WHERE ue.empresa_id = vd.transport_id
  )
  OR
  auth.uid() IN (
    SELECT ch.user_id
    FROM choferes ch
    INNER JOIN viajes_despacho vd ON vd.chofer_id = ch.id
    WHERE vd.id = estado_unidad_viaje.viaje_id
      AND ch.user_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Choferes pueden actualizar estado unidad" ON estado_unidad_viaje;
CREATE POLICY "Choferes pueden actualizar estado unidad"
ON estado_unidad_viaje
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT ch.user_id
    FROM choferes ch
    INNER JOIN viajes_despacho vd ON vd.chofer_id = ch.id
    WHERE vd.id = estado_unidad_viaje.viaje_id
      AND ch.user_id IS NOT NULL
  )
);

-- Policies para estado_carga_viaje
DROP POLICY IF EXISTS "Usuarios pueden ver estado carga de sus viajes" ON estado_carga_viaje;
CREATE POLICY "Usuarios pueden ver estado carga de sus viajes"
ON estado_carga_viaje
FOR SELECT
USING (
  auth.uid() IN (
    SELECT ue.user_id 
    FROM usuarios_empresa ue
    INNER JOIN viajes_despacho vd ON vd.id = estado_carga_viaje.viaje_id
    WHERE ue.empresa_id = vd.transport_id
  )
);

-- Policies para historial_ubicaciones
DROP POLICY IF EXISTS "Solo choferes y admin pueden insertar ubicaciones" ON historial_ubicaciones;
CREATE POLICY "Solo choferes y admin pueden insertar ubicaciones"
ON historial_ubicaciones
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT ch.user_id
    FROM choferes ch
    WHERE ch.id = historial_ubicaciones.chofer_id
      AND ch.user_id IS NOT NULL
  )
  OR
  auth.role() = 'service_role'
);

DROP POLICY IF EXISTS "Usuarios pueden ver ubicaciones de sus viajes" ON historial_ubicaciones;
CREATE POLICY "Usuarios pueden ver ubicaciones de sus viajes"
ON historial_ubicaciones
FOR SELECT
USING (
  auth.uid() IN (
    SELECT ue.user_id 
    FROM usuarios_empresa ue
    INNER JOIN viajes_despacho vd ON vd.id = historial_ubicaciones.viaje_id
    WHERE ue.empresa_id = vd.transport_id
  )
  OR
  auth.uid() IN (
    SELECT ch.user_id
    FROM choferes ch
    INNER JOIN viajes_despacho vd ON vd.chofer_id = ch.id
    WHERE vd.id = historial_ubicaciones.viaje_id
      AND ch.user_id IS NOT NULL
  )
);

-- Policies para notificaciones
DROP POLICY IF EXISTS "Usuarios solo ven sus notificaciones" ON notificaciones;
CREATE POLICY "Usuarios solo ven sus notificaciones"
ON notificaciones
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios pueden marcar como leída" ON notificaciones;
CREATE POLICY "Usuarios pueden marcar como leída"
ON notificaciones
FOR UPDATE
USING (auth.uid() = user_id);

-- =====================================================
-- PASO 12: Función auxiliar para enviar notificación
-- =====================================================

CREATE OR REPLACE FUNCTION enviar_notificacion(
  p_user_id UUID,
  p_tipo TEXT,
  p_titulo TEXT,
  p_mensaje TEXT,
  p_viaje_id UUID DEFAULT NULL,
  p_despacho_id UUID DEFAULT NULL,
  p_datos_adicionales JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_notificacion_id UUID;
BEGIN
  INSERT INTO notificaciones (
    user_id,
    tipo,
    titulo,
    mensaje,
    viaje_id,
    despacho_id,
    datos_adicionales
  ) VALUES (
    p_user_id,
    p_tipo,
    p_titulo,
    p_mensaje,
    p_viaje_id,
    p_despacho_id,
    p_datos_adicionales
  )
  RETURNING id INTO v_notificacion_id;
  
  RETURN v_notificacion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION enviar_notificacion IS 
'Crea una notificación para un usuario específico';

-- =====================================================
-- PASO 13: Migrar viajes existentes (si hay)
-- =====================================================

-- Insertar estados para viajes existentes que no los tengan
DO $$
DECLARE
  v_viaje RECORD;
BEGIN
  FOR v_viaje IN 
    SELECT id 
    FROM viajes_despacho 
    WHERE NOT EXISTS (
      SELECT 1 FROM estado_unidad_viaje WHERE viaje_id = viajes_despacho.id
    )
  LOOP
    -- Crear estado unidad
    INSERT INTO estado_unidad_viaje (viaje_id, estado_unidad)
    VALUES (v_viaje.id, 'pendiente');
    
    -- Crear estado carga
    INSERT INTO estado_carga_viaje (viaje_id, estado_carga)
    VALUES (v_viaje.id, 'pendiente');
  END LOOP;
  
  RAISE NOTICE 'Estados creados para viajes existentes';
END $$;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ MIGRACIÓN 011 COMPLETADA';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Tablas creadas:';
  RAISE NOTICE '   - estado_unidad_viaje';
  RAISE NOTICE '   - estado_carga_viaje';
  RAISE NOTICE '   - historial_ubicaciones';
  RAISE NOTICE '   - notificaciones';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Funciones creadas:';
  RAISE NOTICE '   - crear_estados_viaje_automatico()';
  RAISE NOTICE '   - registrar_cambio_estado_unidad()';
  RAISE NOTICE '   - registrar_cambio_estado_carga()';
  RAISE NOTICE '   - enviar_notificacion()';
  RAISE NOTICE '';
  RAISE NOTICE '👁️ Vista creada:';
  RAISE NOTICE '   - vista_estado_viaje_completo';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS Policies aplicadas';
  RAISE NOTICE '';
  RAISE NOTICE '📱 Próximos pasos:';
  RAISE NOTICE '   1. Actualizar tipos TypeScript (lib/types.ts)';
  RAISE NOTICE '   2. Crear APIs para actualizar estados';
  RAISE NOTICE '   3. Implementar GPS tracking en app móvil';
  RAISE NOTICE '   4. Configurar Firebase Cloud Messaging';
  RAISE NOTICE '   5. Crear interfaces por rol';
END $$;
