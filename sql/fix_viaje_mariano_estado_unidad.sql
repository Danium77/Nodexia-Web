-- Crear registro en estado_unidad_viaje para el viaje de Mariano
-- Este viaje ya fue confirmado e iniciado desde el móvil pero no se 
-- creó el registro en la tabla de sistema dual

INSERT INTO estado_unidad_viaje (
  viaje_id,
  estado_unidad,
  fecha_confirmacion_chofer,
  fecha_inicio_transito_origen,
  created_at,
  updated_at
) VALUES (
  'd90d6b4f-d204-4b57-8f27-b0b26890644e8',
  'en_transito_origen',
  '2026-02-06 23:12:00+00',
  '2026-02-06 23:42:00+00',
  NOW(),
  NOW()
);

-- Verificar que se creó correctamente
SELECT 
  viaje_id,
  estado_unidad,
  fecha_confirmacion_chofer,
  fecha_inicio_transito_origen
FROM estado_unidad_viaje 
WHERE viaje_id = 'd90d6b4f-d204-4b57-8f27-b0b26890644e8';

-- Verificar en la vista completa
SELECT 
  viaje_id,
  numero_viaje,
  estado_unidad,
  chofer_nombre
FROM vista_estado_viaje_completo
WHERE viaje_id = 'd90d6b4f-d204-4b57-8f27-b0b26890644e8';
