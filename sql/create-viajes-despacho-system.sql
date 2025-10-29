-- =====================================================
-- SISTEMA DE VIAJES PARA DESPACHOS - OPCIÓN C COMPLETA
-- =====================================================
-- Fecha: 27 Oct 2025
-- Descripción: Sistema de trazabilidad completa por camión
-- Compatible con estructura existente - NO ROMPE NADA
-- =====================================================

-- =====================================================
-- PASO 1: Agregar campos a tabla despachos (OPCIONALES)
-- =====================================================

-- Agregar campos para control de múltiples viajes
-- Estos campos son OPCIONALES y no afectan despachos existentes
ALTER TABLE despachos 
ADD COLUMN IF NOT EXISTS cantidad_viajes_solicitados INTEGER DEFAULT 1 CHECK (cantidad_viajes_solicitados > 0),
ADD COLUMN IF NOT EXISTS cantidad_viajes_asignados INTEGER DEFAULT 0 CHECK (cantidad_viajes_asignados >= 0),
ADD COLUMN IF NOT EXISTS cantidad_viajes_completados INTEGER DEFAULT 0 CHECK (cantidad_viajes_completados >= 0);

-- Comentarios para documentación
COMMENT ON COLUMN despachos.cantidad_viajes_solicitados IS 'Cantidad de camiones/viajes solicitados para este despacho';
COMMENT ON COLUMN despachos.cantidad_viajes_asignados IS 'Cantidad de viajes que ya tienen camión asignado';
COMMENT ON COLUMN despachos.cantidad_viajes_completados IS 'Cantidad de viajes finalizados exitosamente';

-- =====================================================
-- PASO 2: Crear tabla viajes_despacho (NUEVA)
-- =====================================================

CREATE TABLE IF NOT EXISTS viajes_despacho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relación con despacho padre
  despacho_id UUID NOT NULL REFERENCES despachos(id) ON DELETE CASCADE,
  
  -- Número de viaje dentro del despacho (1, 2, 3, etc.)
  numero_viaje INTEGER NOT NULL,
  
  -- Empresa de transporte asignada (heredada del despacho)
  transport_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  
  -- Vehículos asignados (asignados por la empresa de transporte)
  camion_id UUID REFERENCES camiones(id) ON DELETE SET NULL,
  acoplado_id UUID REFERENCES acoplados(id) ON DELETE SET NULL,
  chofer_id UUID REFERENCES choferes(id) ON DELETE SET NULL,
  
  -- Estados del viaje (ciclo de vida completo)
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN (
    'pendiente',           -- Creado, esperando asignación de transporte
    'transporte_asignado', -- Transporte asignado al despacho (por coordinador)
    'camion_asignado',     -- Camión específico asignado (por transporte)
    'confirmado',          -- Chofer confirmó el viaje
    'en_transito',         -- En camino a planta
    'en_planta',           -- Ingresó a planta (Control Acceso)
    'esperando_carga',     -- En playa de espera
    'cargando',            -- En proceso de carga (Supervisor)
    'carga_completa',      -- Carga finalizada
    'en_ruta',             -- Salió de planta hacia destino
    'entregado',           -- Entregado en destino
    'completado',          -- Viaje completado y confirmado
    'cancelado',           -- Viaje cancelado
    'incidencia'           -- Viaje con problemas
  )),
  
  -- ===== TRACKING TEMPORAL COMPLETO =====
  
  -- Fase 1: Asignación
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_asignacion_transporte TIMESTAMPTZ,    -- Coordinador asigna transporte
  fecha_asignacion_camion TIMESTAMPTZ,        -- Transporte asigna camión
  fecha_confirmacion_chofer TIMESTAMPTZ,      -- Chofer confirma viaje
  
  -- Fase 2: En Planta
  fecha_ingreso_planta TIMESTAMPTZ,           -- Control Acceso registra entrada
  fecha_llamado_carga TIMESTAMPTZ,            -- Supervisor llama a carga
  fecha_inicio_carga TIMESTAMPTZ,             -- Supervisor inicia carga
  fecha_fin_carga TIMESTAMPTZ,                -- Supervisor finaliza carga
  fecha_salida_planta TIMESTAMPTZ,            -- Control Acceso registra salida
  
  -- Fase 3: Entrega
  fecha_llegada_destino TIMESTAMPTZ,          -- Llegada al destino
  fecha_confirmacion_entrega TIMESTAMPTZ,     -- Cliente confirma entrega
  
  -- ===== DATOS DE CARGA =====
  producto TEXT,
  peso_estimado DECIMAL(10,2),
  peso_real DECIMAL(10,2),
  unidad_medida TEXT DEFAULT 'kg',
  
  -- ===== DOCUMENTACIÓN =====
  remito_numero TEXT,
  remito_url TEXT,
  carta_porte_url TEXT,
  fotos_carga JSONB,                          -- Array de URLs de fotos
  documentacion_completa BOOLEAN DEFAULT FALSE,
  
  -- ===== OBSERVACIONES Y NOTAS =====
  observaciones TEXT,
  notas_internas TEXT,
  
  -- ===== USUARIOS RESPONSABLES =====
  asignado_por UUID REFERENCES auth.users(id),              -- Coordinador que asignó transporte
  camion_asignado_por UUID REFERENCES auth.users(id),       -- Usuario transporte que asignó camión
  confirmado_por UUID REFERENCES auth.users(id),            -- Chofer que confirmó
  ingreso_registrado_por UUID REFERENCES auth.users(id),    -- Control Acceso entrada
  carga_supervisada_por UUID REFERENCES auth.users(id),     -- Supervisor de carga
  salida_registrada_por UUID REFERENCES auth.users(id),     -- Control Acceso salida
  entrega_confirmada_por UUID REFERENCES auth.users(id),    -- Quien confirmó entrega
  
  -- ===== METADATOS =====
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint único: Un despacho no puede tener dos viajes con el mismo número
  CONSTRAINT unique_despacho_numero_viaje UNIQUE (despacho_id, numero_viaje)
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_despacho_id ON viajes_despacho(despacho_id);
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_transport_id ON viajes_despacho(transport_id);
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_camion_id ON viajes_despacho(camion_id);
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_chofer_id ON viajes_despacho(chofer_id);
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_estado ON viajes_despacho(estado);
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_fecha_creacion ON viajes_despacho(fecha_creacion DESC);

-- Comentarios
COMMENT ON TABLE viajes_despacho IS 'Tabla de viajes individuales para cada despacho - permite múltiples camiones por despacho con trazabilidad completa';
COMMENT ON COLUMN viajes_despacho.numero_viaje IS 'Número secuencial del viaje dentro del despacho (1, 2, 3, etc.)';

-- =====================================================
-- PASO 3: Crear tabla registro_control_acceso (NUEVA)
-- =====================================================

CREATE TABLE IF NOT EXISTS registro_control_acceso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relación con viaje
  viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  
  -- Relación con vehículo (para búsqueda rápida por patente)
  camion_id UUID REFERENCES camiones(id),
  acoplado_id UUID REFERENCES acoplados(id),
  
  -- Tipo de movimiento
  tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('ingreso', 'egreso')),
  
  -- Datos del registro
  fecha_hora TIMESTAMPTZ DEFAULT NOW(),
  patente_camion TEXT,              -- Copia para histórico
  patente_acoplado TEXT,            -- Copia para histórico
  
  -- Usuario que registró
  registrado_por UUID NOT NULL REFERENCES auth.users(id),
  
  -- Datos adicionales
  observaciones TEXT,
  foto_camion_url TEXT,
  foto_acoplado_url TEXT,
  temperatura_producto DECIMAL(5,2),  -- Si aplica
  
  -- Validaciones
  documentacion_ok BOOLEAN DEFAULT TRUE,
  documentacion_observaciones TEXT,
  
  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_registro_control_viaje_id ON registro_control_acceso(viaje_id);
CREATE INDEX IF NOT EXISTS idx_registro_control_camion_id ON registro_control_acceso(camion_id);
CREATE INDEX IF NOT EXISTS idx_registro_control_fecha ON registro_control_acceso(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_registro_control_tipo ON registro_control_acceso(tipo_movimiento);

COMMENT ON TABLE registro_control_acceso IS 'Registro de entradas y salidas de camiones en planta - Control de Acceso';

-- =====================================================
-- PASO 4: Crear tabla incidencias_viaje (NUEVA)
-- =====================================================

CREATE TABLE IF NOT EXISTS incidencias_viaje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relación con viaje
  viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  
  -- Tipo y severidad
  tipo_incidencia TEXT NOT NULL CHECK (tipo_incidencia IN (
    'retraso',
    'averia_camion',
    'documentacion_faltante',
    'producto_danado',
    'accidente',
    'otro'
  )),
  
  severidad TEXT DEFAULT 'media' CHECK (severidad IN ('baja', 'media', 'alta', 'critica')),
  
  -- Estado
  estado TEXT DEFAULT 'abierta' CHECK (estado IN ('abierta', 'en_proceso', 'resuelta', 'cerrada')),
  
  -- Descripción
  descripcion TEXT NOT NULL,
  resolucion TEXT,
  
  -- Fechas
  fecha_incidencia TIMESTAMPTZ DEFAULT NOW(),
  fecha_resolucion TIMESTAMPTZ,
  
  -- Usuarios
  reportado_por UUID NOT NULL REFERENCES auth.users(id),
  resuelto_por UUID REFERENCES auth.users(id),
  
  -- Archivos adjuntos
  fotos_incidencia JSONB,
  
  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_incidencias_viaje_id ON incidencias_viaje(viaje_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_estado ON incidencias_viaje(estado);
CREATE INDEX IF NOT EXISTS idx_incidencias_severidad ON incidencias_viaje(severidad);

COMMENT ON TABLE incidencias_viaje IS 'Registro de incidencias durante los viajes';

-- =====================================================
-- PASO 5: Función para crear viajes automáticamente
-- =====================================================

CREATE OR REPLACE FUNCTION crear_viajes_automaticos()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo crear viajes si cantidad_viajes_solicitados > 0
  IF NEW.cantidad_viajes_solicitados > 0 THEN
    -- Crear N viajes para este despacho
    FOR i IN 1..NEW.cantidad_viajes_solicitados LOOP
      INSERT INTO viajes_despacho (
        despacho_id,
        numero_viaje,
        transport_id,
        estado,
        producto,
        fecha_creacion
      ) VALUES (
        NEW.id,
        i,
        NEW.transport_id,  -- Puede ser NULL inicialmente
        CASE 
          WHEN NEW.transport_id IS NOT NULL THEN 'transporte_asignado'
          ELSE 'pendiente'
        END,
        NULL,  -- Se puede agregar producto después
        NOW()
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que crea viajes automáticamente al crear despacho
CREATE TRIGGER trigger_crear_viajes_automaticos
AFTER INSERT ON despachos
FOR EACH ROW
EXECUTE FUNCTION crear_viajes_automaticos();

COMMENT ON FUNCTION crear_viajes_automaticos IS 'Crea automáticamente N viajes cuando se crea un despacho con cantidad_viajes_solicitados';

-- =====================================================
-- PASO 6: Función para actualizar contadores
-- =====================================================

CREATE OR REPLACE FUNCTION actualizar_contadores_despacho()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar contadores en despacho padre
  UPDATE despachos
  SET 
    cantidad_viajes_asignados = (
      SELECT COUNT(*) 
      FROM viajes_despacho 
      WHERE despacho_id = NEW.despacho_id 
        AND camion_id IS NOT NULL
    ),
    cantidad_viajes_completados = (
      SELECT COUNT(*) 
      FROM viajes_despacho 
      WHERE despacho_id = NEW.despacho_id 
        AND estado = 'completado'
    )
  WHERE id = NEW.despacho_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar contadores
CREATE TRIGGER trigger_actualizar_contadores
AFTER INSERT OR UPDATE ON viajes_despacho
FOR EACH ROW
EXECUTE FUNCTION actualizar_contadores_despacho();

COMMENT ON FUNCTION actualizar_contadores_despacho IS 'Actualiza los contadores de viajes asignados y completados en la tabla despachos';

-- =====================================================
-- PASO 6B: Función para ajustar viajes dinámicamente
-- =====================================================

CREATE OR REPLACE FUNCTION ajustar_viajes_despacho(
  p_despacho_id UUID,
  p_nueva_cantidad INTEGER
)
RETURNS TABLE(
  viajes_agregados INTEGER,
  viajes_eliminados INTEGER,
  mensaje TEXT
) AS $$
DECLARE
  v_cantidad_actual INTEGER;
  v_ultimo_numero INTEGER;
  v_agregados INTEGER := 0;
  v_eliminados INTEGER := 0;
BEGIN
  -- Validar que la cantidad sea positiva
  IF p_nueva_cantidad < 1 THEN
    RAISE EXCEPTION 'La cantidad de viajes debe ser mayor a 0';
  END IF;
  
  -- Obtener cantidad actual de viajes activos
  SELECT 
    COUNT(*), 
    COALESCE(MAX(numero_viaje), 0)
  INTO v_cantidad_actual, v_ultimo_numero
  FROM viajes_despacho
  WHERE despacho_id = p_despacho_id
    AND estado NOT IN ('cancelado', 'completado');
  
  -- Si necesitamos agregar viajes
  IF p_nueva_cantidad > v_cantidad_actual THEN
    FOR i IN (v_ultimo_numero + 1)..p_nueva_cantidad LOOP
      INSERT INTO viajes_despacho (
        despacho_id, 
        numero_viaje, 
        estado,
        fecha_creacion
      )
      VALUES (
        p_despacho_id, 
        i, 
        'pendiente',
        NOW()
      );
      v_agregados := v_agregados + 1;
    END LOOP;
    
  -- Si necesitamos quitar viajes (solo los pendientes)
  ELSIF p_nueva_cantidad < v_cantidad_actual THEN
    -- Primero verificar cuántos están pendientes
    SELECT COUNT(*) INTO v_eliminados
    FROM viajes_despacho
    WHERE despacho_id = p_despacho_id
      AND estado = 'pendiente'
      AND numero_viaje > p_nueva_cantidad;
    
    -- Eliminar solo los viajes pendientes que excedan la nueva cantidad
    DELETE FROM viajes_despacho
    WHERE despacho_id = p_despacho_id
      AND estado = 'pendiente'
      AND numero_viaje > p_nueva_cantidad;
    
    -- Si había viajes con estado diferente a 'pendiente', no se eliminan
    IF v_eliminados < (v_cantidad_actual - p_nueva_cantidad) THEN
      RAISE NOTICE 'No se eliminaron algunos viajes porque ya tienen estado avanzado. Solo se pueden eliminar viajes en estado "pendiente".';
    END IF;
  END IF;
  
  -- Actualizar contador en despacho
  UPDATE despachos
  SET cantidad_viajes_solicitados = p_nueva_cantidad
  WHERE id = p_despacho_id;
  
  -- Retornar resultado
  RETURN QUERY SELECT 
    v_agregados, 
    v_eliminados,
    CASE 
      WHEN v_agregados > 0 THEN format('Se agregaron %s viaje(s)', v_agregados)
      WHEN v_eliminados > 0 THEN format('Se eliminaron %s viaje(s) pendiente(s)', v_eliminados)
      ELSE 'No hubo cambios'
    END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION ajustar_viajes_despacho IS 'Ajusta dinámicamente la cantidad de viajes de un despacho - agrega nuevos o elimina los pendientes';

-- =====================================================
-- PASO 7: RLS Policies (Row Level Security)
-- =====================================================

-- Habilitar RLS en las nuevas tablas
ALTER TABLE viajes_despacho ENABLE ROW LEVEL SECURITY;
ALTER TABLE registro_control_acceso ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidencias_viaje ENABLE ROW LEVEL SECURITY;

-- Policy: Usuarios autenticados pueden ver viajes de su empresa
CREATE POLICY "Usuarios pueden ver viajes de su empresa"
ON viajes_despacho
FOR SELECT
USING (
  auth.uid() IN (
    SELECT ue.user_id 
    FROM usuarios_empresa ue
    INNER JOIN despachos d ON d.id = viajes_despacho.despacho_id
    WHERE ue.empresa_id IN (d.origen_id, d.destino_id, viajes_despacho.transport_id)
  )
);

-- Policy: Transporte puede actualizar sus viajes (asignar camiones)
CREATE POLICY "Transporte puede actualizar sus viajes"
ON viajes_despacho
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT ue.user_id 
    FROM usuarios_empresa ue
    WHERE ue.empresa_id = viajes_despacho.transport_id
      AND ue.rol_interno = 'coordinador_transporte'
  )
);

-- Policy: Control de acceso puede ver todos los registros de su planta
CREATE POLICY "Control acceso puede ver registros"
ON registro_control_acceso
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Policy: Control de acceso puede insertar registros
CREATE POLICY "Control acceso puede insertar registros"
ON registro_control_acceso
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT ue.user_id 
    FROM usuarios_empresa ue
    WHERE ue.rol_interno = 'control_acceso'
  )
);

-- Policy: Cualquier usuario autenticado puede ver incidencias de viajes que puede ver
CREATE POLICY "Usuarios pueden ver incidencias de sus viajes"
ON incidencias_viaje
FOR SELECT
USING (
  viaje_id IN (
    SELECT id FROM viajes_despacho
    WHERE auth.uid() IN (
      SELECT ue.user_id 
      FROM usuarios_empresa ue
      INNER JOIN despachos d ON d.id = viajes_despacho.despacho_id
      WHERE ue.empresa_id IN (d.origen_id, d.destino_id, viajes_despacho.transport_id)
    )
  )
);

-- =====================================================
-- PASO 8: Vistas útiles para reportes
-- =====================================================

-- Vista: Estado completo de viajes por despacho
CREATE OR REPLACE VIEW vista_viajes_despacho AS
SELECT 
  vd.id as viaje_id,
  vd.despacho_id,
  d.id_pedido as numero_despacho,
  vd.numero_viaje,
  vd.estado,
  
  -- Empresas
  emp_trans.nombre as transporte_nombre,
  
  -- Vehículos
  c.patente as camion_patente,
  c.marca as camion_marca,
  c.modelo as camion_modelo,
  a.patente as acoplado_patente,
  
  -- Chofer
  CASE 
    WHEN ch.nombre IS NOT NULL THEN ch.nombre || ' ' || ch.apellido
    ELSE NULL
  END as chofer_nombre,
  ch.telefono as chofer_telefono,
  
  -- Origen y Destino (usar campos que existen en despachos)
  d.origen,
  d.destino,
  d.estado as estado_despacho,
  d.prioridad,
  
  -- Fechas clave
  vd.fecha_creacion,
  vd.fecha_asignacion_camion,
  vd.fecha_ingreso_planta,
  vd.fecha_salida_planta,
  vd.fecha_confirmacion_entrega,
  
  -- Tiempos calculados
  CASE 
    WHEN vd.fecha_salida_planta IS NOT NULL AND vd.fecha_ingreso_planta IS NOT NULL
    THEN EXTRACT(EPOCH FROM (vd.fecha_salida_planta - vd.fecha_ingreso_planta))/3600
    ELSE NULL
  END as horas_en_planta,
  
  -- Carga
  vd.producto,
  vd.peso_estimado,
  vd.peso_real,
  
  vd.created_at,
  vd.updated_at
  
FROM viajes_despacho vd
LEFT JOIN despachos d ON d.id = vd.despacho_id
LEFT JOIN empresas emp_trans ON emp_trans.id = vd.transport_id
LEFT JOIN camiones c ON c.id = vd.camion_id
LEFT JOIN acoplados a ON a.id = vd.acoplado_id
LEFT JOIN choferes ch ON ch.id = vd.chofer_id;

COMMENT ON VIEW vista_viajes_despacho IS 'Vista completa de viajes con toda la información relacionada';

-- =====================================================
-- PASO 9: Datos de ejemplo (COMENTADO - descomentar si quieres)
-- =====================================================

/*
-- Ejemplo: Actualizar un despacho existente para usar múltiples viajes
UPDATE despachos 
SET cantidad_viajes_solicitados = 3
WHERE id = 'tu-despacho-id-aqui';

-- Los viajes se crearán automáticamente por el trigger
*/

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

-- Verificación final
DO $$
BEGIN
  RAISE NOTICE '✅ Sistema de viajes creado exitosamente';
  RAISE NOTICE '📊 Tablas creadas: viajes_despacho, registro_control_acceso, incidencias_viaje';
  RAISE NOTICE '🔧 Funciones creadas: crear_viajes_automaticos, actualizar_contadores_despacho';
  RAISE NOTICE '🔒 RLS Policies aplicadas';
  RAISE NOTICE '👁️ Vista creada: vista_viajes_despacho';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Próximos pasos:';
  RAISE NOTICE '   1. Ejecutar este script en Supabase SQL Editor';
  RAISE NOTICE '   2. Actualizar tipos TypeScript (lib/types.ts)';
  RAISE NOTICE '   3. Modificar crear-despacho.tsx para agregar campo cantidad_viajes';
  RAISE NOTICE '   4. Crear interfaz para Transporte (asignar camiones)';
  RAISE NOTICE '   5. Crear interfaz para Control Acceso (registro entrada/salida)';
END $$;
