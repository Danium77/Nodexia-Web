-- ============================================================================
-- TRIGGER: Llenar scheduled_at automáticamente en viajes_despacho
-- ============================================================================
-- Cuando se crea un viaje, copia la fecha/hora del despacho padre
-- ============================================================================

-- Función trigger
CREATE OR REPLACE FUNCTION set_viaje_scheduled_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_despacho_scheduled timestamp with time zone;
BEGIN
  -- Si el viaje ya tiene scheduled_at, no hacer nada
  IF NEW.scheduled_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener fecha/hora del despacho padre
  SELECT 
    CASE 
      -- Si el despacho tiene scheduled_date_time, usarlo
      WHEN d.scheduled_date_time IS NOT NULL THEN d.scheduled_date_time
      -- Si tiene local_date y local_time, combinarlos
      WHEN d.scheduled_local_date IS NOT NULL AND d.scheduled_local_time IS NOT NULL THEN
        (d.scheduled_local_date || ' ' || d.scheduled_local_time)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'
      -- Si tiene fecha_programada, usarla
      WHEN d.fecha_programada IS NOT NULL THEN d.fecha_programada
      ELSE NULL
    END
  INTO v_despacho_scheduled
  FROM despachos d
  WHERE d.id = NEW.despacho_id;

  -- Asignar al viaje
  NEW.scheduled_at := v_despacho_scheduled;
  
  RETURN NEW;
END;
$$;

-- Eliminar trigger si existe
DROP TRIGGER IF EXISTS trigger_set_viaje_scheduled_at ON viajes_despacho;

-- Crear trigger
CREATE TRIGGER trigger_set_viaje_scheduled_at
  BEFORE INSERT OR UPDATE OF despacho_id
  ON viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION set_viaje_scheduled_at();

-- ============================================================================
-- ACTUALIZAR viajes existentes que no tienen scheduled_at
-- ============================================================================

UPDATE viajes_despacho vd
SET scheduled_at = CASE 
  WHEN d.scheduled_date_time IS NOT NULL THEN d.scheduled_date_time
  WHEN d.scheduled_local_date IS NOT NULL AND d.scheduled_local_time IS NOT NULL THEN
    (d.scheduled_local_date || ' ' || d.scheduled_local_time)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'
  WHEN d.fecha_programada IS NOT NULL THEN d.fecha_programada
  ELSE NULL
END
FROM despachos d
WHERE vd.despacho_id = d.id
  AND vd.scheduled_at IS NULL;

-- Verificar viajes actualizados
SELECT 
  'Viajes actualizados con scheduled_at' as info,
  vd.id,
  d.scheduled_local_date,
  d.scheduled_local_time,
  vd.scheduled_at,
  vd.scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires' as hora_local
FROM viajes_despacho vd
JOIN despachos d ON d.id = vd.despacho_id
WHERE vd.scheduled_at IS NOT NULL
ORDER BY vd.created_at DESC
LIMIT 10;
