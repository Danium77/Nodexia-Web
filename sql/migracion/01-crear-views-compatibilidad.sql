-- ================================================================
-- MIGRACIÓN BD - FASE 1: VIEWS DE COMPATIBILIDAD
-- ================================================================
-- Fecha: 05-FEB-2026
-- Objetivo: Crear aliases temporales para mantener compatibilidad
-- durante migración de nomenclatura inconsistente
-- ================================================================

-- 1. VERIFICAR ESTRUCTURA DE TABLAS ACTUALES
-- ================================================================

-- Verificar estructura de ubicaciones_choferes (tabla principal)
SELECT 'ubicaciones_choferes' as tabla, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'ubicaciones_choferes' 
ORDER BY ordinal_position;

-- Verificar si tracking_gps existe y su estructura
SELECT 'tracking_gps' as tabla, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tracking_gps' 
ORDER BY ordinal_position;

-- Verificar conteo de datos en ambas tablas
SELECT 
    'tracking_gps' as tabla,
    COUNT(*) as total_registros,
    MIN(created_at) as fecha_mas_antigua,
    MAX(created_at) as fecha_mas_reciente
FROM tracking_gps
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracking_gps')

UNION ALL

SELECT 
    'ubicaciones_choferes' as tabla,
    COUNT(*) as total_registros,
    MIN(created_at) as fecha_mas_antigua,
    MAX(created_at) as fecha_mas_reciente
FROM ubicaciones_choferes;

-- ================================================================
-- 2. CREAR VIEWS DE COMPATIBILIDAD
-- ================================================================

-- View para compatibilidad con código que busca tracking_gps
-- Solo crear si la tabla tracking_gps existe
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracking_gps') THEN
        -- Si tracking_gps existe, crear view que mapee a ubicaciones_choferes
        -- para el código que busque en la tabla nueva
        EXECUTE 'CREATE OR REPLACE VIEW tracking_gps_legacy AS 
        SELECT 
            id,
            chofer_id,
            latitud,
            longitud,
            timestamp as fecha_hora,
            timestamp,
            created_at,
            updated_at
        FROM ubicaciones_choferes';
        
        RAISE NOTICE 'View tracking_gps_legacy creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla tracking_gps no existe - view no necesaria';
    END IF;
END $$;

-- ================================================================
-- 3. VIEWS PARA COMPATIBILIDAD DE NOMENCLATURA  
-- ================================================================

-- View para viajes con alias de compatibilidad (id_chofer -> chofer_id)
CREATE OR REPLACE VIEW viajes_despacho_legacy AS
SELECT 
    id,
    numero_viaje,
    despacho_id,
    chofer_id,
    chofer_id as id_chofer,  -- Alias para código viejo
    camion_id,
    camion_id as id_camion,  -- Alias para código viejo
    acoplado_id,
    acoplado_id as id_acoplado,  -- Alias para código viejo
    estado,
    origen,
    destino,
    carga_tipo,
    peso_estimado,
    observaciones,
    fecha_estimada_entrega,
    created_at,
    updated_at,
    estado_carga,
    ubicacion_actual,
    distancia_restante,
    tiempo_estimado_llegada,
    id_transporte
FROM viajes_despacho;

-- ================================================================
-- 4. VERIFICAR VIEWS CREADAS
-- ================================================================

-- Listar todas las views creadas por este script
SELECT 
    table_name as view_name,
    'VIEW' as type,
    'Migración BD - Compatibilidad' as proposito
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'VIEW' 
AND table_name IN ('tracking_gps_legacy', 'viajes_despacho_legacy');

-- ================================================================
-- 5. TESTING BÁSICO
-- ================================================================

-- Test: Verificar que view funciona con datos reales
SELECT 
    'viajes_despacho_legacy' as test,
    COUNT(*) as total_registros,
    COUNT(id_chofer) as con_chofer,
    COUNT(id_camion) as con_camion,
    COUNT(id_acoplado) as con_acoplado
FROM viajes_despacho_legacy
WHERE estado NOT IN ('cancelado', 'expirado')
LIMIT 5;

-- Test: Verificar tracking_gps_legacy si existe
SELECT 
    'tracking_gps_legacy' as test,
    COUNT(*) as total_registros,
    COUNT(DISTINCT chofer_id) as choferes_unicos
FROM tracking_gps_legacy
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'tracking_gps_legacy'
)
LIMIT 5;

-- ================================================================
-- NOTAS IMPORTANTES:
-- ================================================================
-- 1. Estas views son TEMPORALES para migración
-- 2. NO modificar datos a través de estas views  
-- 3. Eliminar después de completar Fase 2 (actualización de código)
-- 4. Si hay errores, ejecutar 01-rollback-views.sql
-- ================================================================