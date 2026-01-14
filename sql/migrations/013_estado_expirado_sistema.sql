-- ============================================================================
-- MIGRACIÓN 013: Sistema de Estado EXPIRADO para Viajes
-- ============================================================================
-- Fecha: 09-Ene-2026
-- Descripción: Agrega estado "expirado" y función automática para marcar viajes
--              que llegaron a su fecha/hora programada sin recursos asignados
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. AGREGAR ESTADO EXPIRADO A LOS TIPOS
-- ============================================================================

-- Verificar y agregar 'expirado' a EstadoUnidadViaje si no existe
DO $$
BEGIN
    -- Verificar si el tipo ya tiene el valor
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'estado_unidad_viaje'::regtype 
        AND enumlabel = 'expirado'
    ) THEN
        ALTER TYPE estado_unidad_viaje ADD VALUE 'expirado';
        RAISE NOTICE '✅ Estado "expirado" agregado a estado_unidad_viaje';
    ELSE
        RAISE NOTICE '⚠️  Estado "expirado" ya existe en estado_unidad_viaje';
    END IF;
END
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
    -- 1. Estado actual es 'pendiente' o 'asignado' (no tiene chofer/camión confirmados)
    -- 2. La fecha/hora programada ya pasó
    -- 3. No tienen chofer_id o camion_id asignados
    
    WITH viajes_a_expirar AS (
        SELECT 
            v.id,
            v.despacho_id,
            v.estado AS estado_actual,
            d.pedido_id,
            d.scheduled_date_time,
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
            AND d.scheduled_date_time < v_now
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
        RETURNING v.id, v.despacho_id, vae.pedido_id, vae.scheduled_date_time, vae.razon_expiracion
    )
    SELECT * INTO 
        viaje_id, 
        despacho_id,
        pedido_id,
        fecha_programada,
        razon
    FROM viajes_actualizados;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RAISE NOTICE '✅ Se marcaron % viaje(s) como expirados', v_count;
    
    RETURN QUERY
    SELECT 
        va.id,
        va.despacho_id,
        vae.pedido_id,
        vae.scheduled_date_time,
        vae.razon_expiracion
    FROM viajes_actualizados va
    JOIN viajes_a_expirar vae ON va.id = vae.id;
    
END;
$$;

COMMENT ON FUNCTION marcar_viajes_expirados() IS 
'Marca como expirados los viajes que llegaron a su fecha/hora programada sin tener chofer y camión asignados. 
Retorna la lista de viajes expirados con su información.';

-- ============================================================================
-- 3. CREAR FUNCIÓN PARA AUTO-EXPIRACIÓN (TRIGGER O CRON)
-- ============================================================================

-- Función simple para ejecutar desde un scheduler o manualmente
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
    d.scheduled_date_time AS fecha_programada,
    v.transport_id,
    t.nombre AS transporte_nombre,
    v.chofer_id,
    ch.nombre || ' ' || COALESCE(ch.apellido, '') AS chofer_nombre,
    v.camion_id,
    cam.patente AS camion_patente,
    v.estado,
    v.fecha_creacion,
    v.updated_at AS fecha_expiracion,
    EXTRACT(EPOCH FROM (v.updated_at - d.scheduled_date_time))/3600 AS horas_despues_programado,
    CASE
        WHEN v.chofer_id IS NULL AND v.camion_id IS NULL THEN 'Sin recursos'
        WHEN v.chofer_id IS NULL THEN 'Sin chofer'
        WHEN v.camion_id IS NULL THEN 'Sin camión'
        ELSE 'Recursos incompletos'
    END AS razon_expiracion,
    -- Indicadores
    CASE 
        WHEN d.prioridad = 'Urgente' THEN TRUE 
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

-- Permitir que coordinadores ejecuten la función de expiración
GRANT EXECUTE ON FUNCTION marcar_viajes_expirados() TO authenticated;
GRANT EXECUTE ON FUNCTION ejecutar_expiracion_viajes() TO authenticated;
GRANT EXECUTE ON FUNCTION get_metricas_expiracion TO authenticated;

-- Permitir acceso a la vista
GRANT SELECT ON vista_viajes_expirados TO authenticated;

-- ============================================================================
-- 7. DOCUMENTACIÓN Y VALIDACIÓN
-- ============================================================================

DO $$
DECLARE
    v_count_expirados integer;
BEGIN
    -- Ejecutar una vez para marcar viajes existentes que ya expiraron
    SELECT COUNT(*) INTO v_count_expirados
    FROM marcar_viajes_expirados();
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '  MIGRACIÓN 013 COMPLETADA';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Estado "expirado" agregado';
    RAISE NOTICE '✅ Función marcar_viajes_expirados() creada';
    RAISE NOTICE '✅ Función ejecutar_expiracion_viajes() creada';
    RAISE NOTICE '✅ Vista vista_viajes_expirados creada';
    RAISE NOTICE '✅ Función get_metricas_expiracion() creada';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Viajes marcados como expirados en esta ejecución: %', v_count_expirados;
    RAISE NOTICE '';
    RAISE NOTICE 'PRÓXIMOS PASOS:';
    RAISE NOTICE '1. Configurar cron job para ejecutar ejecutar_expiracion_viajes()';
    RAISE NOTICE '   Ejemplo: SELECT * FROM ejecutar_expiracion_viajes(); -- Cada 15 min';
    RAISE NOTICE '';
    RAISE NOTICE '2. Actualizar frontend para filtrar viajes expirados en TrackingView';
    RAISE NOTICE '';
    RAISE NOTICE '3. Agregar indicador de viajes expirados en dashboard';
    RAISE NOTICE '   Consulta: SELECT * FROM get_metricas_expiracion();';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END;
$$;

COMMIT;
