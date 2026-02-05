-- ================================================================
-- MIGRACIÓN BD - ROLLBACK FASE 1: ELIMINAR VIEWS
-- ================================================================
-- Fecha: 05-FEB-2026
-- Objetivo: Script de emergencia para eliminar views de compatibilidad
-- Usar solo si hay problemas con las views creadas en Fase 1
-- ================================================================

-- 1. ELIMINAR VIEWS DE COMPATIBILIDAD
-- ================================================================

-- Eliminar view de viajes con nomenclatura legacy
DROP VIEW IF EXISTS viajes_despacho_legacy;

-- Eliminar view de tracking GPS legacy
DROP VIEW IF EXISTS tracking_gps_legacy;

-- ================================================================
-- 2. VERIFICAR LIMPIEZA
-- ================================================================

-- Verificar que las views fueron eliminadas
SELECT 
    table_name as view_name,
    'VIEW RESIDUAL - REVISAR' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'VIEW' 
AND table_name IN ('tracking_gps_legacy', 'viajes_despacho_legacy');

-- Si el query anterior no devuelve filas = limpieza exitosa

-- ================================================================
-- 3. VERIFICAR TABLAS ORIGINALES INTACTAS
-- ================================================================

-- Confirmar que tablas originales no fueron afectadas
SELECT 
    'viajes_despacho' as tabla,
    COUNT(*) as total_registros,
    'TABLA ORIGINAL' as status
FROM viajes_despacho

UNION ALL

SELECT 
    'ubicaciones_choferes' as tabla,
    COUNT(*) as total_registros,
    'TABLA ORIGINAL' as status
FROM ubicaciones_choferes;

-- ================================================================
-- NOTAS:
-- ================================================================
-- 1. Este rollback solo elimina views, NO afecta datos
-- 2. Ejecutar si las views causan problemas de performance
-- 3. Después del rollback, el código con nomenclatura vieja NO funcionará
-- 4. Solo usar en emergencia - preferir completar migración
-- ================================================================