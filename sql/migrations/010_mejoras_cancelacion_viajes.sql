-- =====================================================
-- MIGRACIÓN 010: MEJORAS EN CANCELACIÓN DE VIAJES
-- Fecha: 6 de Noviembre 2025
-- Objetivo: Agregar estados nuevos, tabla de auditoría
--           y lógica de reasignación de viajes cancelados
-- =====================================================

-- PASO 1: Crear tabla de auditoría de viajes
CREATE TABLE IF NOT EXISTS viajes_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    viaje_id UUID REFERENCES viajes_despacho(id) ON DELETE CASCADE,
    despacho_id TEXT NOT NULL,
    pedido_id TEXT,
    accion TEXT NOT NULL CHECK (accion IN (
        'creado',
        'asignado_transporte',
        'asignado_recursos',
        'modificado',
        'cancelado_por_transporte',
        'cancelado_por_coordinador',
        'en_transito',
        'entregado',
        'rechazado'
    )),
    estado_anterior TEXT,
    estado_nuevo TEXT,
    usuario_id UUID REFERENCES auth.users(id),
    usuario_nombre TEXT,
    usuario_rol TEXT,
    motivo TEXT,
    recursos_antes JSONB,
    recursos_despues JSONB,
    metadata JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);

-- Índices para consultas rápidas
CREATE INDEX idx_viajes_auditoria_viaje ON viajes_auditoria(viaje_id);
CREATE INDEX idx_viajes_auditoria_fecha ON viajes_auditoria(timestamp DESC);
CREATE INDEX idx_viajes_auditoria_accion ON viajes_auditoria(accion);
CREATE INDEX idx_viajes_auditoria_usuario ON viajes_auditoria(usuario_id);
CREATE INDEX idx_viajes_auditoria_despacho ON viajes_auditoria(despacho_id);

-- PASO 2: Agregar columna para guardar el transporte que canceló (referencia histórica)
ALTER TABLE viajes_despacho 
ADD COLUMN IF NOT EXISTS id_transporte_cancelado UUID;

ALTER TABLE viajes_despacho 
ADD COLUMN IF NOT EXISTS fecha_cancelacion TIMESTAMPTZ;

ALTER TABLE viajes_despacho 
ADD COLUMN IF NOT EXISTS cancelado_por UUID REFERENCES auth.users(id);

ALTER TABLE viajes_despacho 
ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT;

-- PASO 3: Crear vista para viajes cancelados por transporte (para coordinador de planta)
CREATE OR REPLACE VIEW viajes_pendientes_reasignacion AS
SELECT 
    vd.*,
    d.pedido_id,
    d.origen,
    d.destino,
    d.scheduled_local_date,
    d.scheduled_local_time,
    d.prioridad,
    e.nombre as transporte_cancelado_nombre
FROM viajes_despacho vd
INNER JOIN despachos d ON vd.despacho_id = d.id
LEFT JOIN empresas e ON vd.id_transporte_cancelado = e.id
WHERE vd.estado = 'cancelado_por_transporte';

-- PASO 4: Políticas RLS para viajes_auditoria
ALTER TABLE viajes_auditoria ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden ver auditoría de sus propios viajes
CREATE POLICY "Usuarios ven auditoría de sus viajes"
    ON viajes_auditoria FOR SELECT
    USING (
        usuario_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM viajes_despacho vd
            INNER JOIN despachos d ON vd.despacho_id = d.id
            WHERE vd.id = viajes_auditoria.viaje_id
            AND d.created_by = auth.uid()
        )
    );

-- Política: Sistema puede insertar auditoría
CREATE POLICY "Sistema puede insertar auditoría"
    ON viajes_auditoria FOR INSERT
    WITH CHECK (true);

-- Política: Coordinadores y admins pueden ver auditoría
CREATE POLICY "Coordinadores ven auditoría"
    ON viajes_auditoria FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.id = auth.uid()
            AND u.rol IN ('coordinador_planta', 'coordinador_transporte', 'admin', 'super_admin')
        )
    );

-- PASO 5: Función para registrar automáticamente cambios de estado
CREATE OR REPLACE FUNCTION registrar_cambio_estado_viaje()
RETURNS TRIGGER AS $$
DECLARE
    v_despacho_id TEXT;
    v_pedido_id TEXT;
    v_usuario_nombre TEXT;
    v_usuario_rol TEXT;
BEGIN
    -- Obtener información del despacho
    SELECT d.id::TEXT, d.pedido_id 
    INTO v_despacho_id, v_pedido_id
    FROM despachos d 
    WHERE d.id = NEW.despacho_id;

    -- Obtener información del usuario actual
    SELECT u.nombre, u.rol
    INTO v_usuario_nombre, v_usuario_rol
    FROM usuarios u
    WHERE u.id = auth.uid();

    -- Solo registrar si hubo cambio de estado
    IF (TG_OP = 'UPDATE' AND OLD.estado != NEW.estado) OR TG_OP = 'INSERT' THEN
        INSERT INTO viajes_auditoria (
            viaje_id,
            despacho_id,
            pedido_id,
            accion,
            estado_anterior,
            estado_nuevo,
            usuario_id,
            usuario_nombre,
            usuario_rol,
            motivo,
            recursos_antes,
            recursos_despues,
            metadata
        ) VALUES (
            NEW.id,
            v_despacho_id,
            v_pedido_id,
            CASE 
                WHEN NEW.estado = 'cancelado_por_transporte' THEN 'cancelado_por_transporte'
                WHEN NEW.estado = 'cancelado' AND NEW.cancelado_por IS NOT NULL THEN 'cancelado_por_coordinador'
                WHEN NEW.estado = 'transporte_asignado' THEN 'asignado_transporte'
                WHEN NEW.estado = 'camion_asignado' THEN 'asignado_recursos'
                WHEN NEW.estado = 'en_transito' THEN 'en_transito'
                WHEN NEW.estado = 'entregado' THEN 'entregado'
                ELSE 'modificado'
            END,
            CASE WHEN TG_OP = 'UPDATE' THEN OLD.estado ELSE NULL END,
            NEW.estado,
            auth.uid(),
            v_usuario_nombre,
            v_usuario_rol,
            NEW.motivo_cancelacion,
            CASE WHEN TG_OP = 'UPDATE' THEN
                jsonb_build_object(
                    'transporte_id', OLD.id_transporte,
                    'chofer_id', OLD.id_chofer,
                    'camion_id', OLD.id_camion
                )
            ELSE NULL END,
            jsonb_build_object(
                'transporte_id', NEW.id_transporte,
                'chofer_id', NEW.id_chofer,
                'camion_id', NEW.id_camion
            ),
            jsonb_build_object(
                'observaciones', NEW.observaciones,
                'fecha_registro', NOW()
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para registrar cambios automáticamente
DROP TRIGGER IF EXISTS trigger_auditoria_viajes ON viajes_despacho;
CREATE TRIGGER trigger_auditoria_viajes
    AFTER INSERT OR UPDATE ON viajes_despacho
    FOR EACH ROW
    EXECUTE FUNCTION registrar_cambio_estado_viaje();

-- PASO 6: Comentarios para documentación
COMMENT ON TABLE viajes_auditoria IS 'Registro de auditoría completo de cambios en viajes';
COMMENT ON COLUMN viajes_auditoria.accion IS 'Tipo de acción realizada sobre el viaje';
COMMENT ON COLUMN viajes_auditoria.recursos_antes IS 'Estado de recursos (chofer, camión, transporte) antes del cambio';
COMMENT ON COLUMN viajes_auditoria.recursos_despues IS 'Estado de recursos después del cambio';
COMMENT ON COLUMN viajes_auditoria.metadata IS 'Información adicional flexible en formato JSON';

COMMENT ON VIEW viajes_pendientes_reasignacion IS 'Vista de viajes cancelados por transporte que requieren reasignación';

-- =====================================================
-- FIN DE MIGRACIÓN 010
-- =====================================================
