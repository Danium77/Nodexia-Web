-- =====================================================
-- LIMPIEZA RÁPIDA DE VIAJES HUÉRFANOS
-- =====================================================
-- Ejecutar en Supabase DEV
-- =====================================================

BEGIN;

-- Eliminar viajes huérfanos
WITH deleted AS (
    DELETE FROM viajes_despacho vd
    WHERE NOT EXISTS (
        SELECT 1 FROM despachos d WHERE d.id = vd.despacho_id
    )
    RETURNING *
)
SELECT 
    COUNT(*) as viajes_eliminados,
    '✅ Viajes huérfanos eliminados correctamente' as mensaje
FROM deleted;

-- Verificar que no quedan viajes huérfanos
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
        RAISE NOTICE '========================================';
        RAISE NOTICE '✅ LIMPIEZA COMPLETADA';
        RAISE NOTICE '========================================';
        RAISE NOTICE '';
        RAISE NOTICE '✅ Base de datos limpia. Sin viajes huérfanos.';
        RAISE NOTICE '✅ Integridad referencial verificada.';
        RAISE NOTICE '';
        RAISE NOTICE '⏭️ SIGUIENTE PASO:';
        RAISE NOTICE '   Ejecutar: security-improvements-soft-delete-rls.sql';
        RAISE NOTICE '';
    ELSE
        RAISE EXCEPTION '❌ Aún quedan % viajes huérfanos', huerfanos_restantes;
    END IF;
END $$;

COMMIT;
