-- ============================================================================
-- EJECUTAR EXPIRACIÓN DE VIAJES - VERSIÓN CORREGIDA
-- ============================================================================

-- 1. Verificar hora actual
SELECT 
  'Hora actual' as info,
  NOW() as hora_utc,
  NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires' as hora_argentina;

-- 2. Ver estado ANTES de ejecutar función
SELECT 
  'ANTES de ejecutar función' as momento,
  vd.id as viaje_id,
  d.codigo as codigo_despacho,
  vd.viaje_numero,
  vd.scheduled_local_date,
  vd.scheduled_local_time,
  vd.estado_unidad,
  CASE 
    WHEN vd.chofer_id IS NOT NULL OR vd.camion_id IS NOT NULL THEN 'Tiene recursos'
    ELSE 'Sin recursos'
  END as recursos,
  (vd.scheduled_local_date || ' ' || vd.scheduled_local_time)::timestamp as fecha_programada,
  (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::timestamp as ahora_argentina,
  (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::timestamp > 
    (vd.scheduled_local_date || ' ' || vd.scheduled_local_time)::timestamp as esta_vencido
FROM viajes_despacho vd
JOIN despachos d ON d.id = vd.despacho_id
WHERE d.codigo = 'DSP-20260129-001'
ORDER BY vd.viaje_numero;

-- 3. Ejecutar función de expiración
SELECT actualizar_estados_viajes() as resultado;

-- 4. Ver estado DESPUÉS de ejecutar función
SELECT 
  'DESPUÉS de ejecutar función' as momento,
  d.codigo as codigo_despacho,
  vd.viaje_numero,
  vd.scheduled_local_date,
  vd.scheduled_local_time,
  vd.estado_unidad,
  CASE 
    WHEN vd.chofer_id IS NOT NULL OR vd.camion_id IS NOT NULL THEN 'Tiene recursos'
    ELSE 'Sin recursos'
  END as recursos
FROM viajes_despacho vd
JOIN despachos d ON d.id = vd.despacho_id
WHERE d.codigo = 'DSP-20260129-001'
ORDER BY vd.viaje_numero;
