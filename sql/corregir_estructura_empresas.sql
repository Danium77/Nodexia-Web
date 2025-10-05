-- Script para verificar y corregir la estructura de la tabla empresas
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar estructura actual de la tabla empresas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'empresas' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar si existe la columna tipo_empresa
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'empresas' 
            AND column_name = 'tipo_empresa' 
            AND table_schema = 'public'
        ) 
        THEN 'EXISTE' 
        ELSE 'NO EXISTE' 
    END as columna_tipo_empresa;

-- 3. Agregar columnas faltantes si no existen
DO $$
BEGIN
    -- Agregar tipo_empresa si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'empresas' 
        AND column_name = 'tipo_empresa' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.empresas ADD COLUMN tipo_empresa TEXT;
        RAISE NOTICE 'Columna tipo_empresa agregada';
    END IF;
    
    -- Agregar constraint si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'empresas_tipo_empresa_check'
    ) THEN
        ALTER TABLE public.empresas 
        ADD CONSTRAINT empresas_tipo_empresa_check 
        CHECK (tipo_empresa IN ('transporte', 'coordinador'));
        RAISE NOTICE 'Constraint tipo_empresa agregado';
    END IF;
    
    -- Verificar y ajustar columna telefono
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'empresas' 
        AND column_name = 'telefono' 
        AND table_schema = 'public'
        AND data_type = 'character varying'
    ) THEN
        ALTER TABLE public.empresas ALTER COLUMN telefono TYPE TEXT;
        RAISE NOTICE 'Columna telefono convertida a TEXT';
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'empresas' 
        AND column_name = 'telefono' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.empresas ADD COLUMN telefono TEXT;
        RAISE NOTICE 'Columna telefono agregada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'empresas' 
        AND column_name = 'direccion' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.empresas ADD COLUMN direccion TEXT;
        RAISE NOTICE 'Columna direccion agregada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'empresas' 
        AND column_name = 'localidad' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.empresas ADD COLUMN localidad TEXT;
        RAISE NOTICE 'Columna localidad agregada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'empresas' 
        AND column_name = 'provincia' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.empresas ADD COLUMN provincia TEXT;
        RAISE NOTICE 'Columna provincia agregada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'empresas' 
        AND column_name = 'activa' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.empresas ADD COLUMN activa BOOLEAN DEFAULT true;
        RAISE NOTICE 'Columna activa agregada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'empresas' 
        AND column_name = 'fecha_creacion' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.empresas ADD COLUMN fecha_creacion TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Columna fecha_creacion agregada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'empresas' 
        AND column_name = 'usuario_admin' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.empresas ADD COLUMN usuario_admin UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Columna usuario_admin agregada';
    END IF;
    
END $$;

-- 4. Verificar estructura final
SELECT 'ESTRUCTURA FINAL:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'empresas' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Insertar datos demo ahora que la estructura está correcta
INSERT INTO public.empresas (nombre, cuit, tipo_empresa, email, telefono, direccion, localidad, provincia) 
VALUES 
    ('Empresa Coordinadora Demo', '20-12345678-9', 'coordinador', 'contacto@coordinadora-demo.com', '+54 11 1234-5678', 'Av. Principal 123', 'Buenos Aires', 'CABA'),
    ('Transportes Demo SA', '30-87654321-2', 'transporte', 'admin@transportes-demo.com', '+54 11 8765-4321', 'Ruta 9 Km 45', 'San Martín', 'Buenos Aires')
ON CONFLICT (cuit) DO NOTHING;

-- 6. Verificar datos insertados
SELECT 'EMPRESAS CREADAS:' as info;
SELECT id, nombre, tipo_empresa, cuit, email FROM empresas;