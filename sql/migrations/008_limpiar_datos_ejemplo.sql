-- =====================================================
-- SCRIPT DE LIMPIEZA: Eliminar datos de ejemplo
-- =====================================================
-- Descripción: Elimina los 5 registros de ejemplo que se
--              insertaron en la primera ejecución de la
--              migración 008.
-- =====================================================

-- Eliminar vinculaciones de ejemplo (si existen)
DELETE FROM public.empresa_ubicaciones 
WHERE ubicacion_id IN (
    SELECT id FROM public.ubicaciones 
    WHERE cuit IN (
        '30-12345678-9',
        '30-23456789-0',
        '30-34567890-1',
        '30-45678901-2',
        '30-56789012-3'
    )
);

-- Eliminar ubicaciones de ejemplo
DELETE FROM public.ubicaciones
WHERE cuit IN (
    '30-12345678-9',  -- Planta Central Lácteos del Sur
    '30-23456789-0',  -- Depósito Norte Logística
    '30-34567890-1',  -- Cliente Supermercados Unidos
    '30-45678901-2',  -- Planta Procesadora de Alimentos SA
    '30-56789012-3'   -- Depósito Central Distribuidora
);

-- Verificación
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.ubicaciones;
    RAISE NOTICE '✅ Limpieza completada';
    RAISE NOTICE '📊 Ubicaciones restantes en BD: %', v_count;
    
    IF v_count = 0 THEN
        RAISE NOTICE '✓ Base de datos limpia - lista para crear ubicaciones desde UI';
    ELSE
        RAISE NOTICE '⚠️ Hay % ubicaciones existentes (no son de ejemplo)', v_count;
    END IF;
END $$;
