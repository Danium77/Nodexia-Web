-- ============================================================================
-- Actualizar despachos existentes que están en Red Nodexia
-- Fecha: 19-Dic-2025
-- Problema: Despachos publicados antes del fix no tienen origen_asignacion
-- Solución: Actualizar todos los despachos que tienen viajes en viajes_red_nodexia
-- ============================================================================

-- Actualizar despachos que tienen viajes publicados en Red Nodexia
UPDATE despachos
SET origen_asignacion = 'red_nodexia'
WHERE id IN (
    SELECT DISTINCT d.id
    FROM despachos d
    INNER JOIN viajes_despacho vd ON vd.despacho_id = d.id
    INNER JOIN viajes_red_nodexia vrn ON vrn.viaje_id = vd.id
    WHERE d.origen_asignacion IS NULL OR d.origen_asignacion != 'red_nodexia'
);

-- Verificar resultados
SELECT 
    d.pedido_id,
    d.id as despacho_id,
    d.origen_asignacion,
    vrn.estado_red,
    vd.numero_viaje
FROM despachos d
INNER JOIN viajes_despacho vd ON vd.despacho_id = d.id
INNER JOIN viajes_red_nodexia vrn ON vrn.viaje_id = vd.id
ORDER BY d.created_at DESC;

-- ============================================================================
-- Resultado esperado:
-- Todos los despachos con viajes en viajes_red_nodexia ahora tienen
-- origen_asignacion = 'red_nodexia'
-- ============================================================================
