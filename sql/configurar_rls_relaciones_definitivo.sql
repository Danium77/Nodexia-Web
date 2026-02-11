-- ============================================================================
-- SCRIPT DEFINITIVO: Configurar RLS para relaciones_empresas
-- ============================================================================
-- Este script:
-- 1. Verifica el estado actual
-- 2. Limpia políticas existentes
-- 3. Crea políticas correctas
-- 4. Valida que todo funcione
-- ============================================================================

-- PASO 1: DIAGNÓSTICO INICIAL
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '🔍 PASO 1: DIAGNÓSTICO INICIAL';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- Ver estado RLS actual
SELECT 
    'RLS Status:' as info,
    CASE 
        WHEN rowsecurity THEN '✅ HABILITADO'
        ELSE '❌ DESHABILITADO'
    END as estado
FROM pg_tables 
WHERE tablename = 'relaciones_empresas';

-- Ver políticas existentes
SELECT 
    'Políticas existentes:' as info,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'relaciones_empresas'
ORDER BY policyname;

-- PASO 2: LIMPIAR POLÍTICAS EXISTENTES
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '🧹 PASO 2: LIMPIANDO POLÍTICAS ANTIGUAS';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

DROP POLICY IF EXISTS "Ver relaciones de mis empresas" ON public.relaciones_empresas;
DROP POLICY IF EXISTS "Coordinadores crean relaciones" ON public.relaciones_empresas;
DROP POLICY IF EXISTS "Coordinadores actualizan relaciones" ON public.relaciones_empresas;
DROP POLICY IF EXISTS "Admins pueden eliminar relaciones" ON public.relaciones_empresas;

-- PASO 3: HABILITAR RLS
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '🔒 PASO 3: HABILITANDO RLS';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

ALTER TABLE public.relaciones_empresas ENABLE ROW LEVEL SECURITY;

-- PASO 4: CREAR POLÍTICAS CORRECTAS
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ PASO 4: CREANDO POLÍTICAS NUEVAS';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- Política SELECT: Ver relaciones donde mi empresa participa
CREATE POLICY "Ver relaciones de mis empresas" 
ON public.relaciones_empresas
FOR SELECT 
USING (
    empresa_cliente_id IN (
        SELECT empresa_id 
        FROM public.usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
    ) 
    OR
    empresa_transporte_id IN (
        SELECT empresa_id 
        FROM public.usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
    )
);

-- Política INSERT: Solo coordinadores/admins de la empresa CLIENTE pueden crear relaciones
CREATE POLICY "Coordinadores crean relaciones" 
ON public.relaciones_empresas
FOR INSERT 
WITH CHECK (
    empresa_cliente_id IN (
        SELECT empresa_id 
        FROM public.usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
        AND rol_interno IN ('coordinador', 'admin', 'admin_nodexia', 'super_admin')
    )
);

-- Política UPDATE: Solo coordinadores/admins pueden actualizar relaciones de su empresa
CREATE POLICY "Coordinadores actualizan relaciones" 
ON public.relaciones_empresas
FOR UPDATE 
USING (
    empresa_cliente_id IN (
        SELECT empresa_id 
        FROM public.usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
        AND rol_interno IN ('coordinador', 'admin', 'admin_nodexia', 'super_admin')
    )
);

-- Política DELETE: Solo admins pueden eliminar relaciones
CREATE POLICY "Admins pueden eliminar relaciones" 
ON public.relaciones_empresas
FOR DELETE 
USING (
    empresa_cliente_id IN (
        SELECT empresa_id 
        FROM public.usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
        AND rol_interno IN ('admin', 'admin_nodexia', 'super_admin')
    )
);

-- PASO 5: VERIFICACIÓN FINAL
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '🎯 PASO 5: VERIFICACIÓN FINAL';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- Contar políticas creadas
SELECT 
    ' Políticas creadas:' as info,
    COUNT(*) as cantidad,
    CASE 
        WHEN COUNT(*) = 4 THEN '✅ CORRECTO (4 políticas)'
        ELSE '⚠️  INCORRECTO (esperadas 4)'
    END as estado
FROM pg_policies 
WHERE tablename = 'relaciones_empresas';

-- Listar políticas creadas
SELECT 
    '  - ' || policyname as politica,
    cmd as comando
FROM pg_policies 
WHERE tablename = 'relaciones_empresas'
ORDER BY cmd, policyname;

-- Mostrar resultado final
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ CONFIGURACIÓN COMPLETADA';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Políticas RLS creadas correctamente para relaciones_empresas';
    RAISE NOTICE 'Roles permitidos: coordinador, admin, admin_nodexia, super_admin';
    RAISE NOTICE '';
    RAISE NOTICE 'Próximo paso: Probar desde la UI';
    RAISE NOTICE '';
END $$;
