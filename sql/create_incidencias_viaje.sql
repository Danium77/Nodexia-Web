-- Crear tabla incidencias_viaje si no existe
-- Sistema de reporte de incidencias por choferes

CREATE TABLE IF NOT EXISTS incidencias_viaje (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relaciones
    viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
    reportado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    
    -- Tipo de incidencia
    tipo_incidencia VARCHAR(50) NOT NULL CHECK (
        tipo_incidencia IN (
            'demora',
            'problema_mecanico',
            'problema_carga',
            'ruta_bloqueada',
            'accidente',
            'clima_adverso',
            'otro'
        )
    ),
    
    -- Detalles de la incidencia
    descripcion TEXT NOT NULL,
    latitud DECIMAL(10, 8),
    longitud DECIMAL(11, 8),
    
    -- Estado de resolución
    estado_resolucion VARCHAR(30) DEFAULT 'pendiente' CHECK (
        estado_resolucion IN (
            'pendiente',
            'en_revision',
            'resuelto',
            'cerrado'
        )
    ),
    
    -- Resolución
    resuelto_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_resolucion TIMESTAMPTZ,
    comentario_resolucion TEXT,
    
    -- Timestamps
    fecha_reporte TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_incidencias_viaje_viaje_id ON incidencias_viaje(viaje_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_viaje_reportado_por ON incidencias_viaje(reportado_por);
CREATE INDEX IF NOT EXISTS idx_incidencias_viaje_estado ON incidencias_viaje(estado_resolucion);
CREATE INDEX IF NOT EXISTS idx_incidencias_viaje_fecha ON incidencias_viaje(fecha_reporte);

-- Comentarios
COMMENT ON TABLE incidencias_viaje IS 'Registro de incidencias reportadas por choferes durante viajes';
COMMENT ON COLUMN incidencias_viaje.tipo_incidencia IS 'Tipo de incidencia: demora, problema_mecanico, problema_carga, ruta_bloqueada, accidente, clima_adverso, otro';
COMMENT ON COLUMN incidencias_viaje.estado_resolucion IS 'Estado de la resolución: pendiente, en_revision, resuelto, cerrado';

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_incidencias_viaje_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_incidencias_viaje_updated_at
    BEFORE UPDATE ON incidencias_viaje
    FOR EACH ROW
    EXECUTE FUNCTION update_incidencias_viaje_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE incidencias_viaje ENABLE ROW LEVEL SECURITY;

-- Policy: Todos pueden ver incidencias (simplificado)
CREATE POLICY "Usuarios pueden ver incidencias"
    ON incidencias_viaje FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Policy: Usuarios autenticados pueden crear incidencias
CREATE POLICY "Usuarios pueden reportar incidencias"
    ON incidencias_viaje FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Usuarios autenticados pueden actualizar incidencias
CREATE POLICY "Usuarios pueden actualizar incidencias"
    ON incidencias_viaje FOR UPDATE
    USING (auth.uid() IS NOT NULL);
