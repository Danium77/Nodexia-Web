-- ============================================================================
-- EJECUTAR ACTUALIZACIÓN DE ESTADOS PASO A PASO
-- ============================================================================

-- PASO 1: Ver hora actual
SELECT 
  'PASO 1: Hora actual' as paso,
  NOW() as utc,
  NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires' as argentina;

-- PASO 2: Ver viajes programados que ya pasaron su hora
SELECT 
  'PASO 2: Viajes con hora vencida' as paso,
  id,
  scheduled_at,
  scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires' as hora_local,
  estado,
  estado_unidad,
  chofer_id,
  camion_id,
  CASE 
    WHEN chofer_id IS NULL AND camion_id IS NULL THEN '❌ SIN recursos → EXPIRADO'
    ELSE '⚠️ CON recursos → FUERA DE HORARIO'
  END as accion_esperada
FROM viajes_despacho
WHERE scheduled_at < (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')
  AND estado_unidad NOT IN ('expirado', 'fuera_de_horario', 'en_curso', 'finalizado', 'cancelado')
  AND estado NOT IN ('cancelado', 'finalizado')
ORDER BY scheduled_at DESC
LIMIT 10;

-- PASO 3: Ejecutar función de actualización
SELECT 
  'PASO 3: Ejecutando actualización...' as paso,
  * 
FROM actualizar_estados_viajes();

-- PASO 4: Ver métricas actualizadas
SELECT 
  'PASO 4: Métricas después de actualizar' as paso,
  * 
FROM get_metricas_expiracion();

-- PASO 5: Ver viajes que cambiaron de estado
SELECT 
  'PASO 5: Viajes actualizados' as paso,
  id,
  scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires' as hora_programada,
  estado_unidad,
  chofer_id,
  camion_id
FROM viajes_despacho
WHERE estado_unidad IN ('expirado', 'fuera_de_horario')
ORDER BY scheduled_at DESC
LIMIT 10;
