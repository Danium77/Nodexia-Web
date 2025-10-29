-- =====================================================
-- MIGRACIÓN 008: SISTEMA DE UBICACIONES
-- =====================================================
-- Descripción: Sistema completo de gestión de ubicaciones
--              (plantas, depósitos, clientes) con vinculación
--              a empresas para control de orígenes/destinos
-- Autor: Jary
-- Fecha: 19-Oct-2025
-- =====================================================

-- =====================================================
-- 1. TABLA PRINCIPAL: UBICACIONES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ubicaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Información básica
    nombre VARCHAR(255) NOT NULL,
    cuit VARCHAR(13) NOT NULL UNIQUE, -- Formato: 30-12345678-9
    
    -- Tipo de ubicación
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('planta', 'deposito', 'cliente')),
    
    -- Dirección completa
    direccion TEXT NOT NULL,
    ciudad VARCHAR(100),
    provincia VARCHAR(100),
    codigo_postal VARCHAR(10),
    pais VARCHAR(100) DEFAULT 'Argentina',
    
    -- Coordenadas geográficas (opcional, para futuro)
    latitud DECIMAL(10, 8),
    longitud DECIMAL(11, 8),
    
    -- Información de contacto
    telefono VARCHAR(50),
    email VARCHAR(255),
    contacto_nombre VARCHAR(255),
    contacto_cargo VARCHAR(100),
    
    -- Información operativa
    horario_atencion TEXT, -- JSON o texto libre
    capacidad_carga VARCHAR(100), -- Ej: "50 toneladas"
    observaciones TEXT,
    
    -- Control
    activo BOOLEAN DEFAULT true,
    
    -- Auditoría
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_ubicaciones_nombre ON public.ubicaciones USING gin(to_tsvector('spanish', nombre));
CREATE INDEX IF NOT EXISTS idx_ubicaciones_cuit ON public.ubicaciones(cuit);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_tipo ON public.ubicaciones(tipo);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_activo ON public.ubicaciones(activo);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_ciudad ON public.ubicaciones(ciudad);

-- Comentarios
COMMENT ON TABLE public.ubicaciones IS 'Catálogo global de ubicaciones: plantas, depósitos y clientes';
COMMENT ON COLUMN public.ubicaciones.tipo IS 'Tipo de ubicación: planta, deposito, cliente';
COMMENT ON COLUMN public.ubicaciones.cuit IS 'CUIT único de la ubicación';

-- =====================================================
-- 2. TABLA DE VINCULACIÓN: EMPRESA_UBICACIONES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.empresa_ubicaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relaciones
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    ubicacion_id UUID NOT NULL REFERENCES public.ubicaciones(id) ON DELETE CASCADE,
    
    -- Tipo de relación (puede ser origen, destino, o ambos)
    es_origen BOOLEAN DEFAULT false,
    es_destino BOOLEAN DEFAULT false,
    
    -- Configuración específica de la relación
    alias VARCHAR(255), -- Nombre personalizado que la empresa le da a esta ubicación
    prioridad INTEGER DEFAULT 0, -- Para ordenar ubicaciones favoritas
    notas TEXT,
    
    -- Control
    activo BOOLEAN DEFAULT true,
    
    -- Auditoría
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    
    -- Restricciones
    UNIQUE(empresa_id, ubicacion_id),
    CHECK (es_origen = true OR es_destino = true) -- Al menos uno debe ser true
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_empresa_ubicaciones_empresa ON public.empresa_ubicaciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_ubicaciones_ubicacion ON public.empresa_ubicaciones(ubicacion_id);
CREATE INDEX IF NOT EXISTS idx_empresa_ubicaciones_origen ON public.empresa_ubicaciones(empresa_id, es_origen) WHERE es_origen = true;
CREATE INDEX IF NOT EXISTS idx_empresa_ubicaciones_destino ON public.empresa_ubicaciones(empresa_id, es_destino) WHERE es_destino = true;

-- Comentarios
COMMENT ON TABLE public.empresa_ubicaciones IS 'Vinculación de empresas con ubicaciones (orígenes/destinos permitidos)';
COMMENT ON COLUMN public.empresa_ubicaciones.es_origen IS 'Si TRUE, la empresa puede usar esta ubicación como ORIGEN';
COMMENT ON COLUMN public.empresa_ubicaciones.es_destino IS 'Si TRUE, la empresa puede usar esta ubicación como DESTINO';

-- =====================================================
-- 3. FUNCIÓN: Trigger para updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_ubicaciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers (DROP IF EXISTS para idempotencia)
DROP TRIGGER IF EXISTS trigger_ubicaciones_updated_at ON public.ubicaciones;
CREATE TRIGGER trigger_ubicaciones_updated_at
    BEFORE UPDATE ON public.ubicaciones
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ubicaciones_updated_at();

DROP TRIGGER IF EXISTS trigger_empresa_ubicaciones_updated_at ON public.empresa_ubicaciones;
CREATE TRIGGER trigger_empresa_ubicaciones_updated_at
    BEFORE UPDATE ON public.empresa_ubicaciones
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ubicaciones_updated_at();

-- =====================================================
-- 4. POLÍTICAS RLS - UBICACIONES
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.ubicaciones ENABLE ROW LEVEL SECURITY;

-- Drop políticas existentes para evitar duplicados
DROP POLICY IF EXISTS "super_admin_ubicaciones_all" ON public.ubicaciones;
DROP POLICY IF EXISTS "usuarios_ver_ubicaciones_vinculadas" ON public.ubicaciones;

-- Super Admin: acceso completo
CREATE POLICY "super_admin_ubicaciones_all"
ON public.ubicaciones
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios_empresa ue
        WHERE ue.user_id = auth.uid()
        AND ue.rol_interno = 'super_admin'
    )
);

-- Coordinadores y otros roles: solo lectura de ubicaciones activas vinculadas a su empresa
CREATE POLICY "usuarios_ver_ubicaciones_vinculadas"
ON public.ubicaciones
FOR SELECT
TO authenticated
USING (
    activo = true
    AND EXISTS (
        SELECT 1 
        FROM public.empresa_ubicaciones eu
        INNER JOIN public.usuarios_empresa ue ON eu.empresa_id = ue.empresa_id
        WHERE eu.ubicacion_id = ubicaciones.id
        AND ue.user_id = auth.uid()
        AND eu.activo = true
    )
);

-- =====================================================
-- 5. POLÍTICAS RLS - EMPRESA_UBICACIONES
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.empresa_ubicaciones ENABLE ROW LEVEL SECURITY;

-- Drop políticas existentes para evitar duplicados
DROP POLICY IF EXISTS "super_admin_empresa_ubicaciones_all" ON public.empresa_ubicaciones;
DROP POLICY IF EXISTS "usuarios_ver_vinculaciones_empresa" ON public.empresa_ubicaciones;
DROP POLICY IF EXISTS "coordinadores_gestionar_vinculaciones" ON public.empresa_ubicaciones;

-- Super Admin: acceso completo
CREATE POLICY "super_admin_empresa_ubicaciones_all"
ON public.empresa_ubicaciones
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios_empresa ue
        WHERE ue.user_id = auth.uid()
        AND ue.rol_interno = 'super_admin'
    )
);

-- Usuarios: ver y gestionar vinculaciones de su empresa
CREATE POLICY "usuarios_ver_vinculaciones_empresa"
ON public.empresa_ubicaciones
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios_empresa ue
        WHERE ue.empresa_id = empresa_ubicaciones.empresa_id
        AND ue.user_id = auth.uid()
    )
);

-- Coordinadores: pueden crear/actualizar vinculaciones de su empresa
CREATE POLICY "coordinadores_gestionar_vinculaciones"
ON public.empresa_ubicaciones
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios_empresa ue
        WHERE ue.empresa_id = empresa_ubicaciones.empresa_id
        AND ue.user_id = auth.uid()
        AND ue.rol_interno IN ('coordinador', 'admin', 'super_admin')
    )
);

-- =====================================================
-- 6. FUNCIONES AUXILIARES
-- =====================================================

-- Función: Buscar ubicaciones por nombre o CUIT (para autocomplete)
CREATE OR REPLACE FUNCTION public.buscar_ubicaciones(
    p_empresa_id UUID,
    p_tipo_busqueda TEXT, -- 'origen' o 'destino'
    p_termino_busqueda TEXT
)
RETURNS TABLE (
    id UUID,
    nombre VARCHAR,
    cuit VARCHAR,
    tipo VARCHAR,
    direccion TEXT,
    ciudad VARCHAR,
    provincia VARCHAR,
    telefono VARCHAR,
    alias VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.nombre,
        u.cuit,
        u.tipo,
        u.direccion,
        u.ciudad,
        u.provincia,
        u.telefono,
        eu.alias
    FROM public.ubicaciones u
    INNER JOIN public.empresa_ubicaciones eu ON u.id = eu.ubicacion_id
    WHERE eu.empresa_id = p_empresa_id
    AND eu.activo = true
    AND u.activo = true
    AND (
        (p_tipo_busqueda = 'origen' AND eu.es_origen = true)
        OR (p_tipo_busqueda = 'destino' AND eu.es_destino = true)
    )
    AND (
        u.nombre ILIKE '%' || p_termino_busqueda || '%'
        OR u.cuit ILIKE '%' || p_termino_busqueda || '%'
        OR COALESCE(eu.alias, '') ILIKE '%' || p_termino_busqueda || '%'
    )
    ORDER BY 
        eu.prioridad DESC,
        u.nombre ASC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario
COMMENT ON FUNCTION public.buscar_ubicaciones IS 'Búsqueda predictiva de ubicaciones vinculadas a una empresa';

-- =====================================================
-- FIN DE MIGRACIÓN 008
-- =====================================================

-- Verificación
DO $$
BEGIN
    RAISE NOTICE '✅ Migración 008 completada exitosamente';
    RAISE NOTICE '📊 Tablas creadas: ubicaciones, empresa_ubicaciones';
    RAISE NOTICE '🔐 Políticas RLS configuradas';
    RAISE NOTICE '🔍 Función de búsqueda: buscar_ubicaciones()';
    RAISE NOTICE '⚠️ NO se insertaron datos de ejemplo - usar UI para crear ubicaciones';
END $$;
