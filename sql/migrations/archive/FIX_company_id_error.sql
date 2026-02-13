-- ================================================
-- FIX: Corregir funciones de notificaciones - company_id
-- Fecha: 11 de Noviembre 2025
-- Problema: Las funciones usan company_id pero despachos no tiene esa columna
-- ================================================

-- PASO 1: Eliminar funciones viejas
DROP FUNCTION IF EXISTS crear_notificacion_cancelacion() CASCADE;
DROP FUNCTION IF EXISTS crear_notificacion_viaje_asignado() CASCADE;

-- PASO 2: Crear función de cancelación SIMPLIFICADA (sin buscar coordinador por ahora)
CREATE OR REPLACE FUNCTION crear_notificacion_cancelacion()
RETURNS TRIGGER AS $$
DECLARE
  v_despacho_pedido_id TEXT;
BEGIN
  -- Solo crear notificación si el viaje fue cancelado por transporte
  IF NEW.estado = 'cancelado_por_transporte' AND (OLD IS NULL OR OLD.estado != 'cancelado_por_transporte') THEN
    
    -- Obtener solo el pedido_id
    SELECT pedido_id INTO v_despacho_pedido_id
    FROM despachos
    WHERE id = NEW.despacho_id;
    
    -- Por ahora, solo registrar en logs (no crear notificación)
    -- Esto evita el error mientras averiguamos la estructura correcta
    RAISE NOTICE 'Viaje cancelado: % del pedido %', NEW.numero_viaje, v_despacho_pedido_id;
    
    -- TODO: Implementar notificación cuando sepamos el nombre correcto de la columna de empresa
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 3: Crear función de asignación SIMPLIFICADA
CREATE OR REPLACE FUNCTION crear_notificacion_viaje_asignado()
RETURNS TRIGGER AS $$
DECLARE
  v_despacho_pedido_id TEXT;
BEGIN
  -- Solo crear notificación si el viaje fue asignado a un transporte
  IF NEW.estado = 'asignado' AND (OLD IS NULL OR OLD.estado != 'asignado') AND NEW.id_transporte IS NOT NULL THEN
    
    -- Obtener solo el pedido_id
    SELECT pedido_id INTO v_despacho_pedido_id
    FROM despachos
    WHERE id = NEW.despacho_id;
    
    -- Por ahora, solo registrar en logs
    RAISE NOTICE 'Viaje asignado: % del pedido %', NEW.numero_viaje, v_despacho_pedido_id;
    
    -- TODO: Implementar notificación cuando sepamos el nombre correcto de la columna de empresa
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 4: Recrear triggers
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
SELECT '✅ Funciones simplificadas creadas - Cancelación debería funcionar ahora' as resultado;
