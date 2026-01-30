-- Verificar hora actual vs hora del viaje
SELECT 
  NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires' as hora_actual_argentina,
  '2026-01-29 18:30:00'::timestamp as hora_viaje,
  CASE 
    WHEN NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires' > '2026-01-29 18:30:00'::timestamp 
    THEN '✅ YA PASÓ - debería estar expirado'
    ELSE '⏳ AÚN NO LLEGÓ - NO debería expirar todavía'
  END as resultado,
  (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::timestamp - '2026-01-29 18:30:00'::timestamp as diferencia;
