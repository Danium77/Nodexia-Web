-- Ejecutar función manualmente una vez para marcar viajes expirados AHORA
SELECT 
  'Ejecutando actualización manual...' as info,
  viajes_actualizados,
  viajes_expirados,
  viajes_fuera_de_horario
FROM actualizar_estados_viajes();

-- Ver viajes que cambiaron
SELECT 
  'Viajes actualizados' as info,
  id,
  scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires' as hora_programada,
  estado_unidad,
  CASE 
    WHEN chofer_id IS NOT NULL OR camion_id IS NOT NULL THEN 'CON recursos'
    ELSE 'SIN recursos'
  END as recursos
FROM viajes_despacho
WHERE estado_unidad IN ('expirado', 'fuera_de_horario')
ORDER BY scheduled_at DESC
LIMIT 10;
