-- =====================================================
-- DIAGNÓSTICO: Verificar estructura de tablas
-- =====================================================
-- Ejecutar ANTES de security-improvements-soft-delete-rls.sql
-- =====================================================

-- Verificar columnas de tabla choferes
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'choferes'
ORDER BY ordinal_position;

-- Verificar columnas de tabla camiones
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'camiones'
ORDER BY ordinal_position;

-- Verificar columnas de tabla acoplados
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'acoplados'
ORDER BY ordinal_position;

-- Verificar foreign keys existentes
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('choferes', 'camiones', 'acoplados')
ORDER BY tc.table_name;
