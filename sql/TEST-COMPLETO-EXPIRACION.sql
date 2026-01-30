-- ============================================================================
-- TEST COMPLETO: Verificar trigger + ejecutar expiración + ver resultados
-- ============================================================================

-- 1. Verificar que el trigger existe
SELECT 
  'Trigger instalado' as check_trigger,
  tgname as trigger_name,
  tgrelid::regclass as tabla
FROM pg_trigger 
WHERE tgname = 'trigger_set_viaje_scheduled_at';

-- 2. Ver viajes con scheduled_at actualizado
SELECT 
  'Viajes con scheduled_at' as info,
  COUNT(*) as total_con_fecha,
  COUNT(*) FILTER (WHERE scheduled_at < NOW()) as pasados,
  COUNT(*) FILTER (WHERE scheduled_at >= NOW()) as futuros
FROM viajes_despacho
WHERE scheduled_at IS NOT NULL;

-- 3. Ver el viaje específico que debería expirar
SELECT 
  'Viaje programado 18:30' as info,
  vd.id,
  vd.scheduled_at,
  vd.scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires' as hora_local,
  NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires' as hora_actual,
  vd.estado_unidad,
  vd.chofer_id,
  vd.camion_id,
  CASE 
    WHEN vd.chofer_id IS NULL AND vd.camion_id IS NULL THEN '→ Debería ser EXPIRADO'
    ELSE '→ Debería ser FUERA DE HORARIO'
  END as resultado_esperado
FROM viajes_despacho vd
WHERE vd.scheduled_at IS NOT NULL
  AND vd.scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires' BETWEEN '2026-01-29 18:00:00' AND '2026-01-29 19:00:00'
ORDER BY vd.scheduled_at;

-- 4. Ejecutar función de expiración
SELECT 
  'Resultado de actualización' as info,
  viajes_actualizados,
  viajes_expirados,
  viajes_fuera_de_horario
FROM actualizar_estados_viajes();

-- 5. Ver métricas finales
SELECT 
  'Métricas finales' as info,
  total_expirados,
  total_fuera_de_horario,
  expirados_hoy,
  fuera_horario_hoy
FROM get_metricas_expiracion();

-- 6. Ver viajes actualizados
SELECT 
  'Viajes marcados' as info,
  vd.id,
  vd.scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires' as hora_programada,
  vd.estado_unidad,
  CASE 
    WHEN vd.chofer_id IS NOT NULL OR vd.camion_id IS NOT NULL THEN 'Con recursos'
    ELSE 'Sin recursos'
  END as recursos
FROM viajes_despacho vd
WHERE vd.estado_unidad IN ('expirado', 'fuera_de_horario')
ORDER BY vd.scheduled_at DESC
LIMIT 10;
