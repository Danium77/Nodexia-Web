-- SOLUCIÓN COMPLETA: Recrear constraint correctamente

-- 1. Eliminar TODOS los constraints relacionados
ALTER TABLE despachos DROP CONSTRAINT IF EXISTS despachos_transport_id_fkey CASCADE;
ALTER TABLE despachos DROP CONSTRAINT IF EXISTS despachos_transporte_id_fkey CASCADE;

-- 2. Limpiar datos huérfanos
UPDATE despachos 
SET transport_id = NULL 
WHERE transport_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM empresas WHERE empresas.id = despachos.transport_id);

-- 3. Crear el constraint CORRECTO apuntando a empresas
ALTER TABLE despachos
ADD CONSTRAINT despachos_transport_id_fkey 
FOREIGN KEY (transport_id) 
REFERENCES empresas(id)
ON DELETE SET NULL;

-- 4. Verificar que funcionó
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as referenced_table
FROM pg_constraint 
WHERE conname LIKE '%transport%' AND conrelid = 'despachos'::regclass;
