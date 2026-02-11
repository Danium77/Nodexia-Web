-- 054_fix_documentos_entidad_constraints.sql
-- Fix: fecha_emision NOT NULL → nullable (se asigna al validar)
-- Fix: UNIQUE constraint demasiado restrictivo → partial unique solo para activo=true
-- Ejecutar en Supabase SQL Editor

-- Paso 1: Hacer fecha_emision nullable
ALTER TABLE documentos_entidad ALTER COLUMN fecha_emision DROP NOT NULL;
-- Nota: ya no exige fecha al subir, el admin la asigna al validar

-- Paso 2: Eliminar CHECK constraint que exige fecha_emision >= 2000-01-01 (falla con NULL)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON con.conrelid = rel.oid
    WHERE rel.relname = 'documentos_entidad'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%fecha_emision%'
  LOOP
    EXECUTE 'ALTER TABLE documentos_entidad DROP CONSTRAINT ' || r.conname;
    RAISE NOTICE 'CHECK constraint % eliminado', r.conname;
  END LOOP;
END $$;

-- Reagregar CHECK con soporte para NULL
ALTER TABLE documentos_entidad ADD CONSTRAINT check_fechas_validas
  CHECK (
    fecha_vencimiento IS NULL 
    OR fecha_emision IS NULL 
    OR fecha_vencimiento > fecha_emision
  );

ALTER TABLE documentos_entidad ADD CONSTRAINT check_fechas_razonables
  CHECK (
    (fecha_emision IS NULL OR (fecha_emision >= '2000-01-01' AND fecha_emision <= CURRENT_DATE + INTERVAL '1 year'))
    AND (fecha_vencimiento IS NULL OR fecha_vencimiento <= CURRENT_DATE + INTERVAL '50 years')
  );

-- Paso 3: Eliminar UNIQUE constraint restrictivo
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON con.conrelid = rel.oid
    WHERE rel.relname = 'documentos_entidad'
      AND con.contype = 'u'
      AND pg_get_constraintdef(con.oid) ILIKE '%tipo_documento%'
  LOOP
    EXECUTE 'ALTER TABLE documentos_entidad DROP CONSTRAINT ' || r.conname;
    RAISE NOTICE 'UNIQUE constraint % eliminado', r.conname;
  END LOOP;
END $$;

-- Paso 4: Crear partial unique index (solo aplica para docs activos)
-- Permite múltiples docs inactivos del mismo tipo (historial/auditoría)
DROP INDEX IF EXISTS idx_unique_doc_activo_por_tipo;
CREATE UNIQUE INDEX idx_unique_doc_activo_por_tipo 
  ON documentos_entidad(entidad_tipo, entidad_id, tipo_documento) 
  WHERE activo = TRUE;

-- Verificación
DO $$
DECLARE
  v_nullable TEXT;
  v_idx_exists BOOLEAN;
BEGIN
  SELECT is_nullable INTO v_nullable 
  FROM information_schema.columns 
  WHERE table_name = 'documentos_entidad' AND column_name = 'fecha_emision';
  
  SELECT EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_unique_doc_activo_por_tipo'
  ) INTO v_idx_exists;

  RAISE NOTICE '✅ fecha_emision nullable: %', v_nullable;
  RAISE NOTICE '✅ Partial unique index: %', v_idx_exists;
END $$;
