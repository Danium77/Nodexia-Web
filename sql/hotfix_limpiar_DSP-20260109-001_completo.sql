-- =====================================================
-- HOTFIX COMPLETO: Limpiar DSP-20260109-001
-- =====================================================
-- Limpia TANTO viajes_despacho COMO despachos

-- 1️⃣ VER ESTADO ACTUAL
SELECT 
  d.pedido_id,
  d.transport_id as despacho_transport_id,
  d.scheduled_at as despacho_fecha,
  v.id as viaje_id,
  v.numero_viaje,
  v.transport_id as viaje_transport_id,
  v.chofer_id,
  v.camion_id,
  v.estado_carga,
  t1.nombre as transporte_en_despacho,
  t2.nombre as transporte_en_viaje
FROM despachos d
JOIN viajes_despacho v ON v.despacho_id = d.id
LEFT JOIN empresas t1 ON d.transport_id = t1.id
LEFT JOIN empresas t2 ON v.transport_id = t2.id
WHERE d.pedido_id = 'DSP-20260109-001';

-- 2️⃣ LIMPIAR DESPACHO (transport_id en tabla despachos)
UPDATE despachos
SET transport_id = NULL
WHERE pedido_id = 'DSP-20260109-001';

-- 3️⃣ LIMPIAR VIAJES (por si acaso no se hizo antes)
UPDATE viajes_despacho v
SET 
  transport_id = NULL,
  chofer_id = NULL,
  camion_id = NULL,
  acoplado_id = NULL
FROM despachos d
WHERE v.despacho_id = d.id
  AND d.pedido_id = 'DSP-20260109-001'
  AND v.estado_carga = 'pendiente_asignacion';

-- 4️⃣ VERIFICAR LIMPIEZA COMPLETA
SELECT 
  d.pedido_id,
  d.transport_id as despacho_transport_id,
  d.scheduled_at as fecha_programada,
  v.transport_id as viaje_transport_id,
  v.chofer_id,
  v.camion_id,
  v.estado_carga
FROM despachos d
JOIN viajes_despacho v ON v.despacho_id = d.id
WHERE d.pedido_id = 'DSP-20260109-001';

-- Resultado esperado: TODOS los *_id deben ser NULL
