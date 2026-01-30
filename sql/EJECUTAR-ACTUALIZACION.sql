-- EJECUTAR ACTUALIZACIÓN DE ESTADOS
SELECT 
  'Antes de actualizar' as momento,
  estado_unidad,
  chofer_id,
  camion_id
FROM viajes_despacho
WHERE id = 'c8ed01c3-ea76-4039-a509-6b7882b1a63c';

-- Ejecutar función
SELECT * FROM actualizar_estados_viajes();

-- Ver resultado
SELECT 
  'Después de actualizar' as momento,
  estado_unidad,
  chofer_id,
  camion_id,
  scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires' as hora_programada
FROM viajes_despacho
WHERE id = 'c8ed01c3-ea76-4039-a509-6b7882b1a63c';
