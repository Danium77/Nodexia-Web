-- ============================================================================
-- DIAGNÓSTICO: Estructura de Base de Datos DEV vs PRODUCCIÓN
-- ============================================================================
-- Fecha: 27-Enero-2026
-- Propósito: Identificar diferencias entre DEV y PRODUCCIÓN
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR COLUMNAS DE TABLA DESPACHOS
-- ============================================================================

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'despachos'
ORDER BY ordinal_position;

-- ============================================================================
-- 2. VERIFICAR COLUMNAS DE TABLA VIAJES_DESPACHO
-- ============================================================================

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'viajes_despacho'
ORDER BY ordinal_position;

-- ============================================================================
-- 3. VERIFICAR ENUM estado_unidad_viaje
-- ============================================================================

SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'estado_unidad_viaje'::regtype 
ORDER BY enumsortorder;

-- ============================================================================
-- 4. VERIFICAR FUNCIONES RELACIONADAS CON EXPIRACIÓN
-- ============================================================================

SELECT 
    proname AS function_name,
    pg_get_function_identity_arguments(oid) AS arguments
FROM pg_proc
WHERE proname LIKE '%expir%'
ORDER BY proname;

-- ============================================================================
-- 5. VERIFICAR VISTAS RELACIONADAS
-- ============================================================================

SELECT 
    schemaname,
    viewname,
    viewowner
FROM pg_views
WHERE viewname LIKE '%expir%' OR viewname LIKE '%viaje%'
ORDER BY viewname;
