-- ============================================================================
-- CORRECCIÓN: Actualizar get_metricas_expiracion para formato correcto
-- ============================================================================

-- Eliminar la función anterior
DROP FUNCTION IF EXISTS get_metricas_expiracion();

-- Crear nueva función que devuelve TABLE (formato array para el frontend)
CREATE OR REPLACE FUNCTION get_metricas_expiracion()
RETURNS TABLE(
    total_expirados bigint,
    pendientes_riesgo bigint
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM viajes_despacho WHERE estado_unidad = 'expirado') as total_expirados,
        (SELECT COUNT(*) 
         FROM viajes_despacho v
         INNER JOIN despachos d ON d.id = v.despacho_id
         WHERE v.estado_unidad IN ('pendiente', 'asignado')
           AND (d.scheduled_local_date + d.scheduled_local_time) BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
           AND (v.chofer_id IS NULL OR v.camion_id IS NULL)
        ) as pendientes_riesgo;
END;
$$;

-- Probar la función
SELECT * FROM get_metricas_expiracion();
