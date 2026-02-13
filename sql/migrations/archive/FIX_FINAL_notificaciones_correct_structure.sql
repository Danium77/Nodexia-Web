-- ================================================
-- FIX FINAL: Funciones de notificaciones con estructura correcta
-- Fecha: 11 de Noviembre 2025
-- Solución: Obtener empresa desde usuarios_empresa usando created_by
-- ================================================

-- Eliminar funciones antiguas
DROP FUNCTION IF EXISTS crear_notificacion_cancelacion() CASCADE;
DROP FUNCTION IF EXISTS crear_notificacion_viaje_asignado() CASCADE;

-- Función: Notificación cuando transporte cancela viaje
CREATE OR REPLACE FUNCTION crear_notificacion_cancelacion()
RETURNS TRIGGER AS $$
DECLARE
  v_despacho RECORD;
  v_coordinador_planta_id UUID;
  v_empresa_planta_id UUID;
  v_titulo TEXT;
  v_mensaje TEXT;
BEGIN
  -- Solo crear notificación si el viaje fue cancelado por transporte
  IF NEW.estado = 'cancelado_por_transporte' AND (OLD IS NULL OR OLD.estado != 'cancelado_por_transporte') THEN
    
    -- Obtener datos del despacho
    SELECT * INTO v_despacho
    FROM despachos
    WHERE id = NEW.despacho_id;
    
    IF v_despacho IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Obtener empresa del usuario que creó el despacho (coordinador planta)
    SELECT empresa_id INTO v_empresa_planta_id
    FROM usuarios_empresa
    WHERE user_id = v_despacho.created_by
    LIMIT 1;
    
    IF v_empresa_planta_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Obtener coordinador de planta de la empresa
    SELECT ue.user_id INTO v_coordinador_planta_id
    FROM usuarios_empresa ue
    WHERE ue.empresa_id = v_empresa_planta_id
      AND ue.rol_empresa_id IN (
        SELECT id FROM roles_empresa WHERE nombre = 'coordinador_planta'
      )
    LIMIT 1;
    
    IF v_coordinador_planta_id IS NULL THEN
      -- Si no hay coordinador específico, notificar al creador del despacho
      v_coordinador_planta_id := v_despacho.created_by;
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

-- Función: Notificación cuando se asigna viaje a transporte
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
    
    -- Insertar notificación
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

-- Recrear triggers
DROP TRIGGER IF EXISTS trigger_notificacion_cancelacion ON viajes_despacho;
DROP TRIGGER IF EXISTS trigger_notificacion_viaje_asignado ON viajes_despacho;

CREATE TRIGGER trigger_notificacion_cancelacion
  AFTER UPDATE ON viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION crear_notificacion_cancelacion();

CREATE TRIGGER trigger_notificacion_viaje_asignado
  AFTER INSERT OR UPDATE ON viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION crear_notificacion_viaje_asignado();

-- Verificación
SELECT '✅ Funciones con estructura correcta creadas - Sistema de notificaciones completo' as resultado;
