-- ============================================================================
-- VERIFICAR POLÍTICAS RLS PARA TABLAS DE FLOTA
-- ============================================================================
-- Fecha: 2024-12-29
-- Propósito: Ver las políticas actuales de camiones y acoplados
--
-- CONTEXTO:
-- - Camiones/acoplados son gestionados por cada empresa de transporte
-- - Coordinadores deben poder crear/editar su propia flota
-- - ERROR ACTUAL: "new row violates row level security policy for table camiones"
-- ============================================================================

-- 1. Ver todas las políticas de la tabla 'camiones'
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'camiones'
ORDER BY policyname;

-- 2. Ver todas las políticas de la tabla 'acoplados'
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'acoplados'
ORDER BY policyname;

-- 3. Verificar si RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('camiones', 'acoplados');

-- 4. Ver estructura de las tablas para entender las columnas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('camiones', 'acoplados')
ORDER BY table_name, ordinal_position;
