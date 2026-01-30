-- ============================================================================
-- CORRECCIÓN: Marcar viajes expirados incluyendo estado_unidad NULL
-- ============================================================================
-- Problema: Los viajes tienen estado_unidad = NULL, la función solo buscaba 'pendiente' y 'asignado'
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
    -- Contar viajes que cumplan condiciones (incluyendo NULL)
    SELECT COUNT(*) INTO v_revisados
    FROM viajes_despacho v
    INNER JOIN despachos d ON d.id = v.despacho_id
    WHERE 
        (v.estado_unidad IN ('pendiente', 'asignado') OR v.estado_unidad IS NULL)
        AND (d.scheduled_local_date + d.scheduled_local_time) < v_now
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
            AND (v.estado_unidad IN ('pendiente', 'asignado') OR v.estado_unidad IS NULL)
            AND (d.scheduled_local_date + d.scheduled_local_time) < v_now
            AND (v.chofer_id IS NULL OR v.camion_id IS NULL)
        RETURNING v.id
    )
    SELECT COUNT(*) INTO v_count FROM viajes_actualizados;
    
    RETURN QUERY SELECT v_count, v_revisados;
END;
$$;

-- Ejecutar la función
DO $$
DECLARE
    v_resultado RECORD;
BEGIN
    SELECT * INTO v_resultado FROM marcar_viajes_expirados();
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ Viajes revisados: %', v_resultado.viajes_revisados;
    RAISE NOTICE '✅ Viajes marcados como expirados: %', v_resultado.viajes_expirados;
    RAISE NOTICE '============================================';
END $$;

-- Verificar resultado
SELECT 
    v.id,
    v.estado_unidad,
    d.scheduled_local_date,
    d.scheduled_local_time
FROM viajes_despacho v
JOIN despachos d ON d.id = v.despacho_id
WHERE v.estado_unidad = 'expirado'
ORDER BY d.scheduled_local_date, d.scheduled_local_time;
