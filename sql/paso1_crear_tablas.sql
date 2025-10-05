-- PASO 1: Crear solo las tablas básicas sin INSERT
-- Ejecutar este primero

-- 1. Tabla de planes de suscripción
CREATE TABLE IF NOT EXISTS public.planes_suscripcion (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    precio_mensual DECIMAL(10,2),
    caracteristicas JSONB DEFAULT '{}',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Tipos de empresa en el ecosistema Nodexia
CREATE TABLE IF NOT EXISTS public.tipos_empresa_ecosistema (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    permisos_base JSONB DEFAULT '{}',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Roles específicos dentro de cada empresa
CREATE TABLE IF NOT EXISTS public.roles_empresa (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    permisos JSONB DEFAULT '{}',
    tipo_ecosistema_id UUID REFERENCES public.tipos_empresa_ecosistema(id),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(nombre, tipo_ecosistema_id)
);