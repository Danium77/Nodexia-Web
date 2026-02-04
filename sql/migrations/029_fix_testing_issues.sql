-- ============================================================================
-- MIGRACIÓN 029: Fix Testing Issues - 02-Feb-2026
-- ============================================================================
-- Soluciona 4 errores encontrados durante testing:
-- 1. Tabla viajes_red_nodexia no existe
-- 2. Función get_viaje_estados_historial no existe
-- 3. Problema con columna distancia_km en despachos
-- ============================================================================

-- ============================================================================
-- 1. CREAR TABLA viajes_red_nodexia (Red Nodexia)
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
    oferta_aceptada_id UUID,
    
    -- Metadata
    publicado_por UUID REFERENCES auth.users(id),
    asignado_por UUID REFERENCES auth.users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT check_tarifa_positiva CHECK (tarifa_ofrecida > 0),
    CONSTRAINT unique_viaje_red UNIQUE(viaje_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_viajes_red_estado ON viajes_red_nodexia(estado_red);
CREATE INDEX IF NOT EXISTS idx_viajes_red_viaje ON viajes_red_nodexia(viaje_id);
CREATE INDEX IF NOT EXISTS idx_viajes_red_empresa ON viajes_red_nodexia(empresa_solicitante_id);
CREATE INDEX IF NOT EXISTS idx_viajes_red_transporte ON viajes_red_nodexia(transporte_asignado_id);
CREATE INDEX IF NOT EXISTS idx_viajes_red_fecha ON viajes_red_nodexia(fecha_publicacion);

-- ============================================================================
-- 2. RLS POLICIES para viajes_red_nodexia
-- ============================================================================
ALTER TABLE viajes_red_nodexia ENABLE ROW LEVEL SECURITY;

-- Plantas ven sus propios viajes publicados
CREATE POLICY "Plantas ven sus viajes en red"
    ON viajes_red_nodexia FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_empresa ue
            WHERE ue.user_id = auth.uid()
            AND ue.empresa_id = empresa_solicitante_id
        )
    );

-- Transportes ven viajes abiertos
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

-- Plantas crean viajes en red
CREATE POLICY "Plantas crean viajes en red"
    ON viajes_red_nodexia FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios_empresa ue
            WHERE ue.user_id = auth.uid()
            AND ue.empresa_id = empresa_solicitante_id
        )
    );

-- Plantas actualizan sus viajes
CREATE POLICY "Plantas actualizan sus viajes"
    ON viajes_red_nodexia FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_empresa ue
            WHERE ue.user_id = auth.uid()
            AND ue.empresa_id = empresa_solicitante_id
        )
    );

-- ============================================================================
-- 3. FUNCIÓN get_viaje_estados_historial (Historial de Estados)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_viaje_estados_historial(viaje_id_param BIGINT)
RETURNS TABLE (
    id BIGINT,
    viaje_id BIGINT,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50),
    cambiado_por_email TEXT,
    cambiado_por_rol VARCHAR(50),
    motivo TEXT,
    ubicacion_lat DECIMAL(10, 8),
    ubicacion_lon DECIMAL(11, 8),
    timestamp_cambio TIMESTAMPTZ,
    metadata JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae.id,
        ae.viaje_id::BIGINT,
        ae.estado_anterior::VARCHAR(50),
        ae.estado_nuevo::VARCHAR(50),
        COALESCE(u.email, 'Sistema')::TEXT as cambiado_por_email,
        COALESCE(ae.rol_usuario, 'sistema')::VARCHAR(50) as cambiado_por_rol,
        ae.motivo::TEXT,
        ae.ubicacion_latitud,
        ae.ubicacion_longitud,
        ae.created_at as timestamp_cambio,
        ae.metadata
    FROM auditoria_estados ae
    LEFT JOIN auth.users u ON u.id = ae.user_id
    WHERE ae.viaje_id = viaje_id_param
    ORDER BY ae.created_at DESC;
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION get_viaje_estados_historial(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_viaje_estados_historial(BIGINT) TO service_role;

COMMENT ON FUNCTION get_viaje_estados_historial(BIGINT) IS 
'Obtiene el historial completo de cambios de estado de un viaje con información del usuario que realizó el cambio';

-- ============================================================================
-- 4. VERIFICAR/CREAR TABLA auditoria_estados (si no existe)
-- ============================================================================
CREATE TABLE IF NOT EXISTS auditoria_estados (
    id BIGSERIAL PRIMARY KEY,
    viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    rol_usuario VARCHAR(50),
    motivo TEXT,
    ubicacion_latitud DECIMAL(10, 8),
    ubicacion_longitud DECIMAL(11, 8),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_auditoria_viaje ON auditoria_estados(viaje_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria_estados(created_at);
CREATE INDEX IF NOT EXISTS idx_auditoria_estado_nuevo ON auditoria_estados(estado_nuevo);

-- RLS
ALTER TABLE auditoria_estados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven auditoría de sus viajes" ON auditoria_estados
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM viajes_despacho vd
            JOIN despachos d ON d.id = vd.despacho_id
            JOIN usuarios_empresa ue ON ue.empresa_id = d.empresa_id
            WHERE vd.id = auditoria_estados.viaje_id
            AND ue.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM viajes_despacho vd
            WHERE vd.id = auditoria_estados.viaje_id
            AND vd.id_transporte IN (
                SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- 5. TRIGGER para registrar cambios de estado automáticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_registrar_cambio_estado()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo registrar si el estado cambió
    IF (TG_OP = 'INSERT') OR (OLD.estado IS DISTINCT FROM NEW.estado) THEN
        INSERT INTO auditoria_estados (
            viaje_id,
            estado_anterior,
            estado_nuevo,
            user_id,
            metadata
        ) VALUES (
            NEW.id,
            CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.estado END,
            NEW.estado,
            auth.uid(),
            jsonb_build_object(
                'operacion', TG_OP,
                'tabla', TG_TABLE_NAME,
                'timestamp', NOW()
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger
DROP TRIGGER IF EXISTS tr_viajes_cambio_estado ON viajes_despacho;
CREATE TRIGGER tr_viajes_cambio_estado
    AFTER INSERT OR UPDATE OF estado ON viajes_despacho
    FOR EACH ROW
    EXECUTE FUNCTION trigger_registrar_cambio_estado();

-- ============================================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================================================
COMMENT ON TABLE viajes_red_nodexia IS 'Gestiona la publicación de viajes en la Red Colaborativa Nodexia';
COMMENT ON TABLE auditoria_estados IS 'Registro histórico de todos los cambios de estado de viajes';

-- ============================================================================
-- FIN DE MIGRACIÓN 029
-- ============================================================================
