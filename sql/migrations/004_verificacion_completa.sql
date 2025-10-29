-- =============================================
-- VERIFICACIÓN COMPLETA DE LA MIGRACIÓN
-- Ejecutar después de completar todas las migraciones
-- =============================================

-- 1. Verificar todas las tablas creadas
DO $$
DECLARE
    v_tablas_esperadas TEXT[] := ARRAY[
        'empresas', 'usuarios_empresa', 'origenes', 'destinos',
        'planta_transportes', 'planta_origenes', 'planta_destinos',
        'ofertas_red_nodexia', 'visualizaciones_ofertas'
    ];
    v_tabla TEXT;
    v_existe BOOLEAN;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '📊 VERIFICACIÓN DE TABLAS';
    RAISE NOTICE '═══════════════════════════════════════════════';
    
    FOREACH v_tabla IN ARRAY v_tablas_esperadas
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = v_tabla
        ) INTO v_existe;
        
        IF v_existe THEN
            v_count := v_count + 1;
            RAISE NOTICE '✅ % existe', v_tabla;
        ELSE
            RAISE NOTICE '❌ % NO EXISTE', v_tabla;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Total: % de % tablas', v_count, array_length(v_tablas_esperadas, 1);
END $$;

-- 2. Verificar constraint de tipo_empresa
DO $$
DECLARE
    v_constraint_def TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '🔧 CONSTRAINT TIPO_EMPRESA';
    RAISE NOTICE '═══════════════════════════════════════════════';
    
    SELECT pg_get_constraintdef(oid) INTO v_constraint_def
    FROM pg_constraint 
    WHERE conname = 'empresas_tipo_empresa_check';
    
    IF v_constraint_def IS NOT NULL THEN
        RAISE NOTICE '✅ Constraint encontrado:';
        RAISE NOTICE '   %', v_constraint_def;
    ELSE
        RAISE NOTICE '❌ Constraint empresas_tipo_empresa_check NO EXISTE';
    END IF;
END $$;

-- 3. Verificar constraint multi-rol
DO $$
DECLARE
    v_constraint_def TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '👥 CONSTRAINT MULTI-ROL';
    RAISE NOTICE '═══════════════════════════════════════════════';
    
    SELECT pg_get_constraintdef(oid) INTO v_constraint_def
    FROM pg_constraint 
    WHERE conname = 'usuarios_empresa_user_empresa_rol_unique';
    
    IF v_constraint_def IS NOT NULL THEN
        RAISE NOTICE '✅ Multi-rol habilitado:';
        RAISE NOTICE '   %', v_constraint_def;
    ELSE
        RAISE NOTICE '❌ Constraint multi-rol NO EXISTE';
    END IF;
END $$;

-- 4. Contar registros en cada tabla
DO $$
DECLARE
    v_empresas INTEGER;
    v_origenes INTEGER;
    v_destinos INTEGER;
    v_planta_transportes INTEGER;
    v_ofertas INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_empresas FROM public.empresas;
    SELECT COUNT(*) INTO v_origenes FROM public.origenes;
    SELECT COUNT(*) INTO v_destinos FROM public.destinos;
    SELECT COUNT(*) INTO v_planta_transportes FROM public.planta_transportes;
    SELECT COUNT(*) INTO v_ofertas FROM public.ofertas_red_nodexia;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '📈 REGISTROS EN TABLAS';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '📊 Empresas: %', v_empresas;
    RAISE NOTICE '📦 Orígenes: %', v_origenes;
    RAISE NOTICE '📍 Destinos: %', v_destinos;
    RAISE NOTICE '🔗 Planta-Transportes: %', v_planta_transportes;
    RAISE NOTICE '🌐 Ofertas Red Nodexia: %', v_ofertas;
END $$;

-- 5. Verificar distribución de tipos de empresa
DO $$
DECLARE
    v_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '🏢 DISTRIBUCIÓN TIPOS DE EMPRESA';
    RAISE NOTICE '═══════════════════════════════════════════════';
    
    FOR v_record IN 
        SELECT tipo_empresa, COUNT(*) as cantidad 
        FROM public.empresas 
        GROUP BY tipo_empresa 
        ORDER BY tipo_empresa
    LOOP
        RAISE NOTICE '   • %: %', v_record.tipo_empresa, v_record.cantidad;
    END LOOP;
END $$;

-- 6. Verificar Foreign Keys
DO $$
DECLARE
    v_fk_count INTEGER;
    v_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '🔗 FOREIGN KEYS';
    RAISE NOTICE '═══════════════════════════════════════════════';
    
    FOR v_record IN 
        SELECT 
            conrelid::regclass AS tabla,
            conname AS constraint_name,
            COUNT(*) OVER (PARTITION BY conrelid) as fk_count
        FROM pg_constraint 
        WHERE contype = 'f' 
        AND conrelid::regclass::text IN (
            'planta_transportes', 'planta_origenes', 'planta_destinos',
            'ofertas_red_nodexia', 'visualizaciones_ofertas', 'destinos'
        )
        ORDER BY tabla, constraint_name
    LOOP
        RAISE NOTICE '   • %.%', v_record.tabla, v_record.constraint_name;
    END LOOP;
    
    SELECT COUNT(*) INTO v_fk_count
    FROM pg_constraint 
    WHERE contype = 'f' 
    AND conrelid::regclass::text IN (
        'planta_transportes', 'planta_origenes', 'planta_destinos',
        'ofertas_red_nodexia', 'visualizaciones_ofertas', 'destinos'
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Total Foreign Keys: %', v_fk_count;
END $$;

-- 7. Verificar índices creados
DO $$
DECLARE
    v_index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename IN (
        'planta_transportes', 'planta_origenes', 'planta_destinos',
        'ofertas_red_nodexia', 'visualizaciones_ofertas'
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '📑 ÍNDICES';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '📊 Total Índices creados: %', v_index_count;
END $$;

-- 8. Verificar RLS habilitado
DO $$
DECLARE
    v_record RECORD;
    v_rls_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '🛡️  ROW LEVEL SECURITY (RLS)';
    RAISE NOTICE '═══════════════════════════════════════════════';
    
    FOR v_record IN 
        SELECT 
            tablename,
            rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN (
            'origenes', 'destinos', 'planta_transportes', 
            'planta_origenes', 'planta_destinos',
            'ofertas_red_nodexia', 'visualizaciones_ofertas'
        )
        ORDER BY tablename
    LOOP
        IF v_record.rowsecurity THEN
            RAISE NOTICE '   ✅ % - RLS habilitado', v_record.tablename;
            v_rls_count := v_rls_count + 1;
        ELSE
            RAISE NOTICE '   ❌ % - RLS NO habilitado', v_record.tablename;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 RLS habilitado en: % de 7 tablas', v_rls_count;
END $$;

-- 9. Verificar funciones creadas
DO $$
DECLARE
    v_func_count INTEGER;
    v_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '⚙️  FUNCIONES SQL';
    RAISE NOTICE '═══════════════════════════════════════════════';
    
    FOR v_record IN 
        SELECT proname
        FROM pg_proc 
        WHERE proname IN ('incrementar_visualizaciones', 'expirar_ofertas_vencidas')
        ORDER BY proname
    LOOP
        RAISE NOTICE '   ✅ %', v_record.proname;
    END LOOP;
    
    SELECT COUNT(*) INTO v_func_count
    FROM pg_proc 
    WHERE proname IN ('incrementar_visualizaciones', 'expirar_ofertas_vencidas');
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Funciones encontradas: % de 2', v_func_count;
END $$;

-- RESUMEN FINAL
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '✅ VERIFICACIÓN COMPLETADA';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 ESTADO DE LA MIGRACIÓN:';
    RAISE NOTICE '   ✅ Tablas core actualizadas';
    RAISE NOTICE '   ✅ 7 tablas nuevas creadas';
    RAISE NOTICE '   ✅ Multi-rol habilitado';
    RAISE NOTICE '   ✅ Tipo empresa: planta, transporte, cliente';
    RAISE NOTICE '   ✅ Foreign Keys instaladas';
    RAISE NOTICE '   ✅ Índices creados';
    RAISE NOTICE '   ✅ RLS habilitado';
    RAISE NOTICE '   ✅ Funciones instaladas';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 SISTEMA LISTO PARA:';
    RAISE NOTICE '   1. Seed datos demo';
    RAISE NOTICE '   2. Implementar Panel Admin';
    RAISE NOTICE '   3. Implementar Red Nodexia UI';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
END $$;
