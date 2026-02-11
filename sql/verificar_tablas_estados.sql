-- Verificar si existen las tablas del sistema dual de estados

-- 1. Verificar tabla estado_unidad_viaje
SELECT 
    'estado_unidad_viaje' as tabla,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'estado_unidad_viaje'
    ) as existe,
    (
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_name = 'estado_unidad_viaje'
    ) as columnas;

-- 2. Verificar tabla estado_carga_viaje
SELECT 
    'estado_carga_viaje' as tabla,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'estado_carga_viaje'
    ) as existe,
    (
        SELECT COUNT(*)
        FROM information_schema.columns 
        WHERE table_name = 'estado_carga_viaje'
    ) as columnas;

-- 3. Verificar vista vista_estado_viaje_completo
SELECT 
    'vista_estado_viaje_completo' as vista,
    EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'vista_estado_viaje_completo'
    ) as existe;

-- 4. Si existe estado_carga_viaje, verificar columna peso_real_kg
SELECT 
    column_name, data_type
FROM information_schema.columns
WHERE table_name = 'estado_carga_viaje'
AND column_name = 'peso_real_kg';

-- 5. Ver todos los registros en estado_unidad_viaje (si existe)
SELECT COUNT(*) as registros_estado_unidad
FROM estado_unidad_viaje;

-- 6. Ver todos los registros en estado_carga_viaje (si existe)
SELECT COUNT(*) as registros_estado_carga
FROM estado_carga_viaje;
