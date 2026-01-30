-- ============================================================================
-- DIAGNÓSTICO Y REPARACIÓN: Crear enum estado_unidad_viaje en DEV
-- ============================================================================
-- Fecha: 27-Enero-2026
-- ============================================================================

-- PASO 1: Verificar si el enum existe
SELECT 
    typname,
    typtype
FROM pg_type
WHERE typname = 'estado_unidad_viaje';

-- PASO 2: Verificar tipo actual de columna estado en viajes_despacho
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'viajes_despacho' AND column_name = 'estado';

-- PASO 3: Ver valores actuales de estado
SELECT DISTINCT estado 
FROM viajes_despacho 
ORDER BY estado;
