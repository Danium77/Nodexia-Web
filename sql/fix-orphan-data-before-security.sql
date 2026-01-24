-- =====================================================
-- DIAGNÓSTICO Y LIMPIEZA DE DATOS HUÉRFANOS
-- =====================================================
-- Fecha: 22 de Enero 2026
-- Problema: viajes_despacho con despacho_id inexistente
-- Ejecutar ANTES de security-improvements-soft-delete-rls.sql
-- =====================================================

BEGIN;

-- =====================================================
-- PASO 1: DIAGNÓSTICO - Identificar datos huérfanos
-- =====================================================

DO $$
DECLARE
    huerfanos_count INTEGER;
BEGIN
    -- Contar viajes huérfanos
    SELECT COUNT(*)
    INTO huerfanos_count
    FROM viajes_despacho vd
    LEFT JOIN despachos d ON vd.despacho_id = d.id
    WHERE d.id IS NULL;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔍 DIAGNÓSTICO DE INTEGRIDAD REFERENCIAL';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Viajes huérfanos encontrados: %', huerfanos_count;
    RAISE NOTICE '';
    
    IF huerfanos_count = 0 THEN
        RAISE NOTICE '✅ No hay viajes huérfanos - Base de datos íntegra';
        RAISE NOTICE '✅ Puedes ejecutar: security-improvements-soft-delete-rls.sql';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '⚠️ Se encontraron % viajes huérfanos', huerfanos_count;
        RAISE NOTICE '📋 Ver tabla de resultados para detalles';
        RAISE NOTICE '';
    END IF;
END $$;

-- =====================================================
-- PASO 2: MOSTRAR DETALLE DE VIAJES HUÉRFANOS
-- =====================================================

SELECT 
    'VIAJES HUÉRFANOS' AS reporte,
    vd.id AS viaje_id,
    vd.despacho_id AS despacho_inexistente,
    vd.numero_viaje,
    vd.estado,
    vd.created_at,
    vd.transport_id,
    e.nombre AS empresa_transporte
FROM viajes_despacho vd
LEFT JOIN despachos d ON vd.despacho_id = d.id
LEFT JOIN empresas e ON vd.transport_id = e.id
WHERE d.id IS NULL
ORDER BY vd.created_at DESC
LIMIT 20;

-- =====================================================
-- PASO 3: OPCIONES DE CORRECCIÓN
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🛠️ OPCIONES DE CORRECCIÓN';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Opción 1: ELIMINAR viajes huérfanos (RECOMENDADO)';
    RAISE NOTICE '   - Estos viajes no tienen despacho padre válido';
    RAISE NOTICE '   - Son datos corruptos que deben limpiarse';
    RAISE NOTICE '   - Script: Ejecutar PASO 4 a continuación';
    RAISE NOTICE '';
    RAISE NOTICE 'Opción 2: RECREAR despachos faltantes (NO RECOMENDADO)';
    RAISE NOTICE '   - Requiere información adicional no disponible';
    RAISE NOTICE '   - Puede generar más inconsistencias';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- PASO 4: LIMPIEZA - Eliminar viajes huérfanos
-- =====================================================
-- ⚠️ DESCOMENTAR SOLO DESPUÉS DE REVISAR EL REPORTE ANTERIOR

-- DELETE FROM viajes_despacho vd
-- WHERE NOT EXISTS (
--     SELECT 1 FROM despachos d WHERE d.id = vd.despacho_id
-- );

-- Descomentar este bloque cuando estés listo:
/*
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM viajes_despacho vd
        WHERE NOT EXISTS (
            SELECT 1 FROM despachos d WHERE d.id = vd.despacho_id
        )
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '🧹 LIMPIEZA COMPLETADA';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Viajes huérfanos eliminados: %', deleted_count;
    RAISE NOTICE '';
    RAISE NOTICE '⏭️ SIGUIENTE PASO:';
    RAISE NOTICE '   Ejecutar: security-improvements-soft-delete-rls.sql';
    RAISE NOTICE '';
END $$;
*/

-- =====================================================
-- PASO 5: VERIFICACIÓN POST-LIMPIEZA
-- =====================================================
-- Ejecutar DESPUÉS de descomentar y ejecutar PASO 4

/*
DO $$
DECLARE
    huerfanos_restantes INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO huerfanos_restantes
    FROM viajes_despacho vd
    LEFT JOIN despachos d ON vd.despacho_id = d.id
    WHERE d.id IS NULL;
    
    IF huerfanos_restantes = 0 THEN
        RAISE NOTICE '✅ Base de datos limpia. Sin viajes huérfanos.';
        RAISE NOTICE '✅ Listo para ejecutar security-improvements-soft-delete-rls.sql';
    ELSE
        RAISE EXCEPTION '❌ Aún quedan % viajes huérfanos', huerfanos_restantes;
    END IF;
END $$;
*/

COMMIT;

-- =====================================================
-- INSTRUCCIONES DE USO
-- =====================================================
-- 
-- 1. Ejecutar este script COMPLETO (con COMMIT comentados)
-- 2. Revisar el reporte de viajes huérfanos
-- 3. Si estás de acuerdo con eliminarlos:
--    - Descomentar el bloque del PASO 4 (líneas 80-100)
--    - Ejecutar de nuevo
-- 4. Verificar que deleted_count > 0
-- 5. Ejecutar security-improvements-soft-delete-rls.sql
-- 
-- =====================================================
