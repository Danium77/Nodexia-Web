-- sql/ubicaciones_choferes.sql
-- Tabla para almacenar ubicación GPS en tiempo real de choferes
-- Permite tracking del camión a través del teléfono del chofer

CREATE TABLE IF NOT EXISTS ubicaciones_choferes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chofer_id UUID NOT NULL REFERENCES choferes(id) ON DELETE CASCADE,
    viaje_id UUID REFERENCES viajes_despacho(id) ON DELETE SET NULL,
    
    -- Datos de ubicación
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2), -- Precisión en metros
    altitude DECIMAL(10, 2), -- Altitud en metros (opcional)
    
    -- Datos adicionales
    velocidad DECIMAL(6, 2), -- Velocidad en km/h
    heading DECIMAL(5, 2), -- Dirección en grados (0-360)
    bateria INTEGER, -- Nivel de batería del dispositivo (0-100)
    
    -- Metadatos
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Índices para optimizar consultas
    CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
    CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180),
    CONSTRAINT valid_bateria CHECK (bateria IS NULL OR (bateria >= 0 AND bateria <= 100))
);

-- Índices para mejorar performance
CREATE INDEX idx_ubicaciones_chofer_id ON ubicaciones_choferes(chofer_id);
CREATE INDEX idx_ubicaciones_viaje_id ON ubicaciones_choferes(viaje_id);
CREATE INDEX idx_ubicaciones_timestamp ON ubicaciones_choferes(timestamp DESC);
CREATE INDEX idx_ubicaciones_chofer_timestamp ON ubicaciones_choferes(chofer_id, timestamp DESC);

-- Índice compuesto para obtener última ubicación de un viaje
CREATE INDEX idx_ubicaciones_viaje_timestamp ON ubicaciones_choferes(viaje_id, timestamp DESC) 
WHERE viaje_id IS NOT NULL;

-- RLS (Row Level Security)
ALTER TABLE ubicaciones_choferes ENABLE ROW LEVEL SECURITY;

-- Policy: Los choferes pueden insertar sus propias ubicaciones
CREATE POLICY "Choferes pueden insertar su ubicación"
ON ubicaciones_choferes
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM usuarios_empresas ue
        JOIN roles_empresa re ON ue.role_id = re.id
        WHERE ue.user_id = auth.uid()
        AND re.nombre = 'chofer'
        AND EXISTS (
            SELECT 1 FROM choferes c
            WHERE c.id = ubicaciones_choferes.chofer_id
            AND c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    )
);

-- Policy: Coordinadores/Admins pueden ver todas las ubicaciones de su empresa
CREATE POLICY "Coordinadores pueden ver ubicaciones"
ON ubicaciones_choferes
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM usuarios_empresas ue
        JOIN roles_empresa re ON ue.role_id = re.id
        WHERE ue.user_id = auth.uid()
        AND re.nombre IN ('coordinador_logistica', 'admin', 'super_admin')
    )
);

-- Policy: Choferes pueden ver solo sus ubicaciones
CREATE POLICY "Choferes pueden ver su historial"
ON ubicaciones_choferes
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM choferes c
        WHERE c.id = ubicaciones_choferes.chofer_id
        AND c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
);

-- Función para obtener última ubicación de un viaje
CREATE OR REPLACE FUNCTION get_ultima_ubicacion_viaje(p_viaje_id UUID)
RETURNS TABLE (
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    velocidad DECIMAL(6, 2),
    timestamp TIMESTAMPTZ,
    chofer_nombre TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uc.latitude,
        uc.longitude,
        uc.velocidad,
        uc.timestamp,
        c.nombre AS chofer_nombre
    FROM ubicaciones_choferes uc
    JOIN choferes c ON c.id = uc.chofer_id
    WHERE uc.viaje_id = p_viaje_id
    ORDER BY uc.timestamp DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para limpiar ubicaciones antiguas (ejecutar con cron job)
-- Mantener solo últimas 7 días
CREATE OR REPLACE FUNCTION cleanup_ubicaciones_antiguas()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ubicaciones_choferes
    WHERE timestamp < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON TABLE ubicaciones_choferes IS 'Almacena ubicación GPS en tiempo real del chofer/camión';
COMMENT ON COLUMN ubicaciones_choferes.accuracy IS 'Precisión GPS en metros';
COMMENT ON COLUMN ubicaciones_choferes.heading IS 'Dirección del movimiento en grados (0=Norte, 90=Este)';
COMMENT ON COLUMN ubicaciones_choferes.bateria IS 'Nivel de batería del dispositivo móvil (%)';
