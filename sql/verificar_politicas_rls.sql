-- Script SQL para verificar políticas RLS actuales
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si RLS está habilitado
SELECT 
    schemaname, 
    tablename, 
    CASE 
        WHEN rowsecurity THEN '✅ HABILITADO'
        ELSE '❌ DESHABILITADO'
    END as rls_status
FROM pg_tables 
WHERE tablename = 'relaciones_empresas';

-- 2. Ver políticas RLS actuales (detalladas)
SELECT 
    policyname as "Política",
    cmd as "Comando",
    CASE permissive
        WHEN 'PERMISSIVE' THEN 'Permisiva'
        WHEN 'RESTRICTIVE' THEN 'Restrictiva'
    END as "Tipo",
    roles as "Roles",
    qual as "Condición USING",
    with_check as "Condición WITH CHECK"
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'relaciones_empresas'
ORDER BY policyname;

-- 3. Verificar si existe la política de INSERT específica
SELECT 
    COUNT(*) as existe,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Existe política INSERT'
        ELSE '❌ NO existe política INSERT'
    END as estado
FROM pg_policies 
WHERE tablename = 'relaciones_empresas' 
AND cmd = 'INSERT';

-- 4. Test: ¿Puede el usuario insertar?
-- (Este query solo muestra la definición, hay que probarlo desde la app)
SELECT 
    'Para probar INSERT desde la app:' as nota,
    'User debe tener rol_interno = coordinador o admin' as requisito,
    'Y empresa_cliente_id debe ser su empresa' as condicion;
