-- ============================================================================
-- FIX: TRIGGER DE NOTIFICACIONES - Corregir ch.user_id
-- Fecha: 2025-11-02
-- Problema: El trigger usa ch.user_id pero choferes no tiene esa columna
-- Solución: Usar ch.id_transporte que es el user_id del transportista
-- ============================================================================

CREATE OR REPLACE FUNCTION notificar_cambio_estado_viaje()
RETURNS TRIGGER AS $$
DECLARE
  v_pedido_id VARCHAR(50);
  v_numero_viaje INTEGER;
  v_chofer_transporte_id UUID;
BEGIN
  -- Solo si cambió el estado
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    
    -- Obtener pedido_id y numero_viaje
    SELECT d.pedido_id INTO v_pedido_id
    FROM despachos d
    WHERE d.id = NEW.despacho_id;
    
    v_numero_viaje := NEW.numero_viaje;
    
    -- Obtener id_transporte del chofer (que es el user_id del transportista dueño)
    -- Los choferes NO tienen user_id propio, pertenecen al transportista
    SELECT ch.id_transporte INTO v_chofer_transporte_id
    FROM choferes ch
    WHERE ch.id = NEW.id_chofer;
    
    -- Notificar al transportista dueño del chofer (si existe)
    IF v_chofer_transporte_id IS NOT NULL THEN
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
        v_chofer_transporte_id,
        NEW.id_transporte,
        'cambio_estado',
        'Estado del viaje actualizado',
        format('Viaje #%s (Pedido: %s) cambió a: %s', v_numero_viaje, v_pedido_id, NEW.estado),
        NEW.id,
        NEW.despacho_id,
        v_pedido_id
      );
    END IF;
    
    -- Notificar a coordinadores de la empresa (si existe tabla usuarios_empresa)
    -- Comentado porque usuarios_empresa no existe
    /*
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
    AND ue.user_id != COALESCE(v_chofer_transporte_id, '00000000-0000-0000-0000-000000000000'::UUID);
    */
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
DROP TRIGGER IF EXISTS trigger_notificar_cambio_estado ON viajes_despacho;
CREATE TRIGGER trigger_notificar_cambio_estado
  AFTER UPDATE ON viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION notificar_cambio_estado_viaje();

-- Verificar que el trigger se creó correctamente
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'viajes_despacho';
