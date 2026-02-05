-- Crear tabla ubicaciones_choferes
CREATE TABLE IF NOT EXISTS ubicaciones_choferes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chofer_id UUID NOT NULL REFERENCES choferes(id) ON DELETE CASCADE,
    viaje_id UUID REFERENCES viajes_despacho(id) ON DELETE SET NULL,
    
    -- Datos de ubicación
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    altitude DECIMAL(10, 2),
    
    -- Datos adicionales
    velocidad DECIMAL(6, 2),
    heading DECIMAL(5, 2),
    bateria INTEGER,
    
    -- Metadatos
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
    CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180),
    CONSTRAINT valid_bateria CHECK (bateria IS NULL OR (bateria >= 0 AND bateria <= 100))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ubicaciones_chofer_id ON ubicaciones_choferes(chofer_id);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_viaje_id ON ubicaciones_choferes(viaje_id);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_timestamp ON ubicaciones_choferes(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_chofer_timestamp ON ubicaciones_choferes(chofer_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_viaje_timestamp ON ubicaciones_choferes(viaje_id, timestamp DESC) WHERE viaje_id IS NOT NULL;
