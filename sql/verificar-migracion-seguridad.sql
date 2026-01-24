-- =====================================================
-- VERIFICACIÓN DE MIGRACIÓN DE SEGURIDAD
-- =====================================================
-- Ejecutar en Supabase SQL Editor para confirmar cambios

-- 1. Verificar columnas deleted_at agregadas
SELECT 
    'Columnas deleted_at' as verificacion,
    COUNT(*) as total
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name = 'deleted_at'
    AND table_name IN (
        'empresas', 'usuarios', 'usuarios_empresa', 
        'choferes', 'camiones', 'acoplados',
        'despachos', 'viajes_despacho', 'relaciones_empresas'
    );

-- 2. Verificar políticas RLS creadas (debe mostrar las nuevas políticas)
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
    END as comando
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'empresas', 'usuarios', 'usuarios_empresa',
        'choferes', 'camiones', 'acoplados',
        'despachos', 'viajes_despacho', 'relaciones_empresas'
    )
ORDER BY tablename, policyname;

-- 3. Verificar que las constraints se cambiaron a RESTRICT
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    CASE 
        WHEN rc.delete_rule = 'NO ACTION' THEN 'RESTRICT/NO ACTION'
        WHEN rc.delete_rule = 'CASCADE' THEN '⚠️ CASCADE (debería ser RESTRICT)'
        ELSE rc.delete_rule
    END as delete_rule
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN (
        'choferes', 'camiones', 'acoplados',
        'viajes_despacho', 'relaciones_empresas'
    )
ORDER BY tc.table_name, tc.constraint_name;

-- 4. Verificar que RLS está habilitado en todas las tablas
SELECT
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'empresas', 'usuarios', 'usuarios_empresa',
        'choferes', 'camiones', 'acoplados',
        'despachos', 'viajes_despacho', 'relaciones_empresas'
    )
ORDER BY tablename;
