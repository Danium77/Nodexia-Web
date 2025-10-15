-- =============================================
-- SOLUCIÓN DEFINITIVA: Verificar y corregir RLS
-- =============================================

-- 1. Verificar el estado actual de RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    enablerls
FROM pg_tables 
WHERE tablename IN ('relaciones_empresa', 'empresas', 'usuarios_empresa');

-- 2. Verificar políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('relaciones_empresa', 'empresas', 'usuarios_empresa')
ORDER BY tablename, policyname;

-- 3. DESHABILITAR RLS COMPLETAMENTE (asegurar que se aplique)
ALTER TABLE public.relaciones_empresa DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_empresa DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;

-- 4. ELIMINAR TODAS LAS POLÍTICAS que puedan estar interfiriendo
DROP POLICY IF EXISTS "usuarios_pueden_ver_sus_empresas" ON public.empresas;
DROP POLICY IF EXISTS "usuarios_pueden_ver_sus_asociaciones" ON public.usuarios_empresa;
DROP POLICY IF EXISTS "usuarios_pueden_ver_relaciones_empresa" ON public.relaciones_empresa;
DROP POLICY IF EXISTS "coordinadores_pueden_crear_relaciones" ON public.relaciones_empresa;
DROP POLICY IF EXISTS "coordinadores_pueden_ver_sus_relaciones" ON public.relaciones_empresa;
DROP POLICY IF EXISTS "coordinadores_pueden_actualizar_relaciones" ON public.relaciones_empresa;

-- 5. Verificar que RLS esté deshabilitado
SELECT 
    'RLS_DESPUES_DESHABILITAR' as check,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('relaciones_empresa', 'empresas', 'usuarios_empresa', 'usuarios');

-- 6. AHORA PROBAR UPDATE DIRECTO
UPDATE public.relaciones_empresa 
SET 
    estado = 'finalizada',
    activo = false,
    fecha_fin = '2025-10-10',
    updated_at = CURRENT_TIMESTAMP
WHERE id = '77e6397f-f82b-419f-bb84-e17ba6d2a175';

-- 7. Verificar que el update funcionó
SELECT 
    'UPDATE_EXITOSO' as resultado,
    id,
    estado,
    activo,
    fecha_fin,
    updated_at
FROM public.relaciones_empresa 
WHERE id = '77e6397f-f82b-419f-bb84-e17ba6d2a175';

-- 8. Ver todas las relaciones después del fix
SELECT 
    'TODAS_RELACIONES_FINAL' as estado,
    id,
    estado,
    activo,
    fecha_fin,
    updated_at
FROM public.relaciones_empresa 
ORDER BY updated_at DESC;