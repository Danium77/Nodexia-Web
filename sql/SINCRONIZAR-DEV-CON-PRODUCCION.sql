-- ============================================================================
-- SINCRONIZACIÓN DEV → PRODUCCIÓN: Sistema de Viajes Expirados
-- ============================================================================
-- Fecha: 27-Enero-2026
-- Propósito: Aplicar todas las diferencias de producción a DEV
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASO 1: Ejecuta primero el diagnóstico en SQL Editor
-- ============================================================================

/*
EJECUTA PRIMERO ESTO PARA VER EL ESTADO ACTUAL:

SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'despachos'
ORDER BY ordinal_position;

Necesitamos saber si existe 'scheduled_date_time' o solo 'scheduled_at'
*/

-- ============================================================================
-- PASO 2: Renombrar scheduled_at a scheduled_date_time (si es necesario)
-- ============================================================================

DO $$
BEGIN
    -- Verificar si existe scheduled_at y no existe scheduled_date_time
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'despachos' AND column_name = 'scheduled_at'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'despachos' AND column_name = 'scheduled_date_time'
    ) THEN
        ALTER TABLE despachos RENAME COLUMN scheduled_at TO scheduled_date_time;
        RAISE NOTICE '✅ Columna scheduled_at renombrada a scheduled_date_time';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'despachos' AND column_name = 'scheduled_date_time'
    ) THEN
        RAISE NOTICE '✅ Columna scheduled_date_time ya existe';
    ELSE
        -- Crear la columna desde cero
        ALTER TABLE despachos ADD COLUMN scheduled_date_time timestamptz;
        RAISE NOTICE '✅ Columna scheduled_date_time creada';
    END IF;
END $$;

-- ============================================================================
-- PASO 3: Agregar estado 'expirado' al enum
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'estado_unidad_viaje'::regtype 
        AND enumlabel = 'expirado'
    ) THEN
        ALTER TYPE estado_unidad_viaje ADD VALUE 'expirado';
        RAISE NOTICE '✅ Estado "expirado" agregado a estado_unidad_viaje';
    ELSE
        RAISE NOTICE '⚠️  Estado "expirado" ya existe';
    END IF;
END $$;

-- ============================================================================
-- PASO 4: Crear función marcar_viajes_expirados
-- ============================================================================

CREATE OR REPLACE FUNCTION marcar_viajes_expirados()
RETURNS TABLE (
    viajes_expirados integer,
    viajes_revisados integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count integer := 0;
    v_revisados integer := 0;
    v_now timestamptz := NOW();
BEGIN
    -- Contar viajes que cumplan condiciones
    SELECT COUNT(*) INTO v_revisados
    FROM viajes_despacho v
    INNER JOIN despachos d ON d.id = v.despacho_id
    WHERE 
        v.estado IN ('pendiente', 'asignado')
        AND d.scheduled_date_time < v_now
        AND (v.chofer_id IS NULL OR v.camion_id IS NULL);
    
    -- Marcar como expirados
    WITH viajes_actualizados AS (
        UPDATE viajes_despacho v
        SET 
            estado = 'expirado',
            updated_at = v_now
        FROM despachos d
        WHERE 
            v.despacho_id = d.id
            AND v.estado IN ('pendiente', 'asignado')
            AND d.scheduled_date_time < v_now
            AND (v.chofer_id IS NULL OR v.camion_id IS NULL)
        RETURNING v.id
    )
    SELECT COUNT(*) INTO v_count FROM viajes_actualizados;
    
    RETURN QUERY SELECT v_count, v_revisados;
END;
$$;

-- ============================================================================
-- PASO 5: Crear función ejecutar_expiracion_viajes (wrapper para cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION ejecutar_expiracion_viajes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result RECORD;
    v_response jsonb;
BEGIN
    -- Ejecutar marcado
    SELECT * INTO v_result FROM marcar_viajes_expirados();
    
    -- Construir respuesta
    v_response := jsonb_build_object(
        'success', true,
        'viajes_expirados', v_result.viajes_expirados,
        'viajes_revisados', v_result.viajes_revisados,
        'timestamp', NOW()
    );
    
    RETURN v_response;
END;
$$;

-- ============================================================================
-- PASO 6: Crear vista vista_viajes_expirados
-- ============================================================================

CREATE OR REPLACE VIEW vista_viajes_expirados AS
SELECT 
    v.id AS viaje_id,
    v.despacho_id,
    d.pedido_id,
    d.scheduled_date_time AS fecha_programada,
    v.updated_at AS fecha_expiracion,
    EXTRACT(EPOCH FROM (v.updated_at - d.scheduled_date_time))/3600 AS horas_despues_programado,
    CASE
        WHEN v.chofer_id IS NULL AND v.camion_id IS NULL THEN 'Sin chofer ni camión'
        WHEN v.chofer_id IS NULL THEN 'Sin chofer'
        WHEN v.camion_id IS NULL THEN 'Sin camión'
        ELSE 'Recursos incompletos'
    END AS razon_expiracion,
    v.transport_id,
    v.chofer_id,
    v.camion_id,
    d.created_by AS coordinador_responsable
FROM viajes_despacho v
INNER JOIN despachos d ON d.id = v.despacho_id
WHERE v.estado = 'expirado'
ORDER BY v.updated_at DESC;

-- ============================================================================
-- PASO 7: Crear función get_metricas_expiracion
-- ============================================================================

CREATE OR REPLACE FUNCTION get_metricas_expiracion()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_total_expirados integer;
    v_ultimas_24h integer;
    v_ultimos_7dias integer;
    v_sin_chofer integer;
    v_sin_camion integer;
    v_sin_ambos integer;
BEGIN
    -- Total expirados
    SELECT COUNT(*) INTO v_total_expirados
    FROM viajes_despacho
    WHERE estado = 'expirado';
    
    -- Últimas 24 horas
    SELECT COUNT(*) INTO v_ultimas_24h
    FROM viajes_despacho
    WHERE estado = 'expirado'
    AND updated_at > NOW() - INTERVAL '24 hours';
    
    -- Últimos 7 días
    SELECT COUNT(*) INTO v_ultimos_7dias
    FROM viajes_despacho
    WHERE estado = 'expirado'
    AND updated_at > NOW() - INTERVAL '7 days';
    
    -- Por tipo de falta
    SELECT 
        COUNT(*) FILTER (WHERE chofer_id IS NULL AND camion_id IS NOT NULL),
        COUNT(*) FILTER (WHERE camion_id IS NULL AND chofer_id IS NOT NULL),
        COUNT(*) FILTER (WHERE chofer_id IS NULL AND camion_id IS NULL)
    INTO v_sin_chofer, v_sin_camion, v_sin_ambos
    FROM viajes_despacho
    WHERE estado = 'expirado';
    
    RETURN jsonb_build_object(
        'total_expirados', v_total_expirados,
        'ultimas_24h', v_ultimas_24h,
        'ultimos_7dias', v_ultimos_7dias,
        'sin_chofer', v_sin_chofer,
        'sin_camion', v_sin_camion,
        'sin_ambos', v_sin_ambos
    );
END;
$$;

-- ============================================================================
-- PASO 8: Ejecutar primera vez (marcar viajes históricos)
-- ============================================================================

DO $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT ejecutar_expiracion_viajes() INTO v_result;
    RAISE NOTICE '============================================';
    RAISE NOTICE 'INSTALACIÓN COMPLETADA';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Primera ejecución: %', v_result;
    RAISE NOTICE '============================================';
END $$;

COMMIT;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

SELECT 
    '✅ SISTEMA INSTALADO CORRECTAMENTE' AS estado,
    (SELECT COUNT(*) FROM viajes_despacho WHERE estado = 'expirado') AS viajes_expirados_marcados,
    (SELECT COUNT(*) FROM pg_proc WHERE proname LIKE '%expir%') AS funciones_instaladas,
    (SELECT COUNT(*) FROM pg_views WHERE viewname LIKE '%expir%') AS vistas_instaladas;
