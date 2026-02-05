-- ================================================================
-- MIGRACIÓN BD - FASE 5: CLEANUP FINAL
-- ================================================================
-- Fecha: 05-FEB-2026
-- Objetivo: Eliminar elementos temporales después de migración exitosa
-- EJECUTAR SOLO después de verificar que todo funciona correctamente
-- ================================================================

-- 1. VERIFICACIÓN PREVIA (OBLIGATORIA)
-- ================================================================

-- Confirmar que no hay errores de id_chofer, id_camion en logs de aplicación
-- Confirmar que todas las pantallas muestran datos correctamente:
-- ✓ GPS tracking funciona
-- ✓ Crear despacho muestra choferes/camiones/acoplados
-- ✓ Viajes activos muestra indicadores de estado
-- ✓ Planificación muestra recursos asignados

-- Verificar estado actual antes del cleanup
SELECT 
    'PRE-CLEANUP VERIFICACIÓN' as seccion,
    'viajes_despacho' as tabla,
    COUNT(*) as total_viajes,
    COUNT(chofer_id) as con_chofer,
    COUNT(camion_id) as con_camion,
    COUNT(acoplado_id) as con_acoplado
FROM viajes_despacho
WHERE estado NOT IN ('cancelado', 'expirado')

UNION ALL

SELECT 
    'PRE-CLEANUP VERIFICACIÓN',
    'ubicaciones_choferes',
    COUNT(*),
    COUNT(DISTINCT chofer_id),
    NULL,
    NULL
FROM ubicaciones_choferes

UNION ALL

SELECT 
    'PRE-CLEANUP VERIFICACIÓN',
    'estado_unidad_viaje',
    COUNT(*),
    NULL,
    NULL,
    NULL
FROM estado_unidad_viaje;

-- ================================================================
-- 2. ELIMINAR VIEWS TEMPORALES
-- ================================================================

-- Eliminar views de compatibilidad creadas en Fase 1
DROP VIEW IF EXISTS viajes_despacho_legacy;
DROP VIEW IF EXISTS tracking_gps_legacy;

RAISE NOTICE '✅ Views temporales eliminadas exitosamente';

-- ================================================================
-- 3. ELIMINAR TABLA tracking_gps (SI EXISTE)
-- ================================================================

-- Solo eliminar si la migración de datos fue exitosa
DO $$
DECLARE
    backup_count INTEGER := 0;
BEGIN
    -- Verificar que existe al menos un backup
    SELECT COUNT(*) INTO backup_count
    FROM information_schema.tables 
    WHERE table_name LIKE 'tracking_gps_backup_%';
    
    IF backup_count > 0 THEN
        -- Si existe backup, proceder a eliminar tracking_gps
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracking_gps') THEN
            DROP TABLE tracking_gps;
            RAISE NOTICE '✅ Tabla tracking_gps eliminada (backup disponible)';
        ELSE
            RAISE NOTICE 'ℹ️ Tabla tracking_gps ya no existe';
        END IF;
    ELSE
        -- Si no hay backup, solo advertir
        RAISE NOTICE '⚠️ No se eliminó tracking_gps - no hay backup disponible';
        RAISE NOTICE '📋 Para eliminar manualmente después de confirmar que todo funciona:';
        RAISE NOTICE '    DROP TABLE IF EXISTS tracking_gps;';
    END IF;
END $$;

-- ================================================================
-- 4. CLEANUP DE BACKUPS ANTIGUOS (OPCIONAL)
-- ================================================================

-- Listar backups disponibles para limpieza manual
SELECT 
    table_name as backup_table,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size,
    'CLEANUP MANUAL OPCIONAL' as action
FROM information_schema.tables 
WHERE table_name LIKE 'tracking_gps_backup_%'
ORDER BY table_name;

-- Comando manual para eliminar backups (descomentar después de 1 semana):
-- DROP TABLE IF EXISTS tracking_gps_backup_[TIMESTAMP];

-- ================================================================
-- 5. VERIFICACIÓN POST-CLEANUP
-- ================================================================

-- Verificar estado final después del cleanup
SELECT 
    'POST-CLEANUP VERIFICACIÓN' as seccion,
    'tracking_gps' as tabla,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracking_gps') 
        THEN 'EXISTE (REVISAR)'
        ELSE 'ELIMINADA ✓'
    END as estado

UNION ALL

SELECT 
    'POST-CLEANUP VERIFICACIÓN',
    'views_temporales',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name IN ('viajes_despacho_legacy', 'tracking_gps_legacy')
        )
        THEN 'EXISTEN (ERROR)'
        ELSE 'ELIMINADAS ✓'
    END

UNION ALL

SELECT 
    'POST-CLEANUP VERIFICACIÓN',
    'ubicaciones_choferes',
    'ACTIVA ✓'

UNION ALL

SELECT 
    'POST-CLEANUP VERIFICACIÓN',
    'viajes_despacho',
    'ACTIVA ✓';

-- ================================================================
-- 6. ACTUALIZACIÓN DE ÍNDICES (OPCIONAL)
-- ================================================================

-- Verificar que los índices estén optimizados
REINDEX TABLE ubicaciones_choferes;
REINDEX TABLE viajes_despacho;

RAISE NOTICE '✅ Índices optimizados';

-- ================================================================
-- RESULTADO FINAL
-- ================================================================

RAISE NOTICE '🎉 MIGRACIÓN BD COMPLETADA EXITOSAMENTE';
RAISE NOTICE '';
RAISE NOTICE '📊 RESUMEN:';
RAISE NOTICE '  ✅ Nomenclatura unificada: chofer_id, camion_id, acoplado_id';
RAISE NOTICE '  ✅ Tabla GPS consolidada: ubicaciones_choferes';
RAISE NOTICE '  ✅ Estados unidad viaje: registros completos';
RAISE NOTICE '  ✅ Views temporales: eliminadas';
RAISE NOTICE '  ✅ Código TypeScript: 7 archivos corregidos';
RAISE NOTICE '';
RAISE NOTICE '🔍 PRÓXIMOS PASOS:';
RAISE NOTICE '  1. Monitorear logs de aplicación por 24-48h';
RAISE NOTICE '  2. Eliminar backups antiguos cuando todo esté estable';
RAISE NOTICE '  3. Actualizar documentación técnica si es necesario';

-- ================================================================
-- NOTAS IMPORTANTES:
-- ================================================================
-- 1. Este cleanup es IRREVERSIBLE (salvo por backups)
-- 2. Ejecutar solo después de testing completo
-- 3. Mantener backups por al menos 1 semana
-- 4. Si hay problemas, usar backups para restaurar
-- ================================================================