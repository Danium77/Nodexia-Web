-- ================================================================
-- MIGRACIÓN BD - FASE 3: MIGRACIÓN DE DATOS
-- ================================================================
-- Fecha: 05-FEB-2026
-- Objetivo: Migrar datos históricos y consolidar tablas
-- ================================================================

-- 1. ANÁLISIS PREVIO - VERIFICAR ESTADO ACTUAL
-- ================================================================

-- Verificar si tracking_gps existe y tiene datos únicos
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracking_gps') THEN
        RAISE NOTICE '🔍 Tabla tracking_gps EXISTE - analizando datos...';
        
        -- Mostrar estadísticas de ambas tablas
        PERFORM (
            SELECT 
                'ANÁLISIS DE DATOS GPS' as titulo,
                tg.total_tracking_gps,
                uc.total_ubicaciones,
                tg.choferes_unicos_tracking,
                uc.choferes_unicos_ubicaciones,
                tg.fecha_min_tracking,
                tg.fecha_max_tracking,
                uc.fecha_min_ubicaciones,
                uc.fecha_max_ubicaciones
            FROM 
                (SELECT 
                    COUNT(*) as total_tracking_gps,
                    COUNT(DISTINCT chofer_id) as choferes_unicos_tracking,
                    MIN(created_at) as fecha_min_tracking,
                    MAX(created_at) as fecha_max_tracking
                FROM tracking_gps) tg,
                (SELECT 
                    COUNT(*) as total_ubicaciones,
                    COUNT(DISTINCT chofer_id) as choferes_unicos_ubicaciones,
                    MIN(created_at) as fecha_min_ubicaciones,
                    MAX(created_at) as fecha_max_ubicaciones
                FROM ubicaciones_choferes) uc
        );
        
    ELSE
        RAISE NOTICE '✅ Tabla tracking_gps NO EXISTE - migración no necesaria';
    END IF;
END $$;

-- ================================================================
-- 2. MIGRACIÓN DE DATOS GPS (SOLO SI ES NECESARIO)
-- ================================================================

-- Migrar datos únicos de tracking_gps a ubicaciones_choferes
DO $$
DECLARE
    registros_migrados INTEGER := 0;
BEGIN
    -- Solo migrar si tracking_gps existe y tiene datos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracking_gps') THEN
        
        -- Insertar datos únicos que NO existen en ubicaciones_choferes
        INSERT INTO ubicaciones_choferes (chofer_id, latitud, longitud, timestamp, created_at)
        SELECT 
            t.chofer_id,
            t.latitud,
            t.longitud,
            COALESCE(t.timestamp, t.created_at) as timestamp,
            COALESCE(t.created_at, t.timestamp) as created_at
        FROM tracking_gps t
        WHERE NOT EXISTS (
            SELECT 1 FROM ubicaciones_choferes u 
            WHERE u.chofer_id = t.chofer_id 
            AND ABS(EXTRACT(EPOCH FROM (u.timestamp - COALESCE(t.timestamp, t.created_at)))) < 60
            -- Considerar duplicado si es el mismo chofer en ventana de 60 segundos
        );
        
        GET DIAGNOSTICS registros_migrados = ROW_COUNT;
        
        RAISE NOTICE '✅ Migración GPS completada: % registros migrados', registros_migrados;
        
    END IF;
END $$;

-- ================================================================
-- 3. FIX ESTADOS UNIDAD VIAJE FALTANTES
-- ================================================================

-- Crear registros faltantes en estado_unidad_viaje para viajes que no los tienen
DO $$
DECLARE
    estados_creados INTEGER := 0;
BEGIN
    INSERT INTO estado_unidad_viaje (viaje_id, estado, updated_at, created_at)
    SELECT 
        v.id as viaje_id,
        CASE 
            WHEN v.estado = 'confirmado' THEN 'confirmado'
            WHEN v.estado = 'en_curso' OR v.estado = 'en_transito_origen' OR v.estado = 'en_transito_destino' THEN 'en_ruta'
            WHEN v.estado = 'finalizado' OR v.estado = 'entregado' THEN 'finalizado'
            WHEN v.estado = 'cancelado' THEN 'cancelado'
            WHEN v.chofer_id IS NOT NULL OR v.camion_id IS NOT NULL THEN 'asignado'
            ELSE 'pendiente'
        END as estado,
        COALESCE(v.updated_at, NOW()) as updated_at,
        COALESCE(v.created_at, NOW()) as created_at
    FROM viajes_despacho v
    WHERE NOT EXISTS (
        SELECT 1 FROM estado_unidad_viaje e 
        WHERE e.viaje_id = v.id
    )
    AND v.estado NOT IN ('expirado', 'cancelado'); -- No crear estados para viajes definitivamente terminados
    
    GET DIAGNOSTICS estados_creados = ROW_COUNT;
    
    RAISE NOTICE '✅ Estados unidad viaje creados: % registros', estados_creados;
END $$;

-- ================================================================
-- 4. VERIFICACIÓN POST-MIGRACIÓN
-- ================================================================

-- Verificar integridad después de migración
SELECT 
    'RESUMEN POST-MIGRACIÓN' as seccion,
    'viajes_despacho' as tabla,
    COUNT(*) as total_viajes,
    COUNT(chofer_id) as viajes_con_chofer,
    COUNT(camion_id) as viajes_con_camion,
    COUNT(acoplado_id) as viajes_con_acoplado,
    COUNT(DISTINCT chofer_id) as choferes_unicos,
    COUNT(DISTINCT camion_id) as camiones_unicos
FROM viajes_despacho
WHERE estado NOT IN ('cancelado', 'expirado')

UNION ALL

SELECT 
    'RESUMEN POST-MIGRACIÓN',
    'ubicaciones_choferes',
    COUNT(*),
    NULL,
    NULL,
    NULL,
    COUNT(DISTINCT chofer_id),
    NULL
FROM ubicaciones_choferes

UNION ALL

SELECT 
    'RESUMEN POST-MIGRACIÓN',
    'estado_unidad_viaje',
    COUNT(*),
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
FROM estado_unidad_viaje;

-- Verificar viajes sin estado_unidad_viaje (debería ser 0 después de la migración)
SELECT 
    'VIAJES SIN ESTADO UNIDAD' as verificacion,
    COUNT(*) as cantidad_problematica
FROM viajes_despacho v
WHERE NOT EXISTS (
    SELECT 1 FROM estado_unidad_viaje e 
    WHERE e.viaje_id = v.id
)
AND v.estado NOT IN ('expirado', 'cancelado');

-- ================================================================
-- 5. BACKUP DE SEGURIDAD (OPCIONAL)
-- ================================================================

-- Crear tabla de backup antes de eliminar tracking_gps (solo si existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracking_gps') THEN
        -- Crear backup con timestamp
        EXECUTE format('CREATE TABLE tracking_gps_backup_%s AS SELECT * FROM tracking_gps', 
                       to_char(NOW(), 'YYYYMMDD_HH24MI'));
        RAISE NOTICE '✅ Backup creado: tracking_gps_backup_%', to_char(NOW(), 'YYYYMMDD_HH24MI');
    END IF;
END $$;

-- ================================================================
-- NOTAS IMPORTANTES:
-- ================================================================
-- 1. Este script es IDEMPOTENTE - se puede ejecutar múltiples veces
-- 2. Crear backup manual antes de ejecutar en producción
-- 3. No elimina tracking_gps automáticamente - eso es responsabilidad de Fase 5
-- 4. Si hay problemas, usar 03-rollback-datos.sql
-- 5. Los estados unidad viaje se crean basado en estado actual del viaje
-- ================================================================