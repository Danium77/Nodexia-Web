-- Ver estructura de la tabla despachos
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'despachos'
ORDER BY ordinal_position;

-- Ver despachos que coincidan con el código buscado
SELECT *
FROM despachos
WHERE pedido_id LIKE '%20251219-002%'
LIMIT 5;

-- Ver todos los despachos recientes (para debugging)
SELECT id, pedido_id, origen, destino, estado, created_by, created_at
FROM despachos
ORDER BY created_at DESC
LIMIT 10;
