-- ================================================
-- FIX: Agregar alias user_id para notificaciones
-- Fecha: 10 de Noviembre 2025
-- Descripción: Compatibilidad con código que usa user_id
-- ================================================

-- Opción 1: Renombrar la columna de usuario_id a user_id
ALTER TABLE notificaciones 
RENAME COLUMN usuario_id TO user_id;

-- Actualizar los índices
DROP INDEX IF EXISTS idx_notificaciones_usuario_id;
CREATE INDEX idx_notificaciones_user_id ON notificaciones(user_id);

-- Actualizar las políticas RLS
DROP POLICY IF EXISTS notificaciones_select_own ON notificaciones;
DROP POLICY IF EXISTS notificaciones_update_own ON notificaciones;
DROP POLICY IF EXISTS notificaciones_insert_system ON notificaciones;

CREATE POLICY notificaciones_select_own 
  ON notificaciones 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY notificaciones_update_own 
  ON notificaciones 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY notificaciones_insert_system 
  ON notificaciones 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Actualizar la función crear_notificacion_cancelacion
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
    
    -- Insertar notificación (usando user_id)
    INSERT INTO notificaciones (
      user_id,
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

-- Actualizar función marcar_notificacion_leida
CREATE OR REPLACE FUNCTION marcar_notificacion_leida(p_notificacion_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notificaciones
  SET leida = TRUE,
      leida_at = NOW()
  WHERE id = p_notificacion_id
    AND user_id = auth.uid()
    AND leida = FALSE;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar función marcar_todas_notificaciones_leidas
CREATE OR REPLACE FUNCTION marcar_todas_notificaciones_leidas()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notificaciones
  SET leida = TRUE,
      leida_at = NOW()
  WHERE user_id = auth.uid()
    AND leida = FALSE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
