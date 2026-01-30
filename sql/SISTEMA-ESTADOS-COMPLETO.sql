-- ============================================================================
-- SISTEMA DE ESTADOS COMPLETO: expirado + fuera_de_horario
-- ============================================================================
-- Estados de viajes según recursos asignados:
-- 1. "expirado" → NO tiene chofer/camión Y pasó la hora
-- 2. "fuera_de_horario" → TIENE recursos pero pasó la hora sin iniciar carga
-- 3. "demorado" → Se registra incidencia (manual por chofer/transporte)
-- 4. "en_curso" → Ya inició carga (proceso existente con supervisor)
-- ============================================================================

-- Función principal: Marca viajes según disponibilidad de recursos
CREATE OR REPLACE FUNCTION actualizar_estados_viajes()
RETURNS TABLE (
    viajes_expirados integer,
    viajes_fuera_horario integer,
    viajes_revisados integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expirados integer := 0;
    v_fuera_horario integer := 0;
    v_revisados integer := 0;
    v_now timestamptz := NOW();
BEGIN
    -- Contar viajes que cumplan condiciones para revisar
    SELECT COUNT(*) INTO v_revisados
    FROM viajes_despacho v
    INNER JOIN despachos d ON d.id = v.despacho_id
    WHERE 
        (v.estado_unidad IN ('pendiente', 'asignado') OR v.estado_unidad IS NULL)
        AND (d.scheduled_local_date || ' ' || d.scheduled_local_time)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires' < v_now;
    
    -- 1. Marcar como EXPIRADO: NO tiene chofer NI camión Y pasó la hora
    WITH viajes_expirados_actualizados AS (
        UPDATE viajes_despacho v
        SET 
            estado_unidad = 'expirado',
            updated_at = v_now
        FROM despachos d
        WHERE 
            v.despacho_id = d.id
            AND (v.estado_unidad IN ('pendiente', 'asignado') OR v.estado_unidad IS NULL)
            AND (d.scheduled_local_date || ' ' || d.scheduled_local_time)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires' < v_now
            AND (v.chofer_id IS NULL OR v.camion_id IS NULL)
        RETURNING v.id
    )
    SELECT COUNT(*) INTO v_expirados FROM viajes_expirados_actualizados;
    
    -- 2. Marcar como FUERA_DE_HORARIO: TIENE chofer Y camión pero pasó la hora sin iniciar carga
    WITH viajes_fuera_horario_actualizados AS (
        UPDATE viajes_despacho v
        SET 
            estado_unidad = 'fuera_de_horario',
            updated_at = v_now
        FROM despachos d
        WHERE 
            v.despacho_id = d.id
            AND (v.estado_unidad IN ('pendiente', 'asignado') OR v.estado_unidad IS NULL)
            AND (d.scheduled_local_date || ' ' || d.scheduled_local_time)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires' < v_now
            AND v.chofer_id IS NOT NULL 
            AND v.camion_id IS NOT NULL
            AND v.estado_unidad != 'expirado' -- No cambiar si ya está expirado
        RETURNING v.id
    )
    SELECT COUNT(*) INTO v_fuera_horario FROM viajes_fuera_horario_actualizados;
    
    RETURN QUERY SELECT v_expirados, v_fuera_horario, v_revisados;
END;
$$;

-- Wrapper para ejecución desde cron
CREATE OR REPLACE FUNCTION ejecutar_actualizacion_estados()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result RECORD;
BEGIN
    SELECT * INTO v_result FROM actualizar_estados_viajes();
    
    RETURN jsonb_build_object(
        'success', true,
        'viajes_expirados', v_result.viajes_expirados,
        'viajes_fuera_horario', v_result.viajes_fuera_horario,
        'viajes_revisados', v_result.viajes_revisados,
        'timestamp', NOW()
    );
END;
$$;

-- Actualizar función de métricas para incluir fuera_de_horario
CREATE OR REPLACE FUNCTION get_metricas_expiracion()
RETURNS TABLE(
    total_expirados bigint,
    total_fuera_horario bigint,
    pendientes_riesgo bigint
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM viajes_despacho WHERE estado_unidad = 'expirado') as total_expirados,
        (SELECT COUNT(*) FROM viajes_despacho WHERE estado_unidad = 'fuera_de_horario') as total_fuera_horario,
        (SELECT COUNT(*) 
         FROM viajes_despacho v
         INNER JOIN despachos d ON d.id = v.despacho_id
         WHERE v.estado_unidad IN ('pendiente', 'asignado')
           AND (d.scheduled_local_date + d.scheduled_local_time) BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
           AND (v.chofer_id IS NULL OR v.camion_id IS NULL)
        ) as pendientes_riesgo;
END;
$$;

-- ============================================================================
-- EJECUTAR actualización de estados
-- ============================================================================

DO $$
DECLARE
    v_resultado RECORD;
BEGIN
    SELECT * INTO v_resultado FROM actualizar_estados_viajes();
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ Estados actualizados correctamente';
    RAISE NOTICE 'Viajes revisados: %', v_resultado.viajes_revisados;
    RAISE NOTICE 'Viajes EXPIRADOS (sin recursos): %', v_resultado.viajes_expirados;
    RAISE NOTICE 'Viajes FUERA DE HORARIO (con recursos): %', v_resultado.viajes_fuera_horario;
    RAISE NOTICE '============================================';
END $$;

-- Verificar resultados
SELECT 
    estado_unidad,
    COUNT(*) as cantidad,
    STRING_AGG(DISTINCT d.pedido_id, ', ') as pedidos
FROM viajes_despacho v
JOIN despachos d ON d.id = v.despacho_id
WHERE estado_unidad IN ('expirado', 'fuera_de_horario')
GROUP BY estado_unidad;
