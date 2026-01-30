-- ============================================================================
-- REPARACIÓN INCREMENTAL DEV: Aplicar solo funcionalidades faltantes
-- ============================================================================
-- Fecha: 28-Enero-2026
-- Propósito: Agregar funcionalidades de producción SIN tocar seguridad RLS
-- ============================================================================

-- ⚠️ IMPORTANTE: Este script NO modifica políticas RLS existentes
-- Solo agrega tablas/columnas/funciones faltantes

BEGIN;

-- ============================================================================
-- PARTE 1: VERIFICAR Y CREAR COLUMNA scheduled_date_time
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
            RAISE NOTICE '✅ Columna scheduled_at renombrada a scheduled_date_time';
        ELSE
            ALTER TABLE despachos ADD COLUMN scheduled_date_time timestamptz;
            RAISE NOTICE '✅ Columna scheduled_date_time creada';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  Columna scheduled_date_time ya existe';
    END IF;
END $$;

-- ============================================================================
-- PARTE 2: VERIFICAR Y CREAR ENUM estado_unidad_viaje CON EXPIRADO
-- ============================================================================

DO $$
BEGIN
    -- Verificar si el enum existe
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_unidad_viaje') THEN
        -- Crear el enum desde cero
        CREATE TYPE estado_unidad_viaje AS ENUM (
            'pendiente',
            'asignado',
            'confirmado',
            'en_camino',
            'en_planta',
            'cargando',
            'en_ruta',
            'descargando',
            'completado',
            'cancelado',
            'expirado'
        );
        RAISE NOTICE '✅ Enum estado_unidad_viaje creado';
        
        -- Convertir columna existente al enum si existe
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'viajes_despacho' AND column_name = 'estado'
        ) THEN
            ALTER TABLE viajes_despacho 
            ALTER COLUMN estado TYPE estado_unidad_viaje 
            USING estado::text::estado_unidad_viaje;
            RAISE NOTICE '✅ Columna viajes_despacho.estado convertida a enum';
        END IF;
    ELSE
        -- El enum existe, agregar 'expirado' si falta
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = 'estado_unidad_viaje'::regtype 
            AND enumlabel = 'expirado'
        ) THEN
            ALTER TYPE estado_unidad_viaje ADD VALUE 'expirado';
            RAISE NOTICE '✅ Estado "expirado" agregado';
        ELSE
            RAISE NOTICE '⚠️  Estado "expirado" ya existe';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- PARTE 3: CREAR FUNCIONES DEL SISTEMA DE EXPIRACIÓN
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
            estado = 'expirado'::estado_unidad_viaje,
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
-- PARTE 4: CREAR VISTA DE VIAJES EXPIRADOS
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
-- PARTE 5: EJECUTAR MARCADO DE VIAJES EXPIRADOS (PRIMERA VEZ)
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
-- VERIFICACIÓN FINAL
-- ============================================================================

SELECT 
    '✅ FUNCIONALIDADES AGREGADAS EXITOSAMENTE' AS estado,
    (SELECT COUNT(*) FROM viajes_despacho WHERE estado = 'expirado') AS viajes_marcados_expirados,
    (SELECT COUNT(*) FROM pg_proc WHERE proname LIKE '%expir%') AS funciones_instaladas,
    (SELECT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'vista_viajes_expirados')) AS vista_creada;

-- ============================================================================
-- NOTA: Este script NO modifica:
-- - Políticas RLS existentes
-- - Constraints de seguridad
-- - Roles y permisos
-- 
-- Solo agrega funcionalidad de expiración de viajes
-- ============================================================================
