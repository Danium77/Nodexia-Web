-- ================================================
-- FIX COMPLETO: Recrear tabla notificaciones
-- Fecha: 10 de Noviembre 2025
-- Descripción: Eliminar tabla antigua y crear versión correcta sin empresa_id
-- ================================================

-- 1. Eliminar triggers existentes
DROP TRIGGER IF EXISTS trigger_notificacion_cancelacion ON viajes_despacho;
DROP TRIGGER IF EXISTS trigger_notificacion_viaje_asignado ON viajes_despacho;

-- 2. Eliminar funciones existentes
DROP FUNCTION IF EXISTS crear_notificacion_cancelacion() CASCADE;
DROP FUNCTION IF EXISTS crear_notificacion_viaje_asignado() CASCADE;
DROP FUNCTION IF EXISTS marcar_notificacion_leida(UUID) CASCADE;
DROP FUNCTION IF EXISTS marcar_todas_notificaciones_leidas() CASCADE;

-- 3. Eliminar tabla antigua
DROP TABLE IF EXISTS notificaciones CASCADE;

-- 4. Crear tabla nueva (sin empresa_id)
CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  leida_at TIMESTAMPTZ,
  
  -- Índices
  CONSTRAINT notificaciones_user_id_idx CHECK (user_id IS NOT NULL)
);

-- 5. Índices para performance
CREATE INDEX idx_notificaciones_user_id ON notificaciones(user_id);
CREATE INDEX idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX idx_notificaciones_created_at ON notificaciones(created_at DESC);
CREATE INDEX idx_notificaciones_tipo ON notificaciones(tipo);
CREATE INDEX idx_notificaciones_viaje_id ON notificaciones(viaje_id) WHERE viaje_id IS NOT NULL;

-- 6. Políticas RLS
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo ven sus propias notificaciones
CREATE POLICY notificaciones_select_own 
  ON notificaciones 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Política: Los usuarios solo pueden actualizar (marcar como leída) sus propias notificaciones
CREATE POLICY notificaciones_update_own 
  ON notificaciones 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Política: El sistema puede insertar notificaciones
CREATE POLICY notificaciones_insert_system 
  ON notificaciones 
  FOR INSERT 
  WITH CHECK (true);

-- 7. Función: Marcar notificación como leída
CREATE OR REPLACE FUNCTION marcar_notificacion_leida(p_notificacion_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notificaciones 
  SET 
    leida = true,
    leida_at = NOW()
  WHERE id = p_notificacion_id 
    AND user_id = auth.uid();
END;
$$;

-- 8. Función: Marcar todas las notificaciones como leídas
CREATE OR REPLACE FUNCTION marcar_todas_notificaciones_leidas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notificaciones 
  SET 
    leida = true,
    leida_at = NOW()
  WHERE user_id = auth.uid()
    AND leida = false;
END;
$$;

-- 9. Función: Crear notificación cuando transporte cancela viaje
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
    
    -- Insertar notificación (SIN empresa_id)
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
$$ LANGUAGE plpgsql;

-- 10. Función: Crear notificación cuando se asigna viaje a transporte
CREATE OR REPLACE FUNCTION crear_notificacion_viaje_asignado()
RETURNS TRIGGER AS $$
DECLARE
  v_despacho RECORD;
  v_coordinador_transporte_id UUID;
  v_titulo TEXT;
  v_mensaje TEXT;
BEGIN
  -- Solo crear notificación si el viaje fue asignado a un transporte
  IF NEW.estado = 'asignado' AND (OLD IS NULL OR OLD.estado != 'asignado') AND NEW.id_transporte IS NOT NULL THEN
    
    -- Obtener datos del despacho
    SELECT * INTO v_despacho
    FROM despachos
    WHERE id = NEW.despacho_id;
    
    IF v_despacho IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Obtener coordinador de transporte de la empresa transportista
    SELECT ue.user_id INTO v_coordinador_transporte_id
    FROM usuarios_empresa ue
    WHERE ue.empresa_id = NEW.id_transporte
      AND ue.rol_empresa_id IN (
        SELECT id FROM roles_empresa WHERE nombre = 'coordinador_transporte'
      )
    LIMIT 1;
    
    IF v_coordinador_transporte_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Crear mensaje
    v_titulo := '🚛 Nuevo Viaje Asignado';
    v_mensaje := format(
      'Se te ha asignado el viaje #%s del pedido %s',
      NEW.numero_viaje,
      v_despacho.pedido_id
    );
    
    -- Insertar notificación (SIN empresa_id)
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
      v_coordinador_transporte_id,
      'viaje_asignado',
      v_titulo,
      v_mensaje,
      NEW.id,
      NEW.despacho_id,
      v_despacho.pedido_id,
      jsonb_build_object(
        'numero_viaje', NEW.numero_viaje,
        'origen', v_despacho.origen,
        'destino', v_despacho.destino
      )
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Crear triggers
CREATE TRIGGER trigger_notificacion_cancelacion
  AFTER UPDATE ON viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION crear_notificacion_cancelacion();

CREATE TRIGGER trigger_notificacion_viaje_asignado
  AFTER INSERT OR UPDATE ON viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION crear_notificacion_viaje_asignado();

-- 12. Grant permissions
GRANT ALL ON notificaciones TO authenticated;
GRANT EXECUTE ON FUNCTION marcar_notificacion_leida(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION marcar_todas_notificaciones_leidas() TO authenticated;

-- Verificación
SELECT 'Tabla notificaciones recreada exitosamente' as status;
