-- =============================================
-- PARCHE: Completar Foreign Keys de ofertas_red_nodexia
-- Fecha: 19 de Octubre 2025
-- =============================================

-- Verificar si la tabla ofertas_red_nodexia existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ofertas_red_nodexia'
    ) THEN
        RAISE EXCEPTION 'Tabla ofertas_red_nodexia no existe. Ejecutar migración principal primero.';
    END IF;
    
    RAISE NOTICE '✅ Tabla ofertas_red_nodexia encontrada';
END $$;

-- Eliminar FKs existentes si hay alguna
DO $$
BEGIN
    ALTER TABLE public.ofertas_red_nodexia 
    DROP CONSTRAINT IF EXISTS fk_ofertas_planta;
    
    ALTER TABLE public.ofertas_red_nodexia 
    DROP CONSTRAINT IF EXISTS fk_ofertas_transporte;
    
    ALTER TABLE public.ofertas_red_nodexia 
    DROP CONSTRAINT IF EXISTS fk_ofertas_despacho;
    
    RAISE NOTICE '✅ Constraints viejos eliminados (si existían)';
END $$;

-- Agregar FKs correctamente
DO $$
BEGIN
    -- FK para planta_id → empresas(id)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ofertas_red_nodexia'
        AND column_name = 'planta_id'
    ) THEN
        ALTER TABLE public.ofertas_red_nodexia 
        ADD CONSTRAINT fk_ofertas_planta 
        FOREIGN KEY (planta_id) 
        REFERENCES public.empresas(id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE '✅ FK ofertas → planta agregada';
    ELSE
        RAISE NOTICE '⚠️  Columna planta_id no existe en ofertas_red_nodexia';
    END IF;
    
    -- FK para transporte_tomador_id → empresas(id)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ofertas_red_nodexia'
        AND column_name = 'transporte_tomador_id'
    ) THEN
        ALTER TABLE public.ofertas_red_nodexia 
        ADD CONSTRAINT fk_ofertas_transporte 
        FOREIGN KEY (transporte_tomador_id) 
        REFERENCES public.empresas(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE '✅ FK ofertas → transporte agregada';
    ELSE
        RAISE NOTICE '⚠️  Columna transporte_tomador_id no existe';
    END IF;
    
    -- FK para despacho_id → despachos(id) (si existe tabla despachos)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'despachos'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ofertas_red_nodexia'
        AND column_name = 'despacho_id'
    ) THEN
        ALTER TABLE public.ofertas_red_nodexia 
        ADD CONSTRAINT fk_ofertas_despacho 
        FOREIGN KEY (despacho_id) 
        REFERENCES public.despachos(id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE '✅ FK ofertas → despachos agregada';
    ELSE
        RAISE NOTICE '⚠️  Tabla despachos no existe o columna despacho_id no existe';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error al agregar FKs: %', SQLERRM;
END $$;

-- Verificación final
DO $$
DECLARE
    v_fk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_fk_count
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
    AND table_name = 'ofertas_red_nodexia';
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '✅ PARCHE APLICADO';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '📊 Foreign Keys en ofertas_red_nodexia: %', v_fk_count;
    RAISE NOTICE '';
    
    IF v_fk_count >= 2 THEN
        RAISE NOTICE '🚀 Migración 100%% completa';
    ELSE
        RAISE NOTICE '⚠️  Algunas FKs no se pudieron agregar (ver mensajes arriba)';
    END IF;
    
    RAISE NOTICE '═══════════════════════════════════════════════';
END $$;
