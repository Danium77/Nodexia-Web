-- Verificar si el despacho DSP-20251219-002 tiene origen_asignacion
SELECT 
    d.pedido_id,
    d.id as despacho_id,
    d.origen_asignacion,
    d.created_by,
    vd.id as viaje_id,
    vd.numero_viaje,
    vrn.id as viaje_red_id,
    vrn.estado_red
FROM despachos d
LEFT JOIN viajes_despacho vd ON vd.despacho_id = d.id
LEFT JOIN viajes_red_nodexia vrn ON vrn.viaje_id = vd.id
WHERE d.pedido_id = 'DSP-20251219-002';
