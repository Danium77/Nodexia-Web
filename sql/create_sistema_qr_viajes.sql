-- sql/create_sistema_qr_viajes.sql
-- Estructura de base de datos para el sistema de gestión QR de viajes

-- Tabla de viajes con sistema QR
CREATE TABLE IF NOT EXISTS viajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Datos del viaje
    numero_viaje VARCHAR(50) UNIQUE NOT NULL,
    qr_code TEXT UNIQUE NOT NULL, -- Hash único para el QR
    tipo_operacion VARCHAR(20) CHECK (tipo_operacion IN ('carga', 'descarga')) NOT NULL,
    
    -- Relaciones
    chofer_id UUID REFERENCES choferes(id),
    camion_id UUID REFERENCES camiones(id),
    acoplado_id UUID REFERENCES acoplados(id),
    empresa_origen_id UUID REFERENCES empresas(id),
    empresa_destino_id UUID REFERENCES empresas(id),
    
    -- Estados del viaje
    estado_viaje VARCHAR(30) DEFAULT 'confirmado' CHECK (
        estado_viaje IN (
            'confirmado',           -- Chofer confirmó viaje, QR generado
            'en_transito',          -- Camión en camino a planta
            'ingresado_planta',     -- Control de Acceso confirmó ingreso
            'en_playa_esperando',   -- En playa de estacionamiento
            'llamado_carga',        -- Supervisor llamó a carga
            'iniciando_carga',      -- Supervisor confirmó inicio de carga
            'cargando',             -- Proceso de carga en curso
            'carga_finalizada',     -- Carga completada
            'listo_egreso',         -- Listo para salir de planta
            'egresado_planta',      -- Control de Acceso confirmó egreso
            'viaje_completado',     -- Viaje finalizado exitosamente
            'incidencia'            -- Viaje con problemas
        )
    ),
    
    -- Timestamps de control
    fecha_confirmacion TIMESTAMPTZ DEFAULT NOW(),
    fecha_ingreso_planta TIMESTAMPTZ,
    fecha_llamado_carga TIMESTAMPTZ,
    fecha_inicio_carga TIMESTAMPTZ,
    fecha_fin_carga TIMESTAMPTZ,
    fecha_egreso_planta TIMESTAMPTZ,
    
    -- Datos de carga/descarga
    producto TEXT,
    peso_estimado DECIMAL(10,2),
    peso_real DECIMAL(10,2),
    observaciones TEXT,
    
    -- Control de documentación
    documentacion_validada BOOLEAN DEFAULT FALSE,
    documentacion_observaciones TEXT,
    
    -- Archivos adjuntos
    remito_url TEXT,
    fotos_carga JSONB, -- Array de URLs de fotos
    
    -- Usuarios responsables de cada acción
    confirmado_por UUID REFERENCES usuarios(id),
    ingreso_por UUID REFERENCES usuarios(id), -- Control de Acceso
    llamado_por UUID REFERENCES usuarios(id), -- Supervisor de Carga
    carga_iniciada_por UUID REFERENCES usuarios(id), -- Supervisor de Carga
    carga_finalizada_por UUID REFERENCES usuarios(id), -- Supervisor de Carga
    egreso_por UUID REFERENCES usuarios(id), -- Control de Acceso
    
    -- Metadatos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    activo BOOLEAN DEFAULT TRUE
);

-- Tabla de incidencias
CREATE TABLE IF NOT EXISTS incidencias_viaje (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viaje_id UUID REFERENCES viajes(id) ON DELETE CASCADE,
    
    -- Tipo de incidencia
    tipo_incidencia VARCHAR(50) NOT NULL CHECK (
        tipo_incidencia IN (
            'documentacion_vencida',
            'documentacion_faltante', 
            'datos_incorrectos',
            'problema_vehiculo',
            'acceso_denegado',
            'problema_carga',
            'retraso_operativo',
            'otro'
        )
    ),
    
    -- Detalles
    descripcion TEXT NOT NULL,
    severidad VARCHAR(20) DEFAULT 'media' CHECK (severidad IN ('baja', 'media', 'alta', 'critica')),
    
    -- Resolución
    estado_incidencia VARCHAR(20) DEFAULT 'abierta' CHECK (
        estado_incidencia IN ('abierta', 'en_proceso', 'resuelta', 'cerrada')
    ),
    solucion TEXT,
    
    -- Responsables
    reportado_por UUID REFERENCES usuarios(id) NOT NULL,
    asignado_a UUID REFERENCES usuarios(id),
    resuelto_por UUID REFERENCES usuarios(id),
    
    -- Timestamps
    fecha_reporte TIMESTAMPTZ DEFAULT NOW(),
    fecha_asignacion TIMESTAMPTZ,
    fecha_resolucion TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de notificaciones push
CREATE TABLE IF NOT EXISTS notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Destinatario
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    
    -- Contenido de la notificación
    tipo_notificacion VARCHAR(30) NOT NULL CHECK (
        tipo_notificacion IN (
            'viaje_confirmado',
            'llamado_carga',
            'documentacion_vencimiento',
            'incidencia_reportada',
            'estado_actualizado',
            'carga_iniciada',
            'carga_finalizada'
        )
    ),
    
    titulo VARCHAR(100) NOT NULL,
    mensaje TEXT NOT NULL,
    
    -- Datos adicionales
    viaje_id UUID REFERENCES viajes(id),
    datos_extra JSONB, -- Para información adicional específica
    
    -- Estado de la notificación
    enviada BOOLEAN DEFAULT FALSE,
    leida BOOLEAN DEFAULT FALSE,
    fecha_envio TIMESTAMPTZ,
    fecha_lectura TIMESTAMPTZ,
    
    -- Metadatos
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de documentación por viaje
CREATE TABLE IF NOT EXISTS documentacion_viaje (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    viaje_id UUID REFERENCES viajes(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(50) NOT NULL,
    
    -- Archivo
    archivo_url TEXT NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    
    -- Validación
    validado BOOLEAN DEFAULT FALSE,
    fecha_validacion TIMESTAMPTZ,
    validado_por UUID REFERENCES usuarios(id),
    observaciones_validacion TEXT,
    
    -- Vigencia
    fecha_vencimiento DATE,
    vigente BOOLEAN GENERATED ALWAYS AS (
        fecha_vencimiento IS NULL OR fecha_vencimiento > CURRENT_DATE
    ) STORED,
    
    -- Metadatos
    subido_por UUID REFERENCES usuarios(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_viajes_qr_code ON viajes(qr_code);
CREATE INDEX IF NOT EXISTS idx_viajes_estado ON viajes(estado_viaje);
CREATE INDEX IF NOT EXISTS idx_viajes_fecha_confirmacion ON viajes(fecha_confirmacion);
CREATE INDEX IF NOT EXISTS idx_viajes_chofer ON viajes(chofer_id);
CREATE INDEX IF NOT EXISTS idx_viajes_camion ON viajes(camion_id);

CREATE INDEX IF NOT EXISTS idx_incidencias_viaje ON incidencias_viaje(viaje_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_estado ON incidencias_viaje(estado_incidencia);
CREATE INDEX IF NOT EXISTS idx_incidencias_tipo ON incidencias_viaje(tipo_incidencia);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_tipo ON notificaciones(tipo_notificacion);
CREATE INDEX IF NOT EXISTS idx_notificaciones_enviada ON notificaciones(enviada);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_viajes_updated_at BEFORE UPDATE ON viajes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidencias_updated_at BEFORE UPDATE ON incidencias_viaje 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documentacion_updated_at BEFORE UPDATE ON documentacion_viaje 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies
ALTER TABLE viajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidencias_viaje ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentacion_viaje ENABLE ROW LEVEL SECURITY;

-- Policies básicas (se pueden ajustar según necesidades específicas)
CREATE POLICY "Users can view their company viajes" ON viajes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM usuarios_empresa ue 
            WHERE ue.user_id = auth.uid() 
            AND (ue.empresa_id = empresa_origen_id OR ue.empresa_id = empresa_destino_id)
        )
    );

CREATE POLICY "Control acceso and supervisors can manage viajes" ON viajes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM usuarios_empresa ue
            JOIN roles_empresa re ON ue.rol_empresa_id = re.id
            WHERE ue.user_id = auth.uid()
            AND re.nombre IN ('Control de Acceso', 'Supervisor de Carga', 'Super Admin', 'Coordinador')
        )
    );

-- Comentarios para documentación
COMMENT ON TABLE viajes IS 'Tabla principal para gestión de viajes con sistema QR';
COMMENT ON COLUMN viajes.qr_code IS 'Hash único para generar código QR del viaje';
COMMENT ON COLUMN viajes.estado_viaje IS 'Estado actual del viaje en el flujo operativo';
COMMENT ON TABLE incidencias_viaje IS 'Incidencias reportadas durante los viajes';
COMMENT ON TABLE notificaciones IS 'Sistema de notificaciones push para la app móvil';
COMMENT ON TABLE documentacion_viaje IS 'Documentación específica por viaje';