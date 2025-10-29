-- =====================================================
-- TABLA: notificaciones
-- Descripción: Notificaciones para usuarios del sistema
-- =====================================================

-- Crear tabla notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- 'nuevo_despacho', 'cambio_estado', 'recordatorio', 'alerta', 'documento_subido'
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT FALSE,
  
  -- Referencias opcionales
  viaje_id UUID REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  despacho_id UUID REFERENCES despachos(id) ON DELETE CASCADE,
  pedido_id VARCHAR(50),
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  leida_at TIMESTAMP WITH TIME ZONE,
  
  -- Índices para búsquedas rápidas
  CHECK (tipo IN ('nuevo_despacho', 'cambio_estado', 'recordatorio', 'alerta', 'documento_subido', 'asignacion_viaje', 'viaje_completado'))
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_notificaciones_user_id ON notificaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_empresa_id ON notificaciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_created_at ON notificaciones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_viaje_id ON notificaciones(viaje_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_despacho_id ON notificaciones(despacho_id);

-- =====================================================
-- RLS POLICIES para notificaciones
-- =====================================================

ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios pueden ver sus propias notificaciones
CREATE POLICY "Usuarios ven sus notificaciones"
  ON notificaciones
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    -- O si pertenece a la empresa de la notificación
    empresa_id IN (
      SELECT empresa_id 
      FROM usuarios_empresa 
      WHERE user_id = auth.uid() 
      AND activo = TRUE
    )
  );

-- Policy: El sistema puede crear notificaciones para cualquier usuario
CREATE POLICY "Sistema crea notificaciones"
  ON notificaciones
  FOR INSERT
  WITH CHECK (TRUE);

-- Policy: Los usuarios pueden actualizar (marcar como leída) sus propias notificaciones
CREATE POLICY "Usuarios actualizan sus notificaciones"
  ON notificaciones
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Los usuarios pueden eliminar sus propias notificaciones
CREATE POLICY "Usuarios eliminan sus notificaciones"
  ON notificaciones
  FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- FUNCIONES HELPER
-- =====================================================

-- Función para obtener count de notificaciones no leídas
CREATE OR REPLACE FUNCTION get_notificaciones_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notificaciones
    WHERE user_id = p_user_id
    AND leida = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para marcar todas las notificaciones como leídas
CREATE OR REPLACE FUNCTION marcar_todas_leidas(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE notificaciones
  SET leida = TRUE,
      leida_at = NOW()
  WHERE user_id = p_user_id
  AND leida = FALSE;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear notificación automática al cambiar estado de viaje
CREATE OR REPLACE FUNCTION notificar_cambio_estado_viaje()
RETURNS TRIGGER AS $$
DECLARE
  v_pedido_id VARCHAR(50);
  v_numero_viaje INTEGER;
  v_chofer_user_id UUID;
  v_coordinador_user_id UUID;
BEGIN
  -- Solo si cambió el estado
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    
    -- Obtener pedido_id y numero_viaje
    SELECT d.pedido_id INTO v_pedido_id
    FROM despachos d
    WHERE d.id = NEW.despacho_id;
    
    v_numero_viaje := NEW.numero_viaje;
    
    -- Obtener user_id del chofer (si existe)
    SELECT ch.user_id INTO v_chofer_user_id
    FROM choferes ch
    WHERE ch.id = NEW.id_chofer;
    
    -- Notificar al chofer
    IF v_chofer_user_id IS NOT NULL THEN
      INSERT INTO notificaciones (
        user_id,
        empresa_id,
        tipo,
        titulo,
        mensaje,
        viaje_id,
        despacho_id,
        pedido_id
      ) VALUES (
        v_chofer_user_id,
        NEW.id_transporte,
        'cambio_estado',
        'Estado del viaje actualizado',
        format('Tu viaje #%s (Pedido: %s) cambió a: %s', v_numero_viaje, v_pedido_id, NEW.estado),
        NEW.id,
        NEW.despacho_id,
        v_pedido_id
      );
    END IF;
    
    -- Notificar a coordinadores de la empresa (usuarios con rol coordinador)
    INSERT INTO notificaciones (
      user_id,
      empresa_id,
      tipo,
      titulo,
      mensaje,
      viaje_id,
      despacho_id,
      pedido_id
    )
    SELECT 
      ue.user_id,
      NEW.id_transporte,
      'cambio_estado',
      'Cambio de estado en viaje',
      format('Viaje #%s (Pedido: %s) cambió a: %s', v_numero_viaje, v_pedido_id, NEW.estado),
      NEW.id,
      NEW.despacho_id,
      v_pedido_id
    FROM usuarios_empresa ue
    WHERE ue.empresa_id = NEW.id_transporte
    AND ue.activo = TRUE
    AND ue.rol_interno IN ('administrador_transporte', 'supervisor_transporte')
    AND ue.user_id != COALESCE(v_chofer_user_id, '00000000-0000-0000-0000-000000000000'::UUID);
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para notificar cambios de estado
DROP TRIGGER IF EXISTS trigger_notificar_cambio_estado ON viajes_despacho;
CREATE TRIGGER trigger_notificar_cambio_estado
  AFTER UPDATE ON viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION notificar_cambio_estado_viaje();

-- =====================================================
-- FUNCIÓN PARA LIMPIAR NOTIFICACIONES ANTIGUAS
-- =====================================================

-- Función para eliminar notificaciones leídas mayores a 30 días
CREATE OR REPLACE FUNCTION limpiar_notificaciones_antiguas()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  DELETE FROM notificaciones
  WHERE leida = TRUE
  AND leida_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON TABLE notificaciones IS 'Notificaciones del sistema para usuarios';
COMMENT ON COLUMN notificaciones.tipo IS 'Tipo de notificación: nuevo_despacho, cambio_estado, recordatorio, alerta, documento_subido, asignacion_viaje, viaje_completado';
COMMENT ON COLUMN notificaciones.leida IS 'Indica si la notificación fue leída por el usuario';
COMMENT ON FUNCTION get_notificaciones_count IS 'Obtiene el conteo de notificaciones no leídas de un usuario';
COMMENT ON FUNCTION marcar_todas_leidas IS 'Marca todas las notificaciones de un usuario como leídas';
COMMENT ON FUNCTION notificar_cambio_estado_viaje IS 'Crea notificaciones automáticas cuando cambia el estado de un viaje';
COMMENT ON FUNCTION limpiar_notificaciones_antiguas IS 'Elimina notificaciones leídas con más de 30 días de antigüedad';
