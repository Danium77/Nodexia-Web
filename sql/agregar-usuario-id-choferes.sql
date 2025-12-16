-- Agregar columna usuario_id a tabla choferes para vincular con usuarios de Nodexia

-- 1. Verificar estructura actual
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'choferes'
ORDER BY ordinal_position;

-- 2. Agregar columna usuario_id si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'choferes' AND column_name = 'usuario_id'
  ) THEN
    ALTER TABLE choferes 
    ADD COLUMN usuario_id UUID REFERENCES auth.users(id);
    
    RAISE NOTICE '✅ Columna usuario_id agregada a tabla choferes';
  ELSE
    RAISE NOTICE 'ℹ️ Columna usuario_id ya existe';
  END IF;
END;
$$;

-- 3. Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_choferes_usuario_id ON choferes(usuario_id);

-- 4. Verificar resultado
SELECT 
  id,
  nombre,
  apellido,
  dni,
  usuario_id,
  id_transporte
FROM choferes
LIMIT 5;
