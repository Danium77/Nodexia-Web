-- Actualizar estado del DESPACHO cuando tiene viajes expirados/fuera_de_horario
UPDATE despachos d
SET 
  estado = 'expirado',
  updated_at = NOW()
WHERE d.id IN (
  SELECT DISTINCT vd.despacho_id
  FROM viajes_despacho vd
  WHERE vd.estado_unidad IN ('expirado', 'fuera_de_horario')
)
AND d.estado NOT IN ('cancelado', 'finalizado');

-- Verificar
SELECT 
  d.id,
  d.pedido_id,
  d.estado as estado_despacho,
  vd.estado_unidad as estado_viaje
FROM despachos d
JOIN viajes_despacho vd ON vd.despacho_id = d.id
WHERE vd.estado_unidad IN ('expirado', 'fuera_de_horario');
