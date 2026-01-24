-- =====================================================
-- HABILITAR RLS EN TABLAS FALTANTES
-- =====================================================
-- Este script habilita RLS en las tablas que no lo tienen activo

-- Verificar estado actual
SELECT 
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'empresas', 'usuarios_empresa', 'choferes', 
        'camiones', 'acoplados', 'relaciones_empresas'
    )
ORDER BY tablename;

-- Habilitar RLS en todas las tablas necesarias
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.choferes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acoplados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relaciones_empresas ENABLE ROW LEVEL SECURITY;

-- Verificar que se habilitó correctamente
SELECT 
    tablename,
    rowsecurity as rls_habilitado,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS ACTIVO'
        ELSE '❌ RLS DESHABILITADO'
    END as estado
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'empresas', 'usuarios', 'usuarios_empresa',
        'choferes', 'camiones', 'acoplados',
        'despachos', 'viajes_despacho', 'relaciones_empresas'
    )
ORDER BY tablename;

-- Mensaje de confirmación
SELECT '✅ RLS HABILITADO EN TODAS LAS TABLAS' as resultado;
