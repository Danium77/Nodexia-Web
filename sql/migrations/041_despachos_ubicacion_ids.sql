-- =====================================================
-- MIGRACIÓN 041: Agregar UUIDs de ubicaciones a despachos
-- =====================================================
-- Fecha: 07-FEB-2026
-- Descripción: Migrar de nombres TEXT a UUIDs para origen/destino
--              Fase 1: Agregar columnas nuevas (mantener las viejas)
-- =====================================================

-- Paso 1: Agregar nuevas columnas UUID
ALTER TABLE despachos 
ADD COLUMN IF NOT EXISTS origen_ubicacion_id UUID REFERENCES ubicaciones(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS destino_ubicacion_id UUID REFERENCES ubicaciones(id) ON DELETE SET NULL;

-- Comentarios
COMMENT ON COLUMN despachos.origen_ubicacion_id IS 'UUID de la ubicación origen del despacho (reemplaza campo "origen" TEXT)';
COMMENT ON COLUMN despachos.destino_ubicacion_id IS 'UUID de la ubicación destino del despacho (reemplaza campo "destino" TEXT)';

-- Paso 2: Migrar datos existentes (matching por nombre ILIKE)
-- Origen
UPDATE despachos d
SET origen_ubicacion_id = (
  SELECT u.id 
  FROM ubicaciones u 
  WHERE u.nombre ILIKE '%' || d.origen || '%'
  ORDER BY similarity(u.nombre, d.origen) DESC
  LIMIT 1
)
WHERE origen_ubicacion_id IS NULL
  AND origen IS NOT NULL;

-- Destino
UPDATE despachos d
SET destino_ubicacion_id = (
  SELECT u.id 
  FROM ubicaciones u 
  WHERE u.nombre ILIKE '%' || d.destino || '%'
  ORDER BY similarity(u.nombre, d.destino) DESC
  LIMIT 1
)
WHERE destino_ubicacion_id IS NULL
  AND destino IS NOT NULL;

-- Paso 3: Crear índices
CREATE INDEX IF NOT EXISTS idx_despachos_origen_ubicacion ON despachos(origen_ubicacion_id);
CREATE INDEX IF NOT EXISTS idx_despachos_destino_ubicacion ON despachos(destino_ubicacion_id);

-- Paso 4: Verificar migración
SELECT 
  COUNT(*) as total_despachos,
  COUNT(origen_ubicacion_id) as con_origen_uuid,
  COUNT(destino_ubicacion_id) as con_destino_uuid,
  COUNT(origen) as con_origen_text,
  COUNT(destino) as con_destino_text
FROM despachos;

-- NOTA: NO eliminamos columnas "origen" y "destino" todavía
-- Eso se hará en una migración futura después de verificar que todo funciona
-- y actualizar todos los formularios para usar los nuevos campos
