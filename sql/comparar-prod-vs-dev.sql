-- ============================================================================
-- SCRIPT: Comparar Estructuras PRODUCCIÓN vs DEV
-- ============================================================================
-- Ejecuta esto en PRODUCCIÓN y luego en DEV
-- Compara los resultados para ver las diferencias
-- ============================================================================

-- 1. LISTAR TODAS LAS TABLAS
SELECT 
    schemaname,
    tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. LISTAR COLUMNAS DE TABLAS CRÍTICAS
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN (
    'despachos',
    'viajes_despacho',
    'empresas',
    'usuarios',
    'choferes',
    'camiones',
    'acoplados'
)
ORDER BY table_name, ordinal_position;

-- 3. LISTAR ENUMS
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value,
    e.enumsortorder
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%estado%'
ORDER BY t.typname, e.enumsortorder;

-- 4. LISTAR FUNCIONES PRINCIPALES
SELECT 
    proname AS function_name,
    pg_get_function_identity_arguments(oid) AS arguments
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
AND proname IN (
    'marcar_viajes_expirados',
    'ejecutar_expiracion_viajes',
    'asignar_recurso_a_empresa'
)
ORDER BY proname;

-- 5. CONTAR POLÍTICAS RLS
SELECT 
    schemaname,
    tablename,
    COUNT(*) AS num_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;
