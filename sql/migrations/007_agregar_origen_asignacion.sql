-- ============================================================================
-- MIGRACIÓN: Agregar campo origen_asignacion para tracking Red Nodexia
-- Fecha: 2025-12-07
-- Descripción: Agrega campo para diferenciar asignaciones directas vs Red Nodexia
-- ============================================================================

-- Agregar campo a tabla despachos
ALTER TABLE despachos 
ADD COLUMN IF NOT EXISTS origen_asignacion VARCHAR(20) DEFAULT 'directo' 
CHECK (origen_asignacion IN ('directo', 'red_nodexia'));

-- Agregar campo a tabla viajes_despacho
ALTER TABLE viajes_despacho 
ADD COLUMN IF NOT EXISTS origen_asignacion VARCHAR(20) DEFAULT 'directo' 
CHECK (origen_asignacion IN ('directo', 'red_nodexia'));

-- Crear índices para reportes
CREATE INDEX IF NOT EXISTS idx_despachos_origen_asignacion 
ON despachos(origen_asignacion);

CREATE INDEX IF NOT EXISTS idx_viajes_despacho_origen_asignacion 
ON viajes_despacho(origen_asignacion);

-- Comentarios
COMMENT ON COLUMN despachos.origen_asignacion IS 'Indica si el despacho fue asignado directamente o a través de Red Nodexia';
COMMENT ON COLUMN viajes_despacho.origen_asignacion IS 'Indica si el viaje fue asignado directamente o a través de Red Nodexia';

-- Actualizar registros existentes (todos son directos por defecto)
UPDATE despachos SET origen_asignacion = 'directo' WHERE origen_asignacion IS NULL;
UPDATE viajes_despacho SET origen_asignacion = 'directo' WHERE origen_asignacion IS NULL;
