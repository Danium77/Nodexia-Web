-- ============================================================================
-- EJECUTAR EXPIRACIÓN DE VIAJES MANUALMENTE
-- ============================================================================

-- 1. Verificar hora actual
SELECT 
  'Hora actual UTC' as info,
  NOW() as hora_utc,
  NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires' as hora_argentina;

-- 2. Ver estado ANTES de ejecutar función
SELECT 
  'ANTES de ejecutar función' as momento,
  codigo_despacho,
  viaje_numero,
  scheduled_local_date,
  scheduled_local_time,
  estado_unidad,
  CASE 
    WHEN chofer_id IS NOT NULL OR camion_id IS NOT NULL THEN 'Tiene recursos'
    ELSE 'Sin recursos'
  END as recursos,
  (scheduled_local_date || ' ' || scheduled_local_time)::timestamp as fecha_programada,
  (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::timestamp as ahora_argentina,
  (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::timestamp > 
    (scheduled_local_date || ' ' || scheduled_local_time)::timestamp as esta_vencido
FROM viajes_despacho
WHERE codigo_despacho = 'DSP-20260129-001'
ORDER BY viaje_numero;

-- 3. Ejecutar función de expiración
SELECT actualizar_estados_viajes();

-- 4. Ver estado DESPUÉS de ejecutar función
SELECT 
  'DESPUÉS de ejecutar función' as momento,
  codigo_despacho,
  viaje_numero,
  scheduled_local_date,
  scheduled_local_time,
  estado_unidad,
  CASE 
    WHEN chofer_id IS NOT NULL OR camion_id IS NOT NULL THEN 'Tiene recursos'
    ELSE 'Sin recursos'
  END as recursos
FROM viajes_despacho
WHERE codigo_despacho = 'DSP-20260129-001'
ORDER BY viaje_numero;
