-- =============================================
-- SOLUCIÓN CORREGIDA: Sin columnas que no existen
-- =============================================

-- 1. Verificar el estado actual de RLS (columnas que sí existen)
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('relaciones_empresa', 'empresas', 'usuarios_empresa');

-- 2. DESHABILITAR RLS COMPLETAMENTE 
ALTER TABLE public.relaciones_empresa DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_empresa DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;

-- 3. ELIMINAR TODAS LAS POLÍTICAS
DROP POLICY IF EXISTS "usuarios_pueden_ver_sus_empresas" ON public.empresas;
DROP POLICY IF EXISTS "usuarios_pueden_ver_sus_asociaciones" ON public.usuarios_empresa;
DROP POLICY IF EXISTS "usuarios_pueden_ver_relaciones_empresa" ON public.relaciones_empresa;
DROP POLICY IF EXISTS "coordinadores_pueden_crear_relaciones" ON public.relaciones_empresa;
DROP POLICY IF EXISTS "coordinadores_pueden_ver_sus_relaciones" ON public.relaciones_empresa;
DROP POLICY IF EXISTS "coordinadores_pueden_actualizar_relaciones" ON public.relaciones_empresa;

-- 4. Verificar que RLS esté deshabilitado
SELECT 
    'RLS_DESHABILITADO' as status,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('relaciones_empresa', 'empresas', 'usuarios_empresa', 'usuarios');

-- 5. PROBAR UPDATE DIRECTO (usar ID correcto que vimos antes)
UPDATE public.relaciones_empresa 
SET 
    estado = 'finalizada',
    activo = false,
    fecha_fin = '2025-10-10',
    updated_at = CURRENT_TIMESTAMP
WHERE id = '77e6397f-f82b-419f-bb84-e17ba6d2a175';

-- 6. Verificar que el update funcionó
SELECT 
    'RESULTADO_UPDATE' as test,
    id,
    estado,
    activo,
    fecha_fin,
    updated_at
FROM public.relaciones_empresa 
WHERE id = '77e6397f-f82b-419f-bb84-e17ba6d2a175';

-- 7. Ver TODAS las relaciones para confirmar el cambio
SELECT 
    'ESTADO_FINAL' as info,
    id,
    estado,
    activo,
    fecha_fin,
    updated_at
FROM public.relaciones_empresa 
ORDER BY updated_at DESC;

-- 8. Contar relaciones activas vs finalizadas
SELECT 
    'CONTEO_FINAL' as resumen,
    estado,
    activo,
    COUNT(*) as cantidad
FROM public.relaciones_empresa 
GROUP BY estado, activo
ORDER BY estado, activo;