-- Ver el viaje específico que debería estar expirado
SELECT 
  id,
  despacho_id,
  scheduled_at,
  scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires' as hora_local,
  estado,
  estado_unidad,
  chofer_id,
  camion_id,
  fecha_carga,
  hora_carga_desde,
  created_at
FROM viajes_despacho
ORDER BY created_at DESC
LIMIT 5;
