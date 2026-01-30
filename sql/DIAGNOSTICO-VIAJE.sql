-- Diagnóstico completo: ¿Por qué no se marca como expirado?
SELECT 
  'Estado actual del viaje' as check_,
  vd.id,
  vd.scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires' as hora_programada,
  NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires' as hora_actual,
  vd.scheduled_at < NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires' as "hora_ya_paso",
  vd.estado_unidad,
  vd.estado,
  vd.estado_tracking,
  vd.chofer_id,
  vd.camion_id,
  CASE 
    WHEN vd.chofer_id IS NULL AND vd.camion_id IS NULL THEN '✅ Sin recursos → debe ser EXPIRADO'
    ELSE '⚠️ Con recursos → debe ser FUERA DE HORARIO'
  END as deberia_ser,
  -- Verificar cada condición de la función
  CASE WHEN vd.scheduled_at IS NULL THEN '❌ scheduled_at es NULL' ELSE '✅ scheduled_at OK' END as condicion_1,
  CASE WHEN vd.scheduled_at < NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires' THEN '✅ Hora pasó' ELSE '❌ Hora no pasó' END as condicion_2,
  CASE WHEN vd.chofer_id IS NULL AND vd.camion_id IS NULL THEN '✅ Sin recursos' ELSE '⚠️ Con recursos' END as condicion_3,
  CASE WHEN vd.estado_unidad NOT IN ('expirado', 'fuera_de_horario', 'en_curso', 'finalizado', 'cancelado') THEN '✅ Estado válido' ELSE '❌ Estado ya es: ' || vd.estado_unidad END as condicion_4,
  CASE WHEN vd.estado NOT IN ('cancelado', 'finalizado') THEN '✅ Estado OK' ELSE '❌ Estado: ' || vd.estado END as condicion_5
FROM viajes_despacho vd
WHERE vd.id = 'c8ed01c3-ea76-4039-a509-6b7882b1a63c';
