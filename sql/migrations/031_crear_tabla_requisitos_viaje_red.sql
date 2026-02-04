-- ============================================================================
-- MIGRATION 031: Crear tabla requisitos_viaje_red
-- ============================================================================
-- Descripción: Tabla para requisitos técnicos de viajes en Red Nodexia
-- Fecha: 2026-02-02
-- ============================================================================

-- TABLA: requisitos_viaje_red
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_requisitos_viaje_red ON requisitos_viaje_red(viaje_red_id);
CREATE INDEX IF NOT EXISTS idx_requisitos_tipo_camion ON requisitos_viaje_red(tipo_camion);
CREATE INDEX IF NOT EXISTS idx_requisitos_tipo_carga ON requisitos_viaje_red(tipo_carga);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_requisitos_viaje_red_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_requisitos_updated_at ON requisitos_viaje_red;
CREATE TRIGGER trigger_update_requisitos_updated_at
    BEFORE UPDATE ON requisitos_viaje_red
    FOR EACH ROW
    EXECUTE FUNCTION update_requisitos_viaje_red_updated_at();

-- RLS Policies
ALTER TABLE requisitos_viaje_red ENABLE ROW LEVEL SECURITY;

-- Policy: Ver requisitos de viajes accesibles
CREATE POLICY "Ver requisitos de viajes accesibles"
    ON requisitos_viaje_red FOR SELECT
    USING (true); -- Todos pueden ver requisitos de viajes en la red

-- Policy: Crear requisitos (solo empresa solicitante)
CREATE POLICY "Crear requisitos de viaje"
    ON requisitos_viaje_red FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM viajes_red_nodexia vrn
            INNER JOIN usuarios_empresa ue ON ue.empresa_id = vrn.empresa_solicitante_id
            WHERE vrn.id = viaje_red_id
            AND ue.user_id = auth.uid()
            AND ue.activo = true
        )
    );

-- Policy: Actualizar requisitos (solo empresa solicitante)
CREATE POLICY "Actualizar requisitos de viaje"
    ON requisitos_viaje_red FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM viajes_red_nodexia vrn
            INNER JOIN usuarios_empresa ue ON ue.empresa_id = vrn.empresa_solicitante_id
            WHERE vrn.id = viaje_red_id
            AND ue.user_id = auth.uid()
            AND ue.activo = true
        )
    );

-- Comentarios
COMMENT ON TABLE requisitos_viaje_red IS 'Requisitos técnicos y certificaciones necesarias para viajes en red';
COMMENT ON COLUMN requisitos_viaje_red.tipo_camion IS 'Tipo de camión requerido (Semirremolque, Chasis, etc.)';
COMMENT ON COLUMN requisitos_viaje_red.tipo_acoplado IS 'Tipo de acoplado requerido (Sider, Caja seca, Tolva, etc.)';
COMMENT ON COLUMN requisitos_viaje_red.tipo_carga IS 'Tipo de carga a transportar (Granos, Contenedor, General, etc.)';

-- ============================================================================
-- FIN MIGRATION 031
-- ============================================================================
