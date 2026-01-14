-- ================================================================
-- MIGRACIÓN 023: Agregar columnas origen_id y destino_id a tabla despachos
-- ================================================================
-- Fecha: 2026-01-05
-- Descripción: Agrega referencias de ubicaciones origen/destino para sistema de recepciones
-- Objetivo: Permitir vincular despachos con ubicaciones de empresas para recepciones automáticas
--
-- IMPORTANTE: Estas columnas son OPCIONALES (nullable) para no romper datos existentes
-- ================================================================

-- 1. Agregar columnas origen_id y destino_id a la tabla despachos
-- Son nullable para no romper registros existentes que solo tienen origen/destino (texto)
-- IMPORTANTE: Usar UUID porque ubicaciones.id es de tipo UUID
ALTER TABLE despachos 
ADD COLUMN IF NOT EXISTS origen_id UUID,
ADD COLUMN IF NOT EXISTS destino_id UUID;

-- 2. Crear foreign keys hacia la tabla ubicaciones
-- Se usa RESTRICT para evitar eliminar ubicaciones con despachos vinculados
ALTER TABLE despachos
ADD CONSTRAINT fk_despachos_origen_ubicacion
FOREIGN KEY (origen_id) 
REFERENCES ubicaciones(id)
ON DELETE RESTRICT;

ALTER TABLE despachos
ADD CONSTRAINT fk_despachos_destino_ubicacion
FOREIGN KEY (destino_id) 
REFERENCES ubicaciones(id)
ON DELETE RESTRICT;

-- 3. Crear índices para mejorar performance en búsquedas
CREATE INDEX IF NOT EXISTS idx_despachos_origen_id 
ON despachos(origen_id);

CREATE INDEX IF NOT EXISTS idx_despachos_destino_id 
ON despachos(destino_id);

-- 4. Comentarios para documentación
COMMENT ON COLUMN despachos.origen_id IS 
'ID de la ubicación origen del despacho. Permite rastrear desde dónde sale la mercadería.';

COMMENT ON COLUMN despachos.destino_id IS 
'ID de la ubicación destino del despacho. Permite identificar automáticamente recepciones para empresas registradas en Nodexia.';

-- 5. Intentar vincular orígenes y destinos existentes con ubicaciones
-- Esto es OPCIONAL y solo actualiza si encuentra coincidencias exactas por nombre
DO $$
DECLARE
  origen_actualizado_count INTEGER := 0;
  destino_actualizado_count INTEGER := 0;
BEGIN
  -- Actualizar orígenes
  UPDATE despachos d
  SET origen_id = u.id
  FROM ubicaciones u
  WHERE d.origen_id IS NULL
    AND TRIM(LOWER(d.origen)) = TRIM(LOWER(u.nombre))
    AND u.activo = true;
  
  GET DIAGNOSTICS origen_actualizado_count = ROW_COUNT;
  
  -- Actualizar destinos
  UPDATE despachos d
  SET destino_id = u.id
  FROM ubicaciones u
  WHERE d.destino_id IS NULL
    AND TRIM(LOWER(d.destino)) = TRIM(LOWER(u.nombre))
    AND u.activo = true;
  
  GET DIAGNOSTICS destino_actualizado_count = ROW_COUNT;
  
  RAISE NOTICE '✅ Migración 023 completada';
  RAISE NOTICE '📊 Orígenes vinculados automáticamente: %', origen_actualizado_count;
  RAISE NOTICE '📊 Destinos vinculados automáticamente: %', destino_actualizado_count;
  RAISE NOTICE '⚠️  Despachos sin vincular mantendrán solo los campos origen/destino (texto)';
END $$;

-- ================================================================
-- VERIFICACIÓN
-- ================================================================
DO $$
BEGIN
  -- Verificar que las columnas existen
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'despachos' 
    AND column_name = 'origen_id'
  ) THEN
    RAISE NOTICE '✅ Columna origen_id creada correctamente';
  ELSE
    RAISE EXCEPTION '❌ Error: La columna origen_id no se creó';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'despachos' 
    AND column_name = 'destino_id'
  ) THEN
    RAISE NOTICE '✅ Columna destino_id creada correctamente';
  ELSE
    RAISE EXCEPTION '❌ Error: La columna destino_id no se creó';
  END IF;
  
  -- Verificar que los índices existen
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'despachos' 
    AND indexname = 'idx_despachos_origen_id'
  ) THEN
    RAISE NOTICE '✅ Índice idx_despachos_origen_id creado correctamente';
  ELSE
    RAISE WARNING '⚠️  Índice idx_despachos_origen_id no se creó';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'despachos' 
    AND indexname = 'idx_despachos_destino_id'
  ) THEN
    RAISE NOTICE '✅ Índice idx_despachos_destino_id creado correctamente';
  ELSE
    RAISE WARNING '⚠️  Índice idx_despachos_destino_id no se creó';
  END IF;
END $$;
