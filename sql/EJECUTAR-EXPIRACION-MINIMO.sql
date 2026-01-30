-- ============================================================================
-- EJECUTAR EXPIRACIÓN - VERSION ULTRA SIMPLE (solo columnas básicas)
-- ============================================================================

-- 1. Hora actual
SELECT NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires' as hora_argentina_ahora;

-- 2. Ver viajes ANTES
SELECT 
  id,
  scheduled_local_date,
  scheduled_local_time,
  estado_unidad,
  chofer_id,
  camion_id
FROM viajes_despacho
WHERE scheduled_local_date = '2026-01-29'
  AND scheduled_local_time = '18:30:00';

-- 3. Ejecutar función
SELECT actualizar_estados_viajes();

-- 4. Ver viajes DESPUÉS
SELECT 
  id,
  scheduled_local_date,
  scheduled_local_time,
  estado_unidad,
  chofer_id,
  camion_id
FROM viajes_despacho
WHERE scheduled_local_date = '2026-01-29'
  AND scheduled_local_time = '18:30:00';
