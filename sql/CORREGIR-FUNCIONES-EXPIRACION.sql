-- ============================================================================
-- CORRECCIÓN: Funciones de expiración con nombres de columnas correctos
-- ============================================================================
-- Fecha: 28-Enero-2026
-- Problema: Las funciones usan 'estado' pero la columna es 'estado_unidad'
-- ============================================================================

-- Función principal: Marca viajes como expirados
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
        v.estado_unidad IN ('pendiente', 'asignado')
        AND d.scheduled_date_time < v_now
        AND (v.chofer_id IS NULL OR v.camion_id IS NULL);
    
    -- Marcar como expirados
    WITH viajes_actualizados AS (
        UPDATE viajes_despacho v
        SET 
            estado_unidad = 'expirado',
            updated_at = v_now
        FROM despachos d
        WHERE 
            v.despacho_id = d.id
            AND v.estado_unidad IN ('pendiente', 'asignado')
            AND d.scheduled_date_time < v_now
            AND (v.chofer_id IS NULL OR v.camion_id IS NULL)
        RETURNING v.id
    )
    SELECT COUNT(*) INTO v_count FROM viajes_actualizados;
    
    RETURN QUERY SELECT v_count, v_revisados;
END;
$$;

-- Función wrapper para ejecución desde cron
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

-- Función para obtener métricas
CREATE OR REPLACE FUNCTION get_metricas_expiracion()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_total_expirados integer;
    v_pendientes_riesgo integer;
BEGIN
    -- Total de viajes expirados
    SELECT COUNT(*) INTO v_total_expirados
    FROM viajes_despacho
    WHERE estado_unidad = 'expirado';
    
    -- Viajes en riesgo de expiración (próximas 24 horas)
    SELECT COUNT(*) INTO v_pendientes_riesgo
    FROM viajes_despacho v
    INNER JOIN despachos d ON d.id = v.despacho_id
    WHERE 
        v.estado_unidad IN ('pendiente', 'asignado')
        AND d.scheduled_date_time BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
        AND (v.chofer_id IS NULL OR v.camion_id IS NULL);
    
    RETURN jsonb_build_object(
        'total_expirados', v_total_expirados,
        'pendientes_riesgo', v_pendientes_riesgo,
        'timestamp', NOW()
    );
END;
$$;

-- Vista para consultar viajes expirados fácilmente
DROP VIEW IF EXISTS vista_viajes_expirados;

CREATE VIEW vista_viajes_expirados AS
SELECT 
    v.id,
    v.despacho_id,
    v.estado_unidad,
    v.chofer_id,
    v.camion_id,
    d.scheduled_date_time,
    d.empresa_id,
    v.created_at,
    v.updated_at
FROM viajes_despacho v
INNER JOIN despachos d ON d.id = v.despacho_id
WHERE v.estado_unidad = 'expirado'
ORDER BY d.scheduled_date_time DESC;

-- ============================================================================
-- EJECUTAR la función para marcar viajes históricos
-- ============================================================================

DO $$
DECLARE
    v_resultado RECORD;
BEGIN
    SELECT * INTO v_resultado FROM marcar_viajes_expirados();
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ Función corregida y ejecutada';
    RAISE NOTICE 'Viajes revisados: %', v_resultado.viajes_revisados;
    RAISE NOTICE 'Viajes marcados como expirados: %', v_resultado.viajes_expirados;
    RAISE NOTICE '============================================';
END $$;

-- Verificar resultado
SELECT COUNT(*) as total_expirados
FROM viajes_despacho
WHERE estado_unidad = 'expirado';
