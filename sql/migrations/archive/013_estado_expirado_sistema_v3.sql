-- ============================================================================
-- MIGRACIÓN 013: Sistema de Estado EXPIRADO para Viajes (Versión 3 - Corregida)
-- ============================================================================
-- Fecha: 09-Ene-2026
-- Descripción: Agrega estado "expirado" para viajes sin recursos asignados
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. DOCUMENTAR ESTADO EXPIRADO
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRACIÓN 013 - Sistema Estado EXPIRADO';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Estado "expirado" ahora es válido para viajes_despacho.estado';
    RAISE NOTICE '';
END;
$$;

-- ============================================================================
-- 2. CREAR FUNCIÓN PARA MARCAR VIAJES COMO EXPIRADOS
-- ============================================================================

CREATE OR REPLACE FUNCTION marcar_viajes_expirados()
RETURNS TABLE (
    viaje_id uuid,
    despacho_id uuid,
    pedido_id text,
    fecha_programada timestamptz,
    razon text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count integer := 0;
    v_now timestamptz := NOW();
BEGIN
    -- Marcar como expirados los viajes que cumplan las condiciones:
    -- 1. Estado actual es 'pendiente' o 'asignado'
    -- 2. La fecha/hora programada ya pasó
    -- 3. No tienen chofer_id o camion_id asignados
    
    RETURN QUERY
    WITH viajes_a_expirar AS (
        SELECT 
            v.id,
            v.despacho_id,
            v.estado AS estado_actual,
            d.pedido_id,
            d.scheduled_at,
            v.chofer_id,
            v.camion_id,
            CASE
                WHEN v.chofer_id IS NULL AND v.camion_id IS NULL THEN 'Sin recursos asignados'
                WHEN v.chofer_id IS NULL THEN 'Sin chofer asignado'
                WHEN v.camion_id IS NULL THEN 'Sin camión asignado'
                ELSE 'Recursos incompletos'
            END AS razon_expiracion
        FROM viajes_despacho v
        INNER JOIN despachos d ON d.id = v.despacho_id
        WHERE 
            -- Solo viajes en estados tempranos
            v.estado IN ('pendiente', 'asignado')
            -- Fecha programada ya pasó
            AND d.scheduled_at < v_now
            -- Sin recursos asignados (al menos uno falta)
            AND (v.chofer_id IS NULL OR v.camion_id IS NULL)
    ),
    viajes_actualizados AS (
        UPDATE viajes_despacho v
        SET 
            estado = 'expirado',
            updated_at = v_now
        FROM viajes_a_expirar vae
        WHERE v.id = vae.id
        RETURNING v.id, v.despacho_id
    )
    SELECT 
        va.id AS viaje_id,
        va.despacho_id,
        vae.pedido_id,
        vae.scheduled_at AS fecha_programada,
        vae.razon_expiracion AS razon
    FROM viajes_actualizados va
    JOIN viajes_a_expirar vae ON va.id = vae.id;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RAISE NOTICE '✅ Se marcaron % viaje(s) como expirados', v_count;
    
END;
$$;

COMMENT ON FUNCTION marcar_viajes_expirados() IS 
'Marca como expirados los viajes que llegaron a su fecha/hora programada sin tener chofer y camión asignados. 
Retorna la lista de viajes expirados con su información.';

-- ============================================================================
-- 3. CREAR FUNCIÓN PARA AUTO-EXPIRACIÓN (TRIGGER O CRON)
-- ============================================================================

CREATE OR REPLACE FUNCTION ejecutar_expiracion_viajes()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_resultado json;
    v_count integer;
BEGIN
    -- Ejecutar la función de expiración
    SELECT COUNT(*) INTO v_count
    FROM marcar_viajes_expirados();
    
    -- Construir respuesta
    v_resultado := json_build_object(
        'timestamp', NOW(),
        'viajes_expirados', v_count,
        'estado', 'completado'
    );
    
    RETURN v_resultado;
END;
$$;

COMMENT ON FUNCTION ejecutar_expiracion_viajes() IS 
'Ejecuta el proceso de expiración de viajes y retorna un resumen en formato JSON.
Usar desde cron jobs o llamadas programáticas.';

-- ============================================================================
-- 4. VISTA PARA INDICADORES Y REPORTES
-- ============================================================================

CREATE OR REPLACE VIEW vista_viajes_expirados AS
SELECT 
    v.id AS viaje_id,
    v.despacho_id,
    d.pedido_id,
    d.origen,
    d.destino,
    d.scheduled_at AS fecha_programada,
    v.transport_id,
    t.nombre AS transporte_nombre,
    v.chofer_id,
    COALESCE(ch.nombre || ' ' || COALESCE(ch.apellido, ''), 'Sin asignar') AS chofer_nombre,
    v.camion_id,
    cam.patente AS camion_patente,
    v.estado,
    v.fecha_creacion,
    v.updated_at AS fecha_expiracion,
    EXTRACT(EPOCH FROM (v.updated_at - d.scheduled_at))/3600 AS horas_despues_programado,
    CASE
        WHEN v.chofer_id IS NULL AND v.camion_id IS NULL THEN 'Sin recursos'
        WHEN v.chofer_id IS NULL THEN 'Sin chofer'
        WHEN v.camion_id IS NULL THEN 'Sin camión'
        ELSE 'Recursos incompletos'
    END AS razon_expiracion,
    -- Indicadores
    CASE 
        WHEN d.estado = 'Urgente' THEN TRUE 
        ELSE FALSE 
    END AS era_urgente,
    d.created_by AS coordinador_responsable
FROM viajes_despacho v
INNER JOIN despachos d ON d.id = v.despacho_id
LEFT JOIN empresas t ON t.id = v.transport_id
LEFT JOIN choferes ch ON ch.id = v.chofer_id
LEFT JOIN camiones cam ON cam.id = v.camion_id
WHERE v.estado = 'expirado'
ORDER BY v.updated_at DESC;

COMMENT ON VIEW vista_viajes_expirados IS 
'Vista para análisis de viajes expirados. Incluye información detallada para indicadores y reportes de eficiencia.';

-- ============================================================================
-- 5. FUNCIÓN PARA OBTENER MÉTRICAS DE EXPIRACIÓN
-- ============================================================================

CREATE OR REPLACE FUNCTION get_metricas_expiracion(
    fecha_desde timestamptz DEFAULT NOW() - INTERVAL '30 days',
    fecha_hasta timestamptz DEFAULT NOW()
)
RETURNS TABLE (
    total_expirados bigint,
    por_falta_chofer bigint,
    por_falta_camion bigint,
    por_falta_ambos bigint,
    urgentes_expirados bigint,
    promedio_horas_retraso numeric,
    tasa_expiracion_pct numeric
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) AS total_expirados,
        COUNT(*) FILTER (WHERE chofer_id IS NULL AND camion_id IS NOT NULL) AS por_falta_chofer,
        COUNT(*) FILTER (WHERE camion_id IS NULL AND chofer_id IS NOT NULL) AS por_falta_camion,
        COUNT(*) FILTER (WHERE chofer_id IS NULL AND camion_id IS NULL) AS por_falta_ambos,
        COUNT(*) FILTER (WHERE era_urgente) AS urgentes_expirados,
        ROUND(AVG(horas_despues_programado), 2) AS promedio_horas_retraso,
        ROUND(
            (COUNT(*)::numeric / NULLIF(
                (SELECT COUNT(*) FROM viajes_despacho 
                 WHERE fecha_creacion BETWEEN fecha_desde AND fecha_hasta), 
                0
            )) * 100, 
            2
        ) AS tasa_expiracion_pct
    FROM vista_viajes_expirados
    WHERE fecha_expiracion BETWEEN fecha_desde AND fecha_hasta;
END;
$$;

COMMENT ON FUNCTION get_metricas_expiracion IS 
'Obtiene métricas agregadas sobre viajes expirados para el período especificado.
Útil para dashboards e indicadores de eficiencia operativa.';

-- ============================================================================
-- 6. GRANTS Y PERMISOS
-- ============================================================================

GRANT EXECUTE ON FUNCTION marcar_viajes_expirados() TO authenticated;
GRANT EXECUTE ON FUNCTION ejecutar_expiracion_viajes() TO authenticated;
GRANT EXECUTE ON FUNCTION get_metricas_expiracion TO authenticated;
GRANT SELECT ON vista_viajes_expirados TO authenticated;

-- ============================================================================
-- 7. ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índice compuesto para búsqueda eficiente de viajes a expirar
CREATE INDEX IF NOT EXISTS idx_viajes_expiracion 
ON viajes_despacho (estado, chofer_id, camion_id) 
WHERE estado IN ('pendiente', 'asignado');

-- Índice en despachos para join eficiente
CREATE INDEX IF NOT EXISTS idx_despachos_scheduled 
ON despachos (scheduled_at) 
WHERE scheduled_at IS NOT NULL;

-- ============================================================================
-- 8. EJECUTAR PRIMERA VEZ Y VALIDACIÓN
-- ============================================================================

DO $$
DECLARE
    v_count_expirados integer;
    v_resultado record;
BEGIN
    -- Ejecutar una vez para marcar viajes existentes que ya expiraron
    SELECT COUNT(*) INTO v_count_expirados
    FROM marcar_viajes_expirados();
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '  MIGRACIÓN 013 COMPLETADA';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Función marcar_viajes_expirados() creada';
    RAISE NOTICE '✅ Función ejecutar_expiracion_viajes() creada';
    RAISE NOTICE '✅ Vista vista_viajes_expirados creada';
    RAISE NOTICE '✅ Función get_metricas_expiracion() creada';
    RAISE NOTICE '✅ Índices de performance creados';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Viajes marcados como expirados: %', v_count_expirados;
    RAISE NOTICE '';
    
    IF v_count_expirados > 0 THEN
        -- Mostrar algunos ejemplos
        RAISE NOTICE '📋 Ejemplos de viajes expirados:';
        FOR v_resultado IN 
            SELECT pedido_id, razon_expiracion 
            FROM vista_viajes_expirados 
            LIMIT 3
        LOOP
            RAISE NOTICE '   - %: %', v_resultado.pedido_id, v_resultado.razon_expiracion;
        END LOOP;
        RAISE NOTICE '';
    END IF;
    
    RAISE NOTICE 'PRÓXIMOS PASOS:';
    RAISE NOTICE '1. Configurar cron job para ejecutar ejecutar_expiracion_viajes()';
    RAISE NOTICE '   SELECT * FROM ejecutar_expiracion_viajes();';
    RAISE NOTICE '';
    RAISE NOTICE '2. Ver métricas:';
    RAISE NOTICE '   SELECT * FROM get_metricas_expiracion();';
    RAISE NOTICE '';
    RAISE NOTICE '3. Ver viajes expirados:';
    RAISE NOTICE '   SELECT * FROM vista_viajes_expirados LIMIT 10;';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END;
$$;

COMMIT;
