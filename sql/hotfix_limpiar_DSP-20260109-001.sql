-- =====================================================
-- CORRECCIÓN INMEDIATA: Limpiar viaje DSP-20260109-001
-- =====================================================
-- Este viaje fue reprogramado ANTES de que la función 
-- tuviera la lógica de limpieza de recursos.
-- Lo limpiamos manualmente para que quede como nuevo despacho.

-- 1️⃣ VERIFICAR el estado actual del viaje
SELECT 
  v.id,
  v.numero_viaje,
  v.estado_carga,
  v.estado_unidad,
  v.fue_expirado,
  v.cantidad_reprogramaciones,
  v.chofer_id,
  v.camion_id,
  v.acoplado_id,
  v.transport_id,
  d.pedido_id,
  d.scheduled_at,
  t.nombre as transporte_nombre
FROM viajes_despacho v
JOIN despachos d ON v.despacho_id = d.id
LEFT JOIN empresas t ON v.transport_id = t.id
WHERE d.pedido_id = 'DSP-20260109-001'
ORDER BY v.numero_viaje;

-- 2️⃣ LIMPIAR recursos asignados del viaje reprogramado
UPDATE viajes_despacho v
SET 
  transport_id = NULL,
  chofer_id = NULL,
  camion_id = NULL,
  acoplado_id = NULL
FROM despachos d
WHERE v.despacho_id = d.id
  AND d.pedido_id = 'DSP-20260109-001'
  AND v.estado_carga = 'pendiente_asignacion' -- Solo si está pendiente después de reprogramar
  AND v.fue_expirado = true; -- Solo viajes que fueron expirados

-- 3️⃣ VERIFICAR que quedó limpio
SELECT 
  v.id,
  v.numero_viaje,
  v.estado_carga,
  v.chofer_id,
  v.camion_id,
  v.transport_id,
  d.pedido_id
FROM viajes_despacho v
JOIN despachos d ON v.despacho_id = d.id
WHERE d.pedido_id = 'DSP-20260109-001';

-- =====================================================
-- NOTA: Este script es específico para DSP-20260109-001
-- Si hay más viajes con el mismo problema, usa el script
-- de la migración 016c (sección 4) que limpia TODOS
-- los viajes reprogramados con recursos asignados.
-- =====================================================
