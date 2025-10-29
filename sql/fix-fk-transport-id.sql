-- Script para corregir Foreign Key de despachos.transport_id
-- El FK actualmente apunta a tabla "transportes" pero debería apuntar a "empresas"

BEGIN;

-- 1. Eliminar el constraint existente
ALTER TABLE despachos 
DROP CONSTRAINT IF EXISTS despachos_transport_id_fkey;

-- 2. Crear nuevo constraint apuntando a empresas
ALTER TABLE despachos
ADD CONSTRAINT despachos_transport_id_fkey 
FOREIGN KEY (transport_id) 
REFERENCES empresas(id)
ON DELETE SET NULL;

-- 3. Verificar que funciona
DO $$
BEGIN
  RAISE NOTICE 'Foreign Key actualizado correctamente';
  RAISE NOTICE 'despachos.transport_id ahora apunta a empresas.id';
END $$;

COMMIT;
