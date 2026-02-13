-- ============================================================================
-- CREAR TABLA ofertas_red_nodexia (faltante en Supabase)
-- Ejecutar en SQL Editor de Supabase
-- Fecha: 2026-02-11
-- ============================================================================

-- Primero verificar qué tablas ya existen
SELECT tablename FROM pg_tables
WHERE tablename IN (
    'viajes_red_nodexia',
    'requisitos_viaje_red',
    'ofertas_red_nodexia',
    'preferencias_transporte_red',
    'historial_red_nodexia'
)
ORDER BY tablename;

-- ============================================================================
-- TABLA: ofertas_red_nodexia
-- ============================================================================
CREATE TABLE IF NOT EXISTS ofertas_red_nodexia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viaje_red_id UUID NOT NULL REFERENCES viajes_red_nodexia(id) ON DELETE CASCADE,
    transporte_id UUID NOT NULL REFERENCES empresas(id),
    
    -- Información de la oferta
    mensaje TEXT,
    camion_propuesto_id UUID,
    chofer_propuesto_id UUID,
    
    -- Estado de la oferta
    estado_oferta VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    -- Estados: 'pendiente', 'aceptada', 'rechazada', 'retirada', 'expirada'
    
    -- Fechas
    fecha_oferta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_respuesta TIMESTAMP WITH TIME ZONE,
    
    -- Usuario que realizó la oferta
    ofertado_por UUID REFERENCES auth.users(id),
    
    -- Metadata de matching
    score_matching DECIMAL(5, 2),
    distancia_origen_km DECIMAL(10, 2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_oferta_transporte UNIQUE(viaje_red_id, transporte_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ofertas_viaje_red ON ofertas_red_nodexia(viaje_red_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_transporte ON ofertas_red_nodexia(transporte_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_estado ON ofertas_red_nodexia(estado_oferta);
CREATE INDEX IF NOT EXISTS idx_ofertas_fecha ON ofertas_red_nodexia(fecha_oferta);

-- FK de oferta_aceptada_id en viajes_red_nodexia (solo si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_oferta_aceptada'
        AND table_name = 'viajes_red_nodexia'
    ) THEN
        ALTER TABLE viajes_red_nodexia 
        ADD CONSTRAINT fk_oferta_aceptada 
        FOREIGN KEY (oferta_aceptada_id) 
        REFERENCES ofertas_red_nodexia(id);
    END IF;
END $$;

-- ============================================================================
-- TABLA: historial_red_nodexia (necesaria para triggers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS historial_red_nodexia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viaje_red_id UUID REFERENCES viajes_red_nodexia(id) ON DELETE CASCADE,
    oferta_id UUID,
    accion VARCHAR(100) NOT NULL,
    descripcion TEXT,
    usuario_id UUID REFERENCES auth.users(id),
    empresa_id UUID REFERENCES empresas(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historial_viaje_red ON historial_red_nodexia(viaje_red_id);
CREATE INDEX IF NOT EXISTS idx_historial_accion ON historial_red_nodexia(accion);

-- ============================================================================
-- RLS Policies para ofertas_red_nodexia
-- ============================================================================
ALTER TABLE ofertas_red_nodexia ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_red_nodexia ENABLE ROW LEVEL SECURITY;

-- Transportes pueden crear ofertas
CREATE POLICY "Transportes crean ofertas"
    ON ofertas_red_nodexia FOR INSERT
    WITH CHECK (
        transporte_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

-- Transportes ven sus propias ofertas
CREATE POLICY "Transportes ven sus ofertas"
    ON ofertas_red_nodexia FOR SELECT
    USING (
        transporte_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

-- Plantas/Coordinadores ven ofertas de sus viajes
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

-- Historial: usuarios ven historial de su empresa
CREATE POLICY "Usuarios ven historial de su empresa"
    ON historial_red_nodexia FOR SELECT
    USING (
        empresa_id IN (
            SELECT empresa_id FROM usuarios_empresa 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- Trigger updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ofertas_updated_at ON ofertas_red_nodexia;
CREATE TRIGGER trigger_ofertas_updated_at
    BEFORE UPDATE ON ofertas_red_nodexia
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
SELECT tablename FROM pg_tables
WHERE tablename IN (
    'viajes_red_nodexia',
    'requisitos_viaje_red',
    'ofertas_red_nodexia',
    'historial_red_nodexia'
)
ORDER BY tablename;
