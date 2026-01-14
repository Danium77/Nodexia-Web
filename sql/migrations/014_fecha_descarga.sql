-- ============================================================================
-- MIGRACIÓN 014: Fecha Programada de Descarga
-- ============================================================================
-- Agrega campos para fecha/hora programada de descarga
-- ============================================================================

BEGIN;

-- 1. Agregar columnas a tabla despachos
ALTER TABLE despachos
  ADD COLUMN IF NOT EXISTS delivery_scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS delivery_scheduled_time TIME,
  ADD COLUMN IF NOT EXISTS delivery_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_window_hours INT DEFAULT 2; -- Ventana de tolerancia

-- 2. Comentarios para documentación
COMMENT ON COLUMN despachos.delivery_scheduled_date IS 'Fecha programada de descarga (formato local)';
COMMENT ON COLUMN despachos.delivery_scheduled_time IS 'Hora programada de descarga (formato local)';
COMMENT ON COLUMN despachos.delivery_scheduled_at IS 'Timestamp completo de descarga programada (UTC)';
COMMENT ON COLUMN despachos.delivery_window_hours IS 'Ventana de tolerancia en horas para la descarga';

-- 3. Índice para búsquedas por fecha de descarga
CREATE INDEX IF NOT EXISTS idx_despachos_delivery_scheduled 
ON despachos (delivery_scheduled_at) 
WHERE delivery_scheduled_at IS NOT NULL;

-- 4. Función para calcular si está en ventana de descarga
CREATE OR REPLACE FUNCTION esta_en_ventana_descarga(
  p_delivery_scheduled_at TIMESTAMPTZ,
  p_window_hours INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_delivery_scheduled_at IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN NOW() BETWEEN 
    (p_delivery_scheduled_at - (p_window_hours || ' hours')::INTERVAL) AND
    (p_delivery_scheduled_at + (p_window_hours || ' hours')::INTERVAL);
END;
$$;

-- 5. Vista para despachos con información de descarga
CREATE OR REPLACE VIEW vista_despachos_con_descarga AS
SELECT 
  d.*,
  CASE
    WHEN d.delivery_scheduled_at IS NULL THEN NULL
    WHEN NOW() < d.delivery_scheduled_at - (d.delivery_window_hours || ' hours')::INTERVAL THEN 'anticipado'
    WHEN esta_en_ventana_descarga(d.delivery_scheduled_at, d.delivery_window_hours) THEN 'en_ventana'
    WHEN NOW() > d.delivery_scheduled_at + (d.delivery_window_hours || ' hours')::INTERVAL THEN 'retrasado'
    ELSE 'pendiente'
  END AS delivery_status,
  CASE
    WHEN d.delivery_scheduled_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (d.delivery_scheduled_at - NOW())) / 3600
    ELSE NULL
  END AS horas_hasta_descarga
FROM despachos d;

COMMENT ON VIEW vista_despachos_con_descarga IS 
'Vista con información enriquecida sobre el estado de las descargas programadas';

-- 6. Trigger para sincronizar campos de fecha/hora
CREATE OR REPLACE FUNCTION sync_delivery_scheduled_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si se actualiza delivery_scheduled_at, sincronizar date y time
  IF NEW.delivery_scheduled_at IS DISTINCT FROM OLD.delivery_scheduled_at THEN
    NEW.delivery_scheduled_date := (NEW.delivery_scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE;
    NEW.delivery_scheduled_time := (NEW.delivery_scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::TIME;
  END IF;
  
  -- Si se actualizan date y time, reconstruir delivery_scheduled_at
  IF (NEW.delivery_scheduled_date IS DISTINCT FROM OLD.delivery_scheduled_date 
      OR NEW.delivery_scheduled_time IS DISTINCT FROM OLD.delivery_scheduled_time)
     AND NEW.delivery_scheduled_date IS NOT NULL 
     AND NEW.delivery_scheduled_time IS NOT NULL THEN
    NEW.delivery_scheduled_at := (NEW.delivery_scheduled_date || ' ' || NEW.delivery_scheduled_time)::TIMESTAMP 
      AT TIME ZONE 'America/Argentina/Buenos_Aires';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_delivery_scheduled ON despachos;
CREATE TRIGGER trigger_sync_delivery_scheduled
  BEFORE INSERT OR UPDATE ON despachos
  FOR EACH ROW
  EXECUTE FUNCTION sync_delivery_scheduled_fields();

COMMIT;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Ver columnas agregadas
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'despachos' 
  AND column_name LIKE 'delivery%'
ORDER BY ordinal_position;

-- Ejemplo de uso
/*
-- Actualizar un despacho con fecha de descarga
UPDATE despachos
SET delivery_scheduled_date = '2026-01-10',
    delivery_scheduled_time = '14:00:00',
    delivery_window_hours = 2
WHERE pedido_id = 'DSP-20260109-001';

-- Ver estado de descarga
SELECT 
  pedido_id,
  delivery_scheduled_at,
  delivery_status,
  horas_hasta_descarga
FROM vista_despachos_con_descarga
WHERE delivery_scheduled_at IS NOT NULL;
*/
