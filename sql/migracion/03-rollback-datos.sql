-- ================================================================
-- MIGRACIÓN BD - ROLLBACK FASE 3: REVERTIR MIGRACIÓN DE DATOS
-- ================================================================
-- Fecha: 05-FEB-2026
-- Objetivo: Script de emergencia para revertir migración de datos
-- USAR SOLO EN EMERGENCIA si la migración causó problemas
-- ================================================================

-- ⚠️ ADVERTENCIA IMPORTANTE:
-- Este rollback eliminará datos agregados durante la migración
-- Ejecutar solo si hay problemas críticos confirmados
-- ================================================================

-- 1. RESTAURAR DESDE BACKUP (SI EXISTE)
-- ================================================================

DO $$
DECLARE
    backup_name TEXT;
BEGIN
    -- Buscar tabla de backup más reciente
    SELECT table_name INTO backup_name
    FROM information_schema.tables 
    WHERE table_name LIKE 'tracking_gps_backup_%' 
    ORDER BY table_name DESC 
    LIMIT 1;
    
    IF backup_name IS NOT NULL THEN
        RAISE NOTICE '📦 Backup encontrado: %', backup_name;
        
        -- Restaurar tracking_gps desde backup
        EXECUTE format('CREATE TABLE tracking_gps AS SELECT * FROM %s', backup_name);
        
        RAISE NOTICE '✅ Tabla tracking_gps restaurada desde backup';
    ELSE
        RAISE NOTICE '⚠️ No se encontró backup de tracking_gps';
    END IF;
END $$;

-- ================================================================
-- 2. ELIMINAR REGISTROS MIGRADOS (UBICACIONES GPS)
-- ================================================================

-- SOLO ejecutar si se puede identificar qué registros fueron migrados
-- Por seguridad, este paso requiere confirmación manual

-- ⚠️ DESCOMENTAR SOLO SI ESTÁS SEGURO:
-- DELETE FROM ubicaciones_choferes 
-- WHERE created_at > (SELECT MAX(created_at) FROM tracking_gps_backup_[TIMESTAMP]);

RAISE NOTICE '⚠️ ELIMINAR REGISTROS DE ubicaciones_choferes REQUIERE INTERVENCIÓN MANUAL';
RAISE NOTICE '📝 Revisar manualmente qué registros fueron agregados durante migración';

-- ================================================================
-- 3. ELIMINAR ESTADOS UNIDAD VIAJE CREADOS
-- ================================================================

-- Eliminar estados creados durante la migración (los más recientes)
DO $$
DECLARE
    estados_eliminados INTEGER := 0;
BEGIN
    -- Eliminar estados creados en las últimas 2 horas (tiempo de ventana de migración)
    DELETE FROM estado_unidad_viaje 
    WHERE created_at > (NOW() - INTERVAL '2 hours')
    AND estado IN ('asignado', 'pendiente', 'confirmado', 'en_ruta');
    
    GET DIAGNOSTICS estados_eliminados = ROW_COUNT;
    
    RAISE NOTICE '🗑️ Estados unidad viaje eliminados: %', estados_eliminados;
END $$;

-- ================================================================
-- 4. VERIFICACIÓN POST-ROLLBACK
-- ================================================================

-- Verificar estado después del rollback
SELECT 
    'POST-ROLLBACK VERIFICACIÓN' as seccion,
    'tracking_gps' as tabla,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracking_gps') 
        THEN 'EXISTE'
        ELSE 'NO EXISTE'
    END as estado,
    COALESCE((SELECT COUNT(*) FROM tracking_gps WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracking_gps')), 0) as registros

UNION ALL

SELECT 
    'POST-ROLLBACK VERIFICACIÓN',
    'ubicaciones_choferes',
    'EXISTE',
    COUNT(*)
FROM ubicaciones_choferes

UNION ALL

SELECT 
    'POST-ROLLBACK VERIFICACIÓN',
    'estado_unidad_viaje',
    'EXISTE', 
    COUNT(*)
FROM estado_unidad_viaje;

-- ================================================================
-- 5. LIMPIAR BACKUPS TEMPORALES
-- ================================================================

-- Listar backups disponibles para limpieza manual
SELECT 
    table_name as backup_disponible,
    'REVISAR PARA LIMPIEZA MANUAL' as accion
FROM information_schema.tables 
WHERE table_name LIKE 'tracking_gps_backup_%'
ORDER BY table_name;

-- ================================================================
-- NOTAS FINALES:
-- ================================================================
-- 1. Después del rollback, el código con nomenclatura nueva PUEDE FALLAR
-- 2. Será necesario revertir también los cambios de código (git reset)
-- 3. Este rollback es PARCIAL - verificar manualmente la integridad
-- 4. En producción, considerar restaurar desde backup completo de BD
-- ================================================================

RAISE NOTICE '⚠️ ROLLBACK COMPLETADO - VERIFICAR MANUALMENTE LA INTEGRIDAD';
RAISE NOTICE '📋 PRÓXIMOS PASOS:';
RAISE NOTICE '   1. Verificar que las aplicaciones funcionen';
RAISE NOTICE '   2. Revisar logs de errores';
RAISE NOTICE '   3. Considerar git reset si es necesario';
RAISE NOTICE '   4. Limpiar backups temporales cuando todo esté estable';