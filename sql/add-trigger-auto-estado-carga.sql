-- =====================================================
-- TRIGGER: Crear estado_carga_viaje automáticamente
-- Fecha: 20 de Enero 2026
-- Objetivo: Crear registro en estado_carga_viaje al crear viaje
-- =====================================================

-- Función para crear estados automáticamente
CREATE OR REPLACE FUNCTION crear_estados_viaje_automatico()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear registro de estado CARGA
  INSERT INTO estado_carga_viaje (
    viaje_id,
    estado_carga,
    fecha_creacion
  ) VALUES (
    NEW.id,
    'pendiente',
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Crear estado_carga al crear viaje
DROP TRIGGER IF EXISTS trigger_crear_estados_viaje ON viajes_despacho;
CREATE TRIGGER trigger_crear_estados_viaje
AFTER INSERT ON viajes_despacho
FOR EACH ROW
EXECUTE FUNCTION crear_estados_viaje_automatico();

-- Verificar que se creó correctamente
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'viajes_despacho'
  AND trigger_name = 'trigger_crear_estados_viaje';
