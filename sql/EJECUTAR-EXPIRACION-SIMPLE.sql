-- ============================================================================
-- EJECUTAR EXPIRACIÓN - VERSION SIMPLIFICADA
-- ============================================================================

-- 1. Verificar hora actual
SELECT 
  'Hora actual' as info,
  NOW() as hora_utc,
  NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires' as hora_argentina;

-- 2. Ver TODOS los viajes que deberían estar expirados o fuera de horario
SELECT 
  'ANTES de ejecutar función' as momento,
  vd.id as viaje_id,
  vd.viaje_numero,
  vd.scheduled_local_date,
  vd.scheduled_local_time,
  vd.estado_unidad,
  CASE 
    WHEN vd.chofer_id IS NOT NULL OR vd.camion_id IS NOT NULL THEN 'CON recursos'
    ELSE 'SIN recursos'
  END as tiene_recursos,
  (vd.scheduled_local_date || ' ' || vd.scheduled_local_time)::timestamp as fecha_programada,
  (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::timestamp as ahora_local,
  (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::timestamp > 
    (vd.scheduled_local_date || ' ' || vd.scheduled_local_time)::timestamp as ya_paso_la_hora
FROM viajes_despacho vd
WHERE vd.scheduled_local_date IS NOT NULL
  AND vd.scheduled_local_time IS NOT NULL
  AND (vd.scheduled_local_date || ' ' || vd.scheduled_local_time)::timestamp < 
      (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::timestamp
  AND vd.estado_unidad NOT IN ('expirado', 'fuera_de_horario', 'en_curso', 'finalizado', 'cancelado')
ORDER BY vd.scheduled_local_date, vd.scheduled_local_time;

-- 3. Ejecutar función de expiración
SELECT actualizar_estados_viajes() as resultado;

-- 4. Ver los mismos viajes DESPUÉS de ejecutar
SELECT 
  'DESPUÉS de ejecutar función' as momento,
  vd.id as viaje_id,
  vd.viaje_numero,
  vd.scheduled_local_date,
  vd.scheduled_local_time,
  vd.estado_unidad,
  CASE 
    WHEN vd.chofer_id IS NOT NULL OR vd.camion_id IS NOT NULL THEN 'CON recursos'
    ELSE 'SIN recursos'
  END as tiene_recursos
FROM viajes_despacho vd
WHERE vd.scheduled_local_date IS NOT NULL
  AND vd.scheduled_local_time IS NOT NULL
  AND (vd.scheduled_local_date || ' ' || vd.scheduled_local_time)::timestamp < 
      (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::timestamp
ORDER BY vd.scheduled_local_date, vd.scheduled_local_time;
