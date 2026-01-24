-- =====================================================
-- CONSULTA COMPLETA DE ESTADO POST-MIGRACIÓN
-- =====================================================
-- Para generar informe de auditoría Pilar 1

-- 1. DIFERENCIAL DE TABLAS: Columnas deleted_at + Índices
SELECT 
    c.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    COALESCE(
        (SELECT indexname 
         FROM pg_indexes 
         WHERE schemaname = 'public' 
         AND tablename = c.table_name 
         AND indexdef LIKE '%deleted_at%'
         LIMIT 1),
        'Sin índice'
    ) as indice_deleted_at
FROM information_schema.columns c
WHERE c.table_schema = 'public'
    AND c.column_name = 'deleted_at'
    AND c.table_name IN (
        'empresas', 'usuarios', 'usuarios_empresa',
        'choferes', 'camiones', 'acoplados',
        'despachos', 'viajes_despacho', 'relaciones_empresas'
    )
ORDER BY c.table_name;

-- 2. MAPEO DE CONSTRAINTS: Todas las FKs con su DELETE rule
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN (
        'choferes', 'camiones', 'acoplados',
        'viajes_despacho', 'relaciones_empresas'
    )
ORDER BY tc.table_name, tc.constraint_name;

-- 3. DICCIONARIO DE POLÍTICAS RLS: Lógica USING clause
SELECT 
    schemaname,
    tablename,
    policyname,
    CASE 
        WHEN cmd = 'r' THEN 'SELECT'
        WHEN cmd = 'a' THEN 'INSERT'
        WHEN cmd = 'w' THEN 'UPDATE'
        WHEN cmd = 'd' THEN 'DELETE'
        WHEN cmd = '*' THEN 'ALL'
    END as comando,
    qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('despachos', 'viajes_despacho', 'choferes', 'camiones')
    AND cmd = 'r'  -- Solo políticas SELECT
ORDER BY tablename, policyname;

-- 4. ESTADO DE FUNCIONES: Verificar existencia de funciones soft_delete
SELECT 
    routine_name as nombre_funcion,
    routine_type as tipo,
    data_type as tipo_retorno
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name LIKE '%soft_delete%' OR routine_name LIKE '%restore%'
ORDER BY routine_name;

-- 5. ESTADO RLS: Confirmación de habilitación
SELECT 
    tablename,
    rowsecurity as rls_habilitado,
    (SELECT COUNT(*) 
     FROM pg_policies 
     WHERE schemaname = 'public' 
     AND tablename = t.tablename) as total_politicas
FROM pg_tables t
WHERE schemaname = 'public'
    AND tablename IN (
        'empresas', 'usuarios', 'usuarios_empresa',
        'choferes', 'camiones', 'acoplados',
        'despachos', 'viajes_despacho', 'relaciones_empresas'
    )
ORDER BY tablename;
