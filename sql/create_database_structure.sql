-- =============================================
-- Script de Verificación y Creación de Estructura
-- Ejecutar ANTES del script principal
-- =============================================

-- 1. Verificar y crear tabla empresas con estructura completa
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    cuit TEXT UNIQUE NOT NULL,
    tipo_empresa TEXT NOT NULL CHECK (tipo_empresa IN ('coordinador', 'transporte')),
    email TEXT,
    telefono TEXT,
    direccion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Verificar y crear tabla usuarios
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    nombre_completo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Verificar y crear tabla usuarios_empresa
CREATE TABLE IF NOT EXISTS public.usuarios_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    rol_interno TEXT NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, empresa_id)
);

-- 4. Verificar y crear tabla relaciones_empresa
CREATE TABLE IF NOT EXISTS public.relaciones_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_coordinadora_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    empresa_transporte_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'suspendida', 'finalizada')),
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin DATE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(empresa_coordinadora_id, empresa_transporte_id)
);

-- 5. Agregar columnas faltantes si la tabla empresas ya existía
DO $$
BEGIN
    -- Agregar columna activo si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'empresas' 
                   AND column_name = 'activo') THEN
        ALTER TABLE public.empresas ADD COLUMN activo BOOLEAN DEFAULT true;
        RAISE NOTICE 'Columna activo agregada a tabla empresas';
    END IF;
    
    -- Agregar otras columnas si no existen
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'empresas' 
                   AND column_name = 'telefono') THEN
        ALTER TABLE public.empresas ADD COLUMN telefono TEXT;
        RAISE NOTICE 'Columna telefono agregada a tabla empresas';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'empresas' 
                   AND column_name = 'direccion') THEN
        ALTER TABLE public.empresas ADD COLUMN direccion TEXT;
        RAISE NOTICE 'Columna direccion agregada a tabla empresas';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'empresas' 
                   AND column_name = 'email') THEN
        ALTER TABLE public.empresas ADD COLUMN email TEXT;
        RAISE NOTICE 'Columna email agregada a tabla empresas';
    END IF;
END $$;

-- 6. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_empresas_tipo ON public.empresas(tipo_empresa);
CREATE INDEX IF NOT EXISTS idx_empresas_activo ON public.empresas(activo);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_user_id ON public.usuarios_empresa(user_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_empresa_id ON public.usuarios_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_relaciones_coordinadora ON public.relaciones_empresa(empresa_coordinadora_id);
CREATE INDEX IF NOT EXISTS idx_relaciones_transporte ON public.relaciones_empresa(empresa_transporte_id);

-- 7. Habilitar RLS (Row Level Security) para las tablas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relaciones_empresa ENABLE ROW LEVEL SECURITY;

-- 8. Crear políticas básicas de RLS (se pueden refinar después)
-- Política para empresas: los usuarios pueden ver solo su empresa y relacionadas
DROP POLICY IF EXISTS "usuarios_pueden_ver_sus_empresas" ON public.empresas;
CREATE POLICY "usuarios_pueden_ver_sus_empresas" ON public.empresas
    FOR SELECT
    USING (
        id IN (
            SELECT ue.empresa_id 
            FROM public.usuarios_empresa ue 
            WHERE ue.user_id = auth.uid()
        )
        OR
        id IN (
            SELECT re.empresa_transporte_id 
            FROM public.relaciones_empresa re
            JOIN public.usuarios_empresa ue ON ue.empresa_id = re.empresa_coordinadora_id
            WHERE ue.user_id = auth.uid()
        )
        OR
        id IN (
            SELECT re.empresa_coordinadora_id 
            FROM public.relaciones_empresa re
            JOIN public.usuarios_empresa ue ON ue.empresa_id = re.empresa_transporte_id
            WHERE ue.user_id = auth.uid()
        )
    );

-- Política para usuarios_empresa: los usuarios pueden ver solo sus propias asociaciones
DROP POLICY IF EXISTS "usuarios_pueden_ver_sus_asociaciones" ON public.usuarios_empresa;
CREATE POLICY "usuarios_pueden_ver_sus_asociaciones" ON public.usuarios_empresa
    FOR SELECT
    USING (user_id = auth.uid());

-- Política para relaciones_empresa: basada en pertenencia a empresa
DROP POLICY IF EXISTS "usuarios_pueden_ver_relaciones_empresa" ON public.relaciones_empresa;
CREATE POLICY "usuarios_pueden_ver_relaciones_empresa" ON public.relaciones_empresa
    FOR SELECT
    USING (
        empresa_coordinadora_id IN (
            SELECT ue.empresa_id 
            FROM public.usuarios_empresa ue 
            WHERE ue.user_id = auth.uid()
        )
        OR
        empresa_transporte_id IN (
            SELECT ue.empresa_id 
            FROM public.usuarios_empresa ue 
            WHERE ue.user_id = auth.uid()
        )
    );

DO $$
BEGIN
    RAISE NOTICE 'Estructura de base de datos verificada y creada correctamente';
END $$;