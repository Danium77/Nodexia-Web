-- Script para verificar y crear registros faltantes en estado_unidad_viaje
-- Fecha: 4 feb 2026

-- 1. Ver si existe registro para el viaje actual (90c20bb4-198a-428a-b240-32c34e597e2b)
SELECT 
  vd.id as viaje_id,
  vd.numero_viaje,
  vd.estado as estado_viaje,
  euv.estado_unidad,
  euv.fecha_confirmacion_chofer,
  euv.fecha_inicio_transito_origen
FROM viajes_despacho vd
LEFT JOIN estado_unidad_viaje euv ON vd.id = euv.viaje_id
WHERE vd.numero_viaje = 1
ORDER BY vd.created_at DESC
LIMIT 5;

-- 2. Si no existe, crear registro basado en el estado actual del viaje
-- Mapeo de estados viaje → estado_unidad:
-- 'camion_asignado' → 'asignado'
-- 'confirmado_chofer' → 'confirmado'
-- 'en_transito_origen' → 'en_ruta_origen'
-- 'arribo_origen' → 'arribo_origen'
-- 'en_transito_destino' → 'en_ruta_destino'
-- 'arribo_destino' → 'arribo_destino'

INSERT INTO estado_unidad_viaje (
  viaje_id,
  estado_unidad,
  fecha_confirmacion_chofer,
  fecha_inicio_transito_origen,
  created_at,
  updated_at
)
SELECT 
  vd.id,
  CASE 
    WHEN vd.estado = 'camion_asignado' THEN 'asignado'
    WHEN vd.estado = 'confirmado_chofer' THEN 'confirmado'
    WHEN vd.estado = 'en_transito_origen' THEN 'en_ruta_origen'
    WHEN vd.estado = 'arribo_origen' THEN 'arribo_origen'
    WHEN vd.estado = 'en_transito_destino' THEN 'en_ruta_destino'
    WHEN vd.estado = 'arribo_destino' THEN 'arribo_destino'
    ELSE 'pendiente'
  END,
  CASE 
    WHEN vd.estado IN ('confirmado_chofer', 'en_transito_origen', 'arribo_origen', 'en_transito_destino', 'arribo_destino') 
    THEN NOW() - INTERVAL '1 hour'  -- Timestamp simulado hace 1 hora
    ELSE NULL
  END,
  CASE 
    WHEN vd.estado IN ('en_transito_origen', 'arribo_origen', 'en_transito_destino', 'arribo_destino') 
    THEN NOW() - INTERVAL '30 minutes'  -- Timestamp simulado hace 30 min
    ELSE NULL
  END,
  NOW(),
  NOW()
FROM viajes_despacho vd
WHERE vd.id = '90c20bb4-198a-428a-b240-32c34e597e2b'  -- ID del viaje en curso
  AND NOT EXISTS (
    SELECT 1 FROM estado_unidad_viaje WHERE viaje_id = vd.id
  );

-- 3. Verificar que se creó correctamente
SELECT 
  vd.numero_viaje,
  vd.estado as estado_viaje,
  euv.estado_unidad,
  euv.fecha_confirmacion_chofer,
  euv.fecha_inicio_transito_origen,
  euv.created_at
FROM viajes_despacho vd
JOIN estado_unidad_viaje euv ON vd.id = euv.viaje_id
WHERE vd.id = '90c20bb4-198a-428a-b240-32c34e597e2b';
