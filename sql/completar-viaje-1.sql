-- COMPLETAR VIAJE #1 CON ESTADOS DUALES
-- Este script agrega los estados que faltan al viaje existente

-- Paso 1: Verificar el viaje existe
SELECT 
  vd.numero_viaje,
  vd.id as viaje_id,
  d.pedido_id,
  d.origen || ' → ' || d.destino as ruta,
  ch.nombre || ' ' || ch.apellido as chofer,
  cm.patente as camion
FROM viajes_despacho vd
LEFT JOIN despachos d ON vd.despacho_id = d.id
LEFT JOIN choferes ch ON vd.id_chofer = ch.id
LEFT JOIN camiones cm ON vd.id_camion = cm.id
WHERE vd.numero_viaje = 1;

-- Paso 2: Agregar estado_unidad_viaje
INSERT INTO estado_unidad_viaje (
  viaje_id,
  estado_unidad,
  fecha_cambio,
  observaciones
)
SELECT
  id,
  'asignado',
  NOW(),
  'Estado inicial agregado para testing'
FROM viajes_despacho
WHERE numero_viaje = 1
ON CONFLICT (viaje_id) DO NOTHING;

-- Paso 3: Agregar estado_carga_viaje
INSERT INTO estado_carga_viaje (
  viaje_id,
  estado_carga,
  fecha_planificado,
  observaciones
)
SELECT
  id,
  'planificado',
  NOW(),
  'Estado inicial agregado para testing'
FROM viajes_despacho
WHERE numero_viaje = 1
ON CONFLICT (viaje_id) DO NOTHING;

-- Paso 4: Verificar estados agregados
SELECT 
  vd.numero_viaje,
  euv.estado_unidad,
  ecv.estado_carga,
  euv.fecha_cambio
FROM viajes_despacho vd
LEFT JOIN estado_unidad_viaje euv ON vd.id = euv.viaje_id
LEFT JOIN estado_carga_viaje ecv ON vd.id = ecv.viaje_id
WHERE vd.numero_viaje = 1;

-- Paso 5: Agregar ubicación GPS inicial (opcional)
INSERT INTO ubicaciones_choferes (
  viaje_id,
  chofer_id,
  latitude,
  longitude,
  accuracy,
  velocidad,
  heading,
  timestamp
)
SELECT
  vd.id,
  vd.id_chofer,
  -32.9442,  -- Rosario, Argentina (ejemplo)
  -60.6505,
  10,
  0,
  0,
  NOW()
FROM viajes_despacho vd
WHERE vd.numero_viaje = 1
  AND vd.id_chofer IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM ubicaciones_choferes WHERE viaje_id = vd.id
  );

-- RESULTADO FINAL
SELECT 
  '✅ VIAJE COMPLETADO' as resultado,
  vd.numero_viaje,
  vd.id as viaje_id,
  d.pedido_id,
  d.origen || ' → ' || d.destino as ruta,
  ch.nombre || ' ' || ch.apellido as chofer,
  ch.email as chofer_email,
  cm.patente as camion,
  euv.estado_unidad,
  ecv.estado_carga,
  COUNT(uc.id) as ubicaciones_gps
FROM viajes_despacho vd
LEFT JOIN despachos d ON vd.despacho_id = d.id
LEFT JOIN choferes ch ON vd.id_chofer = ch.id
LEFT JOIN camiones cm ON vd.id_camion = cm.id
LEFT JOIN estado_unidad_viaje euv ON vd.id = euv.viaje_id
LEFT JOIN estado_carga_viaje ecv ON vd.id = ecv.viaje_id
LEFT JOIN ubicaciones_choferes uc ON vd.id = uc.viaje_id
WHERE vd.numero_viaje = 1
GROUP BY vd.numero_viaje, vd.id, d.pedido_id, d.origen, d.destino, 
         ch.nombre, ch.apellido, ch.email, cm.patente, 
         euv.estado_unidad, ecv.estado_carga;

-- ============================================
-- INSTRUCCIONES PARA TESTING:
-- ============================================
-- 1. Ejecuta todo este script
-- 2. Verifica el resultado final
-- 3. En la app, prueba con:
--    - Coordinador: Ver en /transporte/viajes-activos
--    - Chofer (usar email del resultado): Ver en /chofer/mis-viajes
--    - Control Acceso: Escanear "QR-1" o "1" en /control-acceso
--    - Supervisor: Ver dashboard
