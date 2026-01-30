-- ============================================================================
-- REPARACIÓN DEV: Sistema de Expiración SIN usar ENUM
-- ============================================================================
-- Fecha: 28-Enero-2026
-- Nota: estado es TEXT, no ENUM, así que trabajamos con TEXT
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASO 1: Verificar tipo de columna estado
-- ============================================================================

DO $$
DECLARE
    v_tipo_estado text;
BEGIN
    SELECT data_type INTO v_tipo_estado
    FROM information_schema.columns
    WHERE table_name = 'viajes_despacho' AND column_name = 'estado';
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Tipo de columna estado: %', v_tipo_estado;
    RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- PASO 2: Agregar columna scheduled_date_time si no existe
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'despachos' AND column_name = 'scheduled_date_time'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'despachos' AND column_name = 'scheduled_at'
        ) THEN
            ALTER TABLE despachos RENAME COLUMN scheduled_at TO scheduled_date_time;
            RAISE NOTICE '✅ Columna scheduled_at renombrada';
        ELSE
            ALTER TABLE despachos ADD COLUMN scheduled_date_time timestamptz;
            RAISE NOTICE '✅ Columna scheduled_date_time creada';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  Columna scheduled_date_time ya existe';
    END IF;
END $$;

-- ============================================================================
-- PASO 3: Funciones de Expiración (trabajando con TEXT)
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
    
    -- Marcar como expirados (usando TEXT)
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

CREATE OR REPLACE FUNCTION ejecutar_expiracion_viajes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result RECORD;
BEGIN
    SELECT * INTO v_result FROM marcar_viajes_expirados();
    
    RETURN jsonb_build_object(
        'success', true,
        'viajes_expirados', v_result.viajes_expirados,
        'viajes_revisados', v_result.viajes_revisados,
        'timestamp', NOW()
    );
END;
$$;

CREATE OR REPLACE FUNCTION get_metricas_expiracion()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_total_expirados integer;
    v_ultimas_24h integer;
    v_ultimos_7dias integer;
BEGIN
    SELECT COUNT(*) INTO v_total_expirados
    FROM viajes_despacho
    WHERE estado = 'expirado';
    
    SELECT COUNT(*) INTO v_ultimas_24h
    FROM viajes_despacho
    WHERE estado = 'expirado'
    AND updated_at > NOW() - INTERVAL '24 hours';
    
    SELECT COUNT(*) INTO v_ultimos_7dias
    FROM viajes_despacho
    WHERE estado = 'expirado'
    AND updated_at > NOW() - INTERVAL '7 days';
    
    RETURN jsonb_build_object(
        'total_expirados', v_total_expirados,
        'ultimas_24h', v_ultimas_24h,
        'ultimos_7dias', v_ultimos_7dias
    );
END;
$$;

-- ============================================================================
-- PASO 4: Vista de Viajes Expirados
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
-- PASO 5: Ejecutar marcado (primera vez)
-- ============================================================================

DO $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT ejecutar_expiracion_viajes() INTO v_result;
    RAISE NOTICE '============================================';
    RAISE NOTICE 'SISTEMA DE EXPIRACIÓN INSTALADO Y EJECUTADO';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Resultado: %', v_result;
    RAISE NOTICE '============================================';
END $$;

COMMIT;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

SELECT 
    '✅ INSTALACIÓN COMPLETADA' AS estado,
    (SELECT COUNT(*) FROM viajes_despacho WHERE estado = 'expirado') AS viajes_expirados_ahora,
    (SELECT COUNT(*) FROM pg_proc WHERE proname LIKE '%expir%') AS funciones_creadas,
    (SELECT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'vista_viajes_expirados')) AS vista_existe;
