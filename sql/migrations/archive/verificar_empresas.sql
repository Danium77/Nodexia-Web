-- =====================================================
-- SCRIPT: Verificar empresas actuales
-- =====================================================
-- Este script muestra todas las empresas en la BD
-- para identificar cuáles son datos hardcodeados
-- =====================================================

SELECT 
    id,
    nombre,
    cuit,
    tipo_empresa,
    activo,
    created_at,
    CASE 
        WHEN created_at IS NULL THEN '⚠️ Posiblemente hardcodeada'
        ELSE '✓ Creada via UI'
    END as origen
FROM public.empresas
ORDER BY created_at NULLS FIRST, nombre;

-- Verificación
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.empresas;
    RAISE NOTICE '📊 Total empresas en BD: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM public.empresas WHERE created_at IS NULL;
    RAISE NOTICE '⚠️ Empresas sin fecha (probablemente hardcodeadas): %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM public.empresas WHERE created_at IS NOT NULL;
    RAISE NOTICE '✓ Empresas creadas via UI: %', v_count;
END $$;
