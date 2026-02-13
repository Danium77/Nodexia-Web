-- =============================================
-- RECREAR TABLAS FALTANTES (FORZADO)
-- Elimina y recrea las 6 tablas faltantes
-- =============================================

-- PASO 1: ELIMINAR TABLAS SI EXISTEN (con CASCADE para eliminar FK)
DROP TABLE IF EXISTS public.visualizaciones_ofertas CASCADE;
DROP TABLE IF EXISTS public.planta_destinos CASCADE;
DROP TABLE IF EXISTS public.planta_origenes CASCADE;
DROP TABLE IF EXISTS public.planta_transportes CASCADE;
DROP TABLE IF EXISTS public.destinos CASCADE;
DROP TABLE IF EXISTS public.origenes CASCADE;

-- PASO 2: CREAR TABLAS

-- 1. ORÍGENES
CREATE TABLE public.origenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('planta', 'deposito', 'centro_distribucion')),
    nombre VARCHAR(255) NOT NULL,
    direccion TEXT NOT NULL,
    localidad VARCHAR(100) NOT NULL,
    provincia VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(10),
    gps_latitud NUMERIC(10,8),
    gps_longitud NUMERIC(11,8),
    horario_carga_inicio TIME,
    horario_carga_fin TIME,
    dias_operacion TEXT[],
    contacto_nombre VARCHAR(100),
    contacto_telefono VARCHAR(20),
    contacto_email VARCHAR(100),
    capacidad_carga_diaria INTEGER,
    observaciones TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. DESTINOS
CREATE TABLE public.destinos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_cliente_id UUID,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    razon_social VARCHAR(255),
    cuit_destino VARCHAR(13),
    direccion TEXT NOT NULL,
    localidad VARCHAR(100) NOT NULL,
    provincia VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(10),
    gps_latitud NUMERIC(10,8),
    gps_longitud NUMERIC(11,8),
    horario_recepcion_inicio TIME,
    horario_recepcion_fin TIME,
    dias_recepcion TEXT[],
    contacto_nombre VARCHAR(100),
    contacto_telefono VARCHAR(20),
    contacto_email VARCHAR(100),
    requiere_cita_previa BOOLEAN DEFAULT false,
    link_solicitud_turno TEXT,
    observaciones TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. PLANTA_TRANSPORTES
CREATE TABLE public.planta_transportes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planta_id UUID NOT NULL,
    transporte_id UUID NOT NULL,
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'suspendido')),
    tarifa_acordada NUMERIC(12,2),
    es_preferido BOOLEAN DEFAULT false,
    prioridad INTEGER DEFAULT 1,
    observaciones TEXT,
    fecha_inicio DATE DEFAULT CURRENT_DATE,
    fecha_fin DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(planta_id, transporte_id)
);

-- 4. PLANTA_ORIGENES
CREATE TABLE public.planta_origenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planta_id UUID NOT NULL,
    origen_id UUID NOT NULL,
    alias VARCHAR(100),
    es_origen_principal BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(planta_id, origen_id)
);

-- 5. PLANTA_DESTINOS
CREATE TABLE public.planta_destinos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planta_id UUID NOT NULL,
    destino_id UUID NOT NULL,
    es_destino_frecuente BOOLEAN DEFAULT false,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(planta_id, destino_id)
);

-- 6. VISUALIZACIONES_OFERTAS
CREATE TABLE public.visualizaciones_ofertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oferta_id UUID NOT NULL,
    empresa_transporte_id UUID NOT NULL,
    visualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usuario_id UUID,
    UNIQUE(oferta_id, empresa_transporte_id, visualizado_en)
);

-- PASO 3: AGREGAR FOREIGN KEYS
ALTER TABLE public.destinos
ADD CONSTRAINT destinos_empresa_cliente_id_fkey
FOREIGN KEY (empresa_cliente_id) REFERENCES public.empresas(id) ON DELETE SET NULL;

ALTER TABLE public.planta_transportes
ADD CONSTRAINT planta_transportes_planta_id_fkey
FOREIGN KEY (planta_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.planta_transportes
ADD CONSTRAINT planta_transportes_transporte_id_fkey
FOREIGN KEY (transporte_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.planta_origenes
ADD CONSTRAINT planta_origenes_planta_id_fkey
FOREIGN KEY (planta_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.planta_origenes
ADD CONSTRAINT planta_origenes_origen_id_fkey
FOREIGN KEY (origen_id) REFERENCES public.origenes(id) ON DELETE CASCADE;

ALTER TABLE public.planta_destinos
ADD CONSTRAINT planta_destinos_planta_id_fkey
FOREIGN KEY (planta_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.planta_destinos
ADD CONSTRAINT planta_destinos_destino_id_fkey
FOREIGN KEY (destino_id) REFERENCES public.destinos(id) ON DELETE CASCADE;

ALTER TABLE public.visualizaciones_ofertas
ADD CONSTRAINT visualizaciones_ofertas_oferta_id_fkey
FOREIGN KEY (oferta_id) REFERENCES public.ofertas_red_nodexia(id) ON DELETE CASCADE;

ALTER TABLE public.visualizaciones_ofertas
ADD CONSTRAINT visualizaciones_ofertas_empresa_transporte_id_fkey
FOREIGN KEY (empresa_transporte_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.visualizaciones_ofertas
ADD CONSTRAINT visualizaciones_ofertas_usuario_id_fkey
FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- PASO 4: HABILITAR RLS
ALTER TABLE public.origenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planta_transportes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planta_origenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planta_destinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visualizaciones_ofertas ENABLE ROW LEVEL SECURITY;

-- PASO 5: CREAR ÍNDICES
CREATE INDEX idx_origenes_codigo ON public.origenes(codigo);
CREATE INDEX idx_origenes_tipo ON public.origenes(tipo);
CREATE INDEX idx_destinos_codigo ON public.destinos(codigo);
CREATE INDEX idx_destinos_empresa_cliente ON public.destinos(empresa_cliente_id);
CREATE INDEX idx_planta_transportes_planta ON public.planta_transportes(planta_id);
CREATE INDEX idx_planta_transportes_transporte ON public.planta_transportes(transporte_id);
CREATE INDEX idx_planta_origenes_planta ON public.planta_origenes(planta_id);
CREATE INDEX idx_planta_destinos_planta ON public.planta_destinos(planta_id);
CREATE INDEX idx_visualizaciones_oferta ON public.visualizaciones_ofertas(oferta_id);

-- VERIFICACIÓN FINAL
SELECT 
    '✅ TABLAS CREADAS EXITOSAMENTE' as mensaje,
    COUNT(*) as total_tablas
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('origenes', 'destinos', 'planta_transportes', 'planta_origenes', 'planta_destinos', 'visualizaciones_ofertas');
