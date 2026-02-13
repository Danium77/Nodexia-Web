-- ================================================
-- FIX MIGRACIÓN 011: Sistema de Notificaciones
-- Fecha: 10 de Noviembre 2025
-- Descripción: Corrección para crear correctamente la tabla de notificaciones
-- ================================================

-- 1. LIMPIAR: Eliminar todo lo que se creó parcialmente
DROP TRIGGER IF EXISTS trigger_notificacion_cancelacion ON viajes_despacho;
DROP FUNCTION IF EXISTS crear_notificacion_cancelacion();
DROP FUNCTION IF EXISTS marcar_notificacion_leida(UUID);
DROP FUNCTION IF EXISTS marcar_todas_notificaciones_leidas();
DROP TABLE IF EXISTS notificaciones CASCADE;

-- 2. CREAR: Tabla de notificaciones
CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'viaje_cancelado',
    'viaje_asignado',
    'viaje_reasignado',
    'recursos_asignados',
    'cambio_estado',
    'mensaje_sistema'
  )),
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT FALSE,
  viaje_id UUID REFERENCES viajes_despacho(id) ON DELETE SET NULL,
  despacho_id TEXT,
  pedido_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  leida_at TIMESTAMPTZ
);

-- 3. ÍNDICES para performance
CREATE INDEX idx_notificaciones_usuario_id ON notificaciones(usuario_id);
CREATE INDEX idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX idx_notificaciones_created_at ON notificaciones(created_at DESC);
CREATE INDEX idx_notificaciones_tipo ON notificaciones(tipo);
CREATE INDEX idx_notificaciones_viaje_id ON notificaciones(viaje_id) WHERE viaje_id IS NOT NULL;

-- 4. POLÍTICAS RLS
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo ven sus propias notificaciones
CREATE POLICY notificaciones_select_own 
  ON notificaciones 
  FOR SELECT 
  USING (auth.uid() = usuario_id);

-- Política: Los usuarios solo pueden actualizar (marcar como leída) sus propias notificaciones
CREATE POLICY notificaciones_update_own 
  ON notificaciones 
  FOR UPDATE 
  USING (auth.uid() = usuario_id);

-- Política: Solo el sistema puede insertar notificaciones (mediante funciones)
CREATE POLICY notificaciones_insert_system 
  ON notificaciones 
  FOR INSERT 
  WITH CHECK (auth.uid() = usuario_id);

-- ================================================
-- FUNCIÓN: Crear notificación de cancelación
-- ================================================
CREATE OR REPLACE FUNCTION crear_notificacion_cancelacion()
RETURNS TRIGGER AS $$
DECLARE
  v_despacho RECORD;
  v_coordinador_planta_id UUID;
  v_titulo TEXT;
  v_mensaje TEXT;
BEGIN
  -- Solo crear notificación si el viaje fue cancelado por transporte
  IF NEW.estado = 'cancelado_por_transporte' AND OLD.estado != 'cancelado_por_transporte' THEN
    
    -- Obtener datos del despacho
    SELECT * INTO v_despacho
    FROM despachos
    WHERE id = NEW.despacho_id;
    
    IF v_despacho IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Obtener coordinador de planta de la empresa del despacho
    -- Nota: Ajustar según tu esquema de usuarios
    SELECT ue.user_id INTO v_coordinador_planta_id
    FROM usuarios_empresa ue
    WHERE ue.empresa_id = v_despacho.company_id
      AND ue.rol_empresa_id IN (
        SELECT id FROM roles_empresa WHERE nombre = 'coordinador_planta'
      )
    LIMIT 1;
    
    IF v_coordinador_planta_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Crear mensaje
    v_titulo := '⚠️ Viaje Cancelado por Transporte';
    v_mensaje := format(
      'El viaje #%s del pedido %s ha sido cancelado por el transporte. Motivo: %s',
      NEW.numero_viaje,
      v_despacho.pedido_id,
      COALESCE(NEW.motivo_cancelacion, 'No especificado')
    );
    
    -- Insertar notificación
    INSERT INTO notificaciones (
      usuario_id,
      tipo,
      titulo,
      mensaje,
      viaje_id,
      despacho_id,
      pedido_id,
      metadata
    ) VALUES (
      v_coordinador_planta_id,
      'viaje_cancelado',
      v_titulo,
      v_mensaje,
      NEW.id,
      NEW.despacho_id,
      v_despacho.pedido_id,
      jsonb_build_object(
        'numero_viaje', NEW.numero_viaje,
        'motivo', NEW.motivo_cancelacion,
        'transporte_cancelado_nombre', NEW.transporte_cancelado_nombre,
        'fecha_cancelacion', NEW.fecha_cancelacion
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- TRIGGER: Notificación automática al cancelar viaje
-- ================================================
CREATE TRIGGER trigger_notificacion_cancelacion
  AFTER UPDATE ON viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION crear_notificacion_cancelacion();

-- ================================================
-- FUNCIÓN: Marcar notificación como leída
-- ================================================
CREATE OR REPLACE FUNCTION marcar_notificacion_leida(p_notificacion_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notificaciones
  SET leida = TRUE,
      leida_at = NOW()
  WHERE id = p_notificacion_id
    AND usuario_id = auth.uid()
    AND leida = FALSE;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- FUNCIÓN: Marcar todas las notificaciones como leídas
-- ================================================
CREATE OR REPLACE FUNCTION marcar_todas_notificaciones_leidas()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notificaciones
  SET leida = TRUE,
      leida_at = NOW()
  WHERE usuario_id = auth.uid()
    AND leida = FALSE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- COMENTARIOS
-- ================================================

COMMENT ON TABLE notificaciones IS 'Notificaciones del sistema para usuarios';
COMMENT ON COLUMN notificaciones.tipo IS 'Tipo de notificación: viaje_cancelado, viaje_asignado, etc.';
COMMENT ON COLUMN notificaciones.leida IS 'Indica si la notificación ha sido leída por el usuario';
COMMENT ON COLUMN notificaciones.metadata IS 'Datos adicionales en formato JSON';

COMMENT ON FUNCTION crear_notificacion_cancelacion() IS 'Crea automáticamente notificaciones cuando un viaje es cancelado por transporte';
COMMENT ON FUNCTION marcar_notificacion_leida(UUID) IS 'Marca una notificación específica como leída';
COMMENT ON FUNCTION marcar_todas_notificaciones_leidas() IS 'Marca todas las notificaciones del usuario como leídas';
