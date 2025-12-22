-- ============================================================================
-- Actualizar manualmente el despacho DSP-20251219-002
-- ============================================================================

-- Primero verificamos si el viaje está en viajes_red_nodexia
SELECT 
    vd.id as viaje_id,
    vd.despacho_id,
    d.pedido_id,
    d.origen_asignacion as origen_actual,
    vrn.id as viaje_red_id,
    vrn.estado_red
FROM viajes_despacho vd
INNER JOIN despachos d ON d.id = vd.despacho_id
LEFT JOIN viajes_red_nodexia vrn ON vrn.viaje_id = vd.id
WHERE vd.id = 'df6d4f36-ea81-4007-b2f6-8f68a6f57277';

-- Si el viaje_red_id NO es null, entonces actualizar el despacho:
UPDATE despachos
SET origen_asignacion = 'red_nodexia'
WHERE pedido_id = 'DSP-20251219-002';

-- Verificar el resultado
SELECT pedido_id, origen_asignacion 
FROM despachos 
WHERE pedido_id = 'DSP-20251219-002';
