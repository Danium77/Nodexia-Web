-- ============================================================================
-- RED NODEXIA - Schema de Base de Datos
-- Fecha: 2024-12-04
-- Descripción: Estructura modular e independiente para Red Nodexia
-- ============================================================================

-- ============================================================================
-- TABLA 1: viajes_red_nodexia
-- Gestiona la publicación de viajes en la Red Nodexia
-- ============================================================================
CREATE TABLE IF NOT EXISTS viajes_red_nodexia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
    empresa_solicitante_id UUID NOT NULL REFERENCES empresas(id),
    
    -- Información del viaje publicado
    tarifa_ofrecida DECIMAL(10, 2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'ARS',
    descripcion_carga TEXT,
    
    -- Estados de la red
    estado_red VARCHAR(50) NOT NULL DEFAULT 'abierto',
    -- Estados: 'abierto', 'con_ofertas', 'asignado', 'cancelado', 'cerrado'
    
    -- Fechas de gestión
    fecha_publicacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_cierre TIMESTAMP WITH TIME ZONE,
    fecha_asignacion TIMESTAMP WITH TIME ZONE,
    
    -- Transporte seleccionado
    transporte_asignado_id UUID REFERENCES empresas(id),
    oferta_aceptada_id UUID, -- FK a ofertas_red_nodexia (se agrega después)
    
    -- Metadata
    publicado_por UUID REFERENCES auth.users(id),
    asignado_por UUID REFERENCES auth.users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT check_tarifa_positiva CHECK (tarifa_ofrecida > 0)
);

-- Índices para viajes_red_nodexia
CREATE INDEX IF NOT EXISTS idx_viajes_red_estado ON viajes_red_nodexia(estado_red);
CREATE INDEX IF NOT EXISTS idx_viajes_red_viaje ON viajes_red_nodexia(viaje_id);
CREATE INDEX IF NOT EXISTS idx_viajes_red_empresa ON viajes_red_nodexia(empresa_solicitante_id);
CREATE INDEX IF NOT EXISTS idx_viajes_red_transporte ON viajes_red_nodexia(transporte_asignado_id);
CREATE INDEX IF NOT EXISTS idx_viajes_red_fecha ON viajes_red_nodexia(fecha_publicacion);

-- ============================================================================
-- TABLA 2: requisitos_viaje_red
-- Requisitos técnicos y certificaciones del viaje
-- ============================================================================
CREATE TABLE IF NOT EXISTS requisitos_viaje_red (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viaje_red_id UUID NOT NULL REFERENCES viajes_red_nodexia(id) ON DELETE CASCADE,
    
    -- Requisitos de unidad
    tipo_camion VARCHAR(100), -- 'Semirremolque', 'Chasis', 'Portacontenedor', etc.
    tipo_acoplado VARCHAR(100), -- 'Sider', 'Caja seca', 'Tolva', 'Tanque', etc.
    cantidad_ejes_minimo INTEGER,
    
    -- Capacidad requerida
    peso_maximo_kg DECIMAL(10, 2),
    volumen_maximo_m3 DECIMAL(10, 2),
    largo_minimo_metros DECIMAL(5, 2),
    
    -- Certificaciones y habilitaciones
    requiere_carga_peligrosa BOOLEAN DEFAULT FALSE,
    requiere_termo BOOLEAN DEFAULT FALSE,
    requiere_gps BOOLEAN DEFAULT FALSE,
    requiere_carga_segura BOOLEAN DEFAULT FALSE,
    
    -- Tipo de carga
    tipo_carga VARCHAR(100), -- 'Granos', 'Contenedor', 'General', 'Líquidos', etc.
    clase_carga_peligrosa VARCHAR(50), -- Si aplica: 'Clase 3', 'Clase 8', etc.
    
    -- Observaciones
    observaciones TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_requisitos_viaje UNIQUE(viaje_red_id)
);

-- Índices para requisitos_viaje_red
CREATE INDEX IF NOT EXISTS idx_requisitos_viaje_red ON requisitos_viaje_red(viaje_red_id);
CREATE INDEX IF NOT EXISTS idx_requisitos_tipo_camion ON requisitos_viaje_red(tipo_camion);
CREATE INDEX IF NOT EXISTS idx_requisitos_tipo_carga ON requisitos_viaje_red(tipo_carga);

-- ============================================================================
-- TABLA 3: ofertas_red_nodexia
-- Ofertas/aceptaciones de transportes para viajes en red
-- ============================================================================
CREATE TABLE IF NOT EXISTS ofertas_red_nodexia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viaje_red_id UUID NOT NULL REFERENCES viajes_red_nodexia(id) ON DELETE CASCADE,
    transporte_id UUID NOT NULL REFERENCES empresas(id),
    
    -- Información de la oferta
    mensaje TEXT,
    camion_propuesto_id UUID REFERENCES camiones(id),
    chofer_propuesto_id UUID REFERENCES choferes(id),
    
    -- Estado de la oferta
    estado_oferta VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    -- Estados: 'pendiente', 'aceptada', 'rechazada', 'retirada', 'expirada'
    
    -- Fechas
    fecha_oferta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_respuesta TIMESTAMP WITH TIME ZONE,
    
    -- Usuario que realizó la oferta
    ofertado_por UUID REFERENCES auth.users(id),
    
    -- Metadata de matching (para algoritmos futuros)
    score_matching DECIMAL(5, 2), -- Score de 0-100 según algoritmo
    distancia_origen_km DECIMAL(10, 2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_oferta_transporte UNIQUE(viaje_red_id, transporte_id)
);

-- Índices para ofertas_red_nodexia
CREATE INDEX IF NOT EXISTS idx_ofertas_viaje_red ON ofertas_red_nodexia(viaje_red_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_transporte ON ofertas_red_nodexia(transporte_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_estado ON ofertas_red_nodexia(estado_oferta);
CREATE INDEX IF NOT EXISTS idx_ofertas_fecha ON ofertas_red_nodexia(fecha_oferta);

-- Agregar FK de oferta_aceptada_id después de crear ofertas_red_nodexia
ALTER TABLE viajes_red_nodexia 
ADD CONSTRAINT fk_oferta_aceptada 
FOREIGN KEY (oferta_aceptada_id) 
REFERENCES ofertas_red_nodexia(id);

-- ============================================================================
-- TABLA 4: preferencias_transporte_red
-- Preferencias de cada transporte para recibir cargas de la red
-- ============================================================================
CREATE TABLE IF NOT EXISTS preferencias_transporte_red (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transporte_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    
    -- Preferencias geográficas
    zonas_interes TEXT[], -- Array: ['Buenos Aires', 'Córdoba', 'Santa Fe']
    radio_operacion_km INTEGER, -- Radio desde su base
    acepta_nacional BOOLEAN DEFAULT TRUE,
    
    -- Preferencias de carga
    tipos_carga_preferidos TEXT[], -- Array: ['Granos', 'Contenedores', 'General']
    acepta_carga_peligrosa BOOLEAN DEFAULT FALSE,
    acepta_carga_refrigerada BOOLEAN DEFAULT FALSE,
    
    -- Configuración de notificaciones
    notificaciones_activas BOOLEAN DEFAULT TRUE,
    notificacion_email BOOLEAN DEFAULT TRUE,
    notificacion_push BOOLEAN DEFAULT TRUE,
    
    -- Disponibilidad
    acepta_cargas_red BOOLEAN DEFAULT TRUE,
    horario_atencion_desde TIME,
    horario_atencion_hasta TIME,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_preferencias_transporte UNIQUE(transporte_id)
);

-- Índices para preferencias_transporte_red
CREATE INDEX IF NOT EXISTS idx_preferencias_transporte ON preferencias_transporte_red(transporte_id);
CREATE INDEX IF NOT EXISTS idx_preferencias_activas ON preferencias_transporte_red(acepta_cargas_red);

-- ============================================================================
-- TABLA 5: historial_red_nodexia
-- Auditoría y trazabilidad de acciones en la red
-- ============================================================================
CREATE TABLE IF NOT EXISTS historial_red_nodexia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viaje_red_id UUID REFERENCES viajes_red_nodexia(id) ON DELETE CASCADE,
    oferta_id UUID REFERENCES ofertas_red_nodexia(id) ON DELETE SET NULL,
    
    -- Acción realizada
    accion VARCHAR(100) NOT NULL,
    -- Acciones: 'publicado', 'oferta_recibida', 'oferta_aceptada', 'oferta_rechazada', 
    --           'viaje_asignado', 'viaje_cancelado', 'viaje_cerrado'
    
    -- Contexto
    descripcion TEXT,
    
    -- Usuario que realizó la acción
    usuario_id UUID REFERENCES auth.users(id),
    empresa_id UUID REFERENCES empresas(id),
    
    -- Metadata
    metadata JSONB, -- Datos adicionales flexibles
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT check_accion_valida CHECK (
        accion IN (
            'publicado', 'oferta_recibida', 'oferta_aceptada', 'oferta_rechazada',
            'viaje_asignado', 'viaje_cancelado', 'viaje_cerrado', 'requisitos_actualizados'
        )
    )
);

-- Índices para historial_red_nodexia
CREATE INDEX IF NOT EXISTS idx_historial_viaje_red ON historial_red_nodexia(viaje_red_id);
CREATE INDEX IF NOT EXISTS idx_historial_oferta ON historial_red_nodexia(oferta_id);
CREATE INDEX IF NOT EXISTS idx_historial_accion ON historial_red_nodexia(accion);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_red_nodexia(created_at);

-- ============================================================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER trigger_viajes_red_updated_at
    BEFORE UPDATE ON viajes_red_nodexia
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trigger_requisitos_updated_at
    BEFORE UPDATE ON requisitos_viaje_red
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trigger_ofertas_updated_at
    BEFORE UPDATE ON ofertas_red_nodexia
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trigger_preferencias_updated_at
    BEFORE UPDATE ON preferencias_transporte_red
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- ============================================================================
-- FUNCIÓN: Registrar en historial automáticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION registrar_historial_red()
RETURNS TRIGGER AS $$
BEGIN
    -- Registrar publicación de viaje
    IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'viajes_red_nodexia' THEN
        INSERT INTO historial_red_nodexia (viaje_red_id, accion, descripcion, usuario_id, empresa_id)
        VALUES (NEW.id, 'publicado', 'Viaje publicado en Red Nodexia', NEW.publicado_por, NEW.empresa_solicitante_id);
    END IF;
    
    -- Registrar cambio de estado
    IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'viajes_red_nodexia' AND OLD.estado_red != NEW.estado_red THEN
        INSERT INTO historial_red_nodexia (viaje_red_id, accion, descripcion, empresa_id)
        VALUES (NEW.id, 'cambio_estado', 'Estado cambiado de ' || OLD.estado_red || ' a ' || NEW.estado_red, NEW.empresa_solicitante_id);
    END IF;
    
    -- Registrar nueva oferta
    IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'ofertas_red_nodexia' THEN
        INSERT INTO historial_red_nodexia (viaje_red_id, oferta_id, accion, descripcion, usuario_id, empresa_id)
        VALUES (NEW.viaje_red_id, NEW.id, 'oferta_recibida', 'Nueva oferta recibida', NEW.ofertado_por, NEW.transporte_id);
        
        -- Actualizar estado del viaje a 'con_ofertas' si es la primera oferta
        UPDATE viajes_red_nodexia 
        SET estado_red = 'con_ofertas'
        WHERE id = NEW.viaje_red_id 
        AND estado_red = 'abierto';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para historial automático
CREATE TRIGGER trigger_historial_viajes_red
    AFTER INSERT OR UPDATE ON viajes_red_nodexia
    FOR EACH ROW
    EXECUTE FUNCTION registrar_historial_red();

CREATE TRIGGER trigger_historial_ofertas
    AFTER INSERT ON ofertas_red_nodexia
    FOR EACH ROW
    EXECUTE FUNCTION registrar_historial_red();

-- ============================================================================
-- RLS (Row Level Security) Policies
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE viajes_red_nodexia ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisitos_viaje_red ENABLE ROW LEVEL SECURITY;
ALTER TABLE ofertas_red_nodexia ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferencias_transporte_red ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_red_nodexia ENABLE ROW LEVEL SECURITY;

-- Policy: Plantas pueden ver sus propios viajes publicados
CREATE POLICY "Plantas ven sus viajes en red"
    ON viajes_red_nodexia FOR SELECT
    USING (
        empresa_solicitante_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Transportes pueden ver todos los viajes abiertos
CREATE POLICY "Transportes ven viajes abiertos"
    ON viajes_red_nodexia FOR SELECT
    USING (
        estado_red IN ('abierto', 'con_ofertas')
        AND EXISTS (
            SELECT 1 FROM usuarios_empresa ue
            JOIN empresas e ON e.id = ue.empresa_id
            WHERE ue.user_id = auth.uid()
            AND e.tipo_empresa = 'transporte'
        )
    );

-- Policy: Plantas pueden crear viajes en red
CREATE POLICY "Plantas crean viajes en red"
    ON viajes_red_nodexia FOR INSERT
    WITH CHECK (
        empresa_solicitante_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Transportes pueden crear ofertas
CREATE POLICY "Transportes crean ofertas"
    ON ofertas_red_nodexia FOR INSERT
    WITH CHECK (
        transporte_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Transportes ven sus propias ofertas
CREATE POLICY "Transportes ven sus ofertas"
    ON ofertas_red_nodexia FOR SELECT
    USING (
        transporte_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Plantas ven ofertas de sus viajes
CREATE POLICY "Plantas ven ofertas de sus viajes"
    ON ofertas_red_nodexia FOR SELECT
    USING (
        viaje_red_id IN (
            SELECT id FROM viajes_red_nodexia
            WHERE empresa_solicitante_id IN (
                SELECT empresa_id FROM usuarios_empresa 
                WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- COMENTARIOS EN TABLAS
-- ============================================================================
COMMENT ON TABLE viajes_red_nodexia IS 'Viajes publicados en la Red Nodexia disponibles para todos los transportes';
COMMENT ON TABLE requisitos_viaje_red IS 'Requisitos técnicos y certificaciones necesarias para viajes en red';
COMMENT ON TABLE ofertas_red_nodexia IS 'Ofertas de transportes para viajes publicados en red';
COMMENT ON TABLE preferencias_transporte_red IS 'Preferencias de transportes para filtrar cargas de interés';
COMMENT ON TABLE historial_red_nodexia IS 'Auditoría completa de acciones en la Red Nodexia';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT 
    tablename,
    schemaname
FROM pg_tables
WHERE tablename IN (
    'viajes_red_nodexia',
    'requisitos_viaje_red',
    'ofertas_red_nodexia',
    'preferencias_transporte_red',
    'historial_red_nodexia'
)
ORDER BY tablename;
