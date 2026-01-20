-- =====================================================
-- SINCRONIZAR BD DEV CON PRODUCCIÓN
-- Fecha: 20 de Enero 2026
-- Objetivo: Agregar columnas faltantes en viajes_despacho
-- =====================================================

-- Columnas para tracking de cancelaciones (necesarias para código en producción)
ALTER TABLE viajes_despacho 
ADD COLUMN IF NOT EXISTS id_transporte_cancelado UUID;

ALTER TABLE viajes_despacho 
ADD COLUMN IF NOT EXISTS fecha_cancelacion TIMESTAMPTZ;

ALTER TABLE viajes_despacho 
ADD COLUMN IF NOT EXISTS cancelado_por UUID REFERENCES auth.users(id);

ALTER TABLE viajes_despacho 
ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT;

-- Verificar que se agregaron
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'viajes_despacho' 
AND column_name IN ('id_transporte_cancelado', 'fecha_cancelacion', 'cancelado_por', 'motivo_cancelacion')
ORDER BY column_name;
