-- ============================================================================
-- SCRIPT: Verificar e Instalar Sistema de Viajes Expirados en DEV
-- ============================================================================
-- Fecha: 27-Enero-2026
-- Propósito: Verificar si el sistema de expiración está instalado en DEV
--            y aplicar migración si falta
-- ============================================================================

-- ============================================================================
-- PASO 1: VERIFICAR ESTADO ACTUAL
-- ============================================================================

DO $$
DECLARE
    v_tiene_estado_expirado boolean;
    v_tiene_funcion_marcar boolean;
    v_tiene_funcion_ejecutar boolean;
    v_tiene_vista boolean;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'VERIFICANDO SISTEMA DE VIAJES EXPIRADOS';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    
    -- Verificar estado 'expirado' en enum
    SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'estado_unidad_viaje'::regtype 
        AND enumlabel = 'expirado'
    ) INTO v_tiene_estado_expirado;
    
    IF v_tiene_estado_expirado THEN
        RAISE NOTICE '✅ Estado "expirado" existe en estado_unidad_viaje';
    ELSE
        RAISE NOTICE '❌ Estado "expirado" NO EXISTE en estado_unidad_viaje';
    END IF;
    
    -- Verificar función marcar_viajes_expirados
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'marcar_viajes_expirados'
    ) INTO v_tiene_funcion_marcar;
    
    IF v_tiene_funcion_marcar THEN
        RAISE NOTICE '✅ Función marcar_viajes_expirados() existe';
    ELSE
        RAISE NOTICE '❌ Función marcar_viajes_expirados() NO EXISTE';
    END IF;
    
    -- Verificar función ejecutar_expiracion_viajes
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'ejecutar_expiracion_viajes'
    ) INTO v_tiene_funcion_ejecutar;
    
    IF v_tiene_funcion_ejecutar THEN
        RAISE NOTICE '✅ Función ejecutar_expiracion_viajes() existe';
    ELSE
        RAISE NOTICE '❌ Función ejecutar_expiracion_viajes() NO EXISTE';
    END IF;
    
    -- Verificar vista vista_viajes_expirados
    SELECT EXISTS (
        SELECT 1 FROM pg_views 
        WHERE viewname = 'vista_viajes_expirados'
    ) INTO v_tiene_vista;
    
    IF v_tiene_vista THEN
        RAISE NOTICE '✅ Vista vista_viajes_expirados existe';
    ELSE
        RAISE NOTICE '❌ Vista vista_viajes_expirados NO EXISTE';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    
    -- Resumen
    IF v_tiene_estado_expirado AND v_tiene_funcion_marcar AND 
       v_tiene_funcion_ejecutar AND v_tiene_vista THEN
        RAISE NOTICE '✅ SISTEMA COMPLETO - Todo instalado correctamente';
        RAISE NOTICE '';
        RAISE NOTICE 'Puedes ejecutar manualmente:';
        RAISE NOTICE '  SELECT * FROM ejecutar_expiracion_viajes();';
    ELSE
        RAISE NOTICE '❌ SISTEMA INCOMPLETO - Faltan componentes';
        RAISE NOTICE '';
        RAISE NOTICE 'SOLUCIÓN:';
        RAISE NOTICE '1. Abre Supabase Dashboard → SQL Editor';
        RAISE NOTICE '2. Ejecuta el contenido de:';
        RAISE NOTICE '   sql/migrations/013_estado_expirado_sistema.sql';
    END IF;
    
    RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- PASO 2: CONSULTAR VIAJES QUE DEBERÍAN ESTAR EXPIRADOS
-- ============================================================================

-- VIAJES QUE DEBERÍAN ESTAR EXPIRADOS (si el sistema estuviera activo):

SELECT 
    v.id AS viaje_id,
    d.pedido_id,
    v.estado AS estado_actual,
    d.scheduled_date_time AS fecha_programada,
    NOW() - d.scheduled_date_time AS tiempo_transcurrido,
    CASE
        WHEN v.chofer_id IS NULL AND v.camion_id IS NULL THEN 'Sin chofer ni camión'
        WHEN v.chofer_id IS NULL THEN 'Sin chofer'
        WHEN v.camion_id IS NULL THEN 'Sin camión'
    END AS razon,
    v.chofer_id IS NULL AS falta_chofer,
    v.camion_id IS NULL AS falta_camion
FROM viajes_despacho v
INNER JOIN despachos d ON d.id = v.despacho_id
WHERE 
    v.estado IN ('pendiente', 'asignado')
    AND d.scheduled_date_time < NOW()
    AND (v.chofer_id IS NULL OR v.camion_id IS NULL)
ORDER BY d.scheduled_date_time DESC
LIMIT 10;

-- ============================================================================
-- PASO 3: SI QUIERES INSTALAR, DESCOMENTA Y EJECUTA ESTO:
-- ============================================================================

/*
-- DESCOMENTAR ESTAS LÍNEAS PARA INSTALAR EL SISTEMA

-- Copiar y pegar el contenido completo de:
-- sql/migrations/013_estado_expirado_sistema.sql

-- O ejecutar directamente ese archivo
*/
