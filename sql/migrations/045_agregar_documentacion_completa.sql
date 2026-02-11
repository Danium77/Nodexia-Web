-- ============================================================================
-- MIGRATION 045: Agregar columna documentacion_completa a viajes_despacho
-- ============================================================================
-- Fecha: 8 Feb 2026
-- Problema: La columna documentacion_completa no existe en la tabla viajes_despacho
-- Solución: Agregar la columna con valor por defecto FALSE
-- ============================================================================

-- Agregar columna si no existe
ALTER TABLE viajes_despacho 
ADD COLUMN IF NOT EXISTS documentacion_completa BOOLEAN DEFAULT FALSE;

-- Agregar comentario para documentación
COMMENT ON COLUMN viajes_despacho.documentacion_completa IS 'Indica si Control de Acceso validó toda la documentación requerida antes del ingreso';

-- Crear índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_documentacion 
ON viajes_despacho(documentacion_completa);

-- Verificar que la columna se creó correctamente
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'viajes_despacho' 
  AND column_name = 'documentacion_completa';

-- ============================================================================
-- RESULTADO ESPERADO:
-- column_name              | data_type | column_default | is_nullable
-- documentacion_completa   | boolean   | false          | YES
-- ============================================================================
