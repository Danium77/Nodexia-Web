-- =====================================================
-- FIX: Agregar columna fecha_creacion si no existe
-- Fecha: 20 de Enero 2026
-- =====================================================

-- Verificar columnas actuales
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'estado_carga_viaje'
ORDER BY ordinal_position;

-- Agregar columna fecha_creacion si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'estado_carga_viaje' 
        AND column_name = 'fecha_creacion'
    ) THEN
        ALTER TABLE estado_carga_viaje 
        ADD COLUMN fecha_creacion TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Columna fecha_creacion agregada';
    ELSE
        RAISE NOTICE 'Columna fecha_creacion ya existe';
    END IF;
END $$;

-- Verificar resultado
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'estado_carga_viaje'
AND column_name IN ('fecha_creacion', 'created_at', 'estado_carga', 'viaje_id')
ORDER BY ordinal_position;
