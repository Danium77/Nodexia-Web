-- =====================================================
-- SCRIPT: Limpiar empresas hardcodeadas
-- =====================================================
-- ADVERTENCIA: Este script elimina TODAS las empresas
-- y sus datos relacionados. Usar con precaución.
-- =====================================================

-- PASO 1: Verificar qué se va a eliminar
DO $$
DECLARE
    v_empresas INTEGER;
    v_usuarios_empresa INTEGER;
    v_ubicaciones_vinculadas INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_empresas FROM public.empresas;
    SELECT COUNT(*) INTO v_usuarios_empresa FROM public.usuarios_empresa;
    SELECT COUNT(*) INTO v_ubicaciones_vinculadas FROM public.empresa_ubicaciones;
    
    RAISE NOTICE '⚠️ DATOS QUE SE ELIMINARÁN:';
    RAISE NOTICE '  - Empresas: %', v_empresas;
    RAISE NOTICE '  - Vínculos usuarios-empresa: %', v_usuarios_empresa;
    RAISE NOTICE '  - Ubicaciones vinculadas: %', v_ubicaciones_vinculadas;
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ Las UBICACIONES no se eliminarán (solo los vínculos)';
    RAISE NOTICE '⚠️ Los USUARIOS no se eliminarán (solo sus vínculos a empresas)';
END $$;

-- PASO 2: Descomentar estas líneas para ejecutar la limpieza
/*
-- Eliminar vinculaciones de ubicaciones a empresas
DELETE FROM public.empresa_ubicaciones;

-- Eliminar vinculaciones de usuarios a empresas
DELETE FROM public.usuarios_empresa;

-- Eliminar relaciones entre empresas (si existe la tabla)
DELETE FROM public.relaciones_empresas WHERE TRUE;

-- Eliminar empresas
DELETE FROM public.empresas;

-- Verificación final
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.empresas;
    RAISE NOTICE '✅ Limpieza completada';
    RAISE NOTICE '📊 Empresas restantes: %', v_count;
    
    IF v_count = 0 THEN
        RAISE NOTICE '✓ Base de datos limpia - lista para crear empresas desde UI';
    END IF;
END $$;
*/

-- =====================================================
-- IMPORTANTE: 
-- Este script está comentado por seguridad.
-- Para ejecutar la limpieza, descomentá el bloque
-- entre /* y */
-- =====================================================
