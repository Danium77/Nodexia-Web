-- =====================================================
-- AGREGAR COLUMNAS DELETED_AT FALTANTES
-- =====================================================
-- Algunas columnas deleted_at no se agregaron en la migración inicial

-- Verificar cuáles faltan
SELECT 
    t.table_name,
    CASE 
        WHEN c.column_name IS NOT NULL THEN '✅ Tiene deleted_at'
        ELSE '❌ FALTA deleted_at'
    END as estado
FROM (
    SELECT 'empresas' as table_name UNION ALL
    SELECT 'usuarios' UNION ALL
    SELECT 'usuarios_empresa' UNION ALL
    SELECT 'choferes' UNION ALL
    SELECT 'camiones' UNION ALL
    SELECT 'acoplados' UNION ALL
    SELECT 'despachos' UNION ALL
    SELECT 'viajes_despacho' UNION ALL
    SELECT 'relaciones_empresas'
) t
LEFT JOIN information_schema.columns c 
    ON c.table_schema = 'public' 
    AND c.table_name = t.table_name 
    AND c.column_name = 'deleted_at'
ORDER BY t.table_name;

-- =====================================================
-- AGREGAR COLUMNAS DELETED_AT
-- =====================================================

-- Empresas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'empresas' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.empresas ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        CREATE INDEX IF NOT EXISTS idx_empresas_deleted_at ON public.empresas(deleted_at) WHERE deleted_at IS NULL;
    END IF;
END $$;

-- Usuarios
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.usuarios ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        CREATE INDEX IF NOT EXISTS idx_usuarios_deleted_at ON public.usuarios(deleted_at) WHERE deleted_at IS NULL;
    END IF;
END $$;

-- Usuarios Empresa
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios_empresa' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.usuarios_empresa ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_deleted_at ON public.usuarios_empresa(deleted_at) WHERE deleted_at IS NULL;
    END IF;
END $$;

-- Choferes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'choferes' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.choferes ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        CREATE INDEX IF NOT EXISTS idx_choferes_deleted_at ON public.choferes(deleted_at) WHERE deleted_at IS NULL;
    END IF;
END $$;

-- Camiones
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'camiones' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.camiones ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        CREATE INDEX IF NOT EXISTS idx_camiones_deleted_at ON public.camiones(deleted_at) WHERE deleted_at IS NULL;
    END IF;
END $$;

-- Acoplados
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'acoplados' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.acoplados ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        CREATE INDEX IF NOT EXISTS idx_acoplados_deleted_at ON public.acoplados(deleted_at) WHERE deleted_at IS NULL;
    END IF;
END $$;

-- Relaciones Empresas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'relaciones_empresas' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.relaciones_empresas ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        CREATE INDEX IF NOT EXISTS idx_relaciones_empresas_deleted_at ON public.relaciones_empresas(deleted_at) WHERE deleted_at IS NULL;
    END IF;
END $$;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

SELECT 
    'Columnas deleted_at agregadas' as verificacion,
    COUNT(*) as total
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name = 'deleted_at'
    AND table_name IN (
        'empresas', 'usuarios', 'usuarios_empresa', 
        'choferes', 'camiones', 'acoplados',
        'despachos', 'viajes_despacho', 'relaciones_empresas'
    );

-- Debe mostrar 9

SELECT '✅ COLUMNAS DELETED_AT AGREGADAS CORRECTAMENTE' as resultado;
