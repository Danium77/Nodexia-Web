-- =============================================
-- CREAR TABLAS FALTANTES
-- Las tablas que no se crearon en la migración v3
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '🔧 CREAR TABLAS FALTANTES';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- =============================================
-- 1. ORÍGENES
-- =============================================

CREATE TABLE IF NOT EXISTS public.origenes (
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

DO $$
BEGIN
    RAISE NOTICE '✅ Tabla origenes creada';
END $$;

-- =============================================
-- 2. DESTINOS
-- =============================================

CREATE TABLE IF NOT EXISTS public.destinos (
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

DO $$
BEGIN
    RAISE NOTICE '✅ Tabla destinos creada';
END $$;

-- =============================================
-- 3. PLANTA_TRANSPORTES
-- =============================================

CREATE TABLE IF NOT EXISTS public.planta_transportes (
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

DO $$
BEGIN
    RAISE NOTICE '✅ Tabla planta_transportes creada';
END $$;

-- =============================================
-- 4. PLANTA_ORIGENES
-- =============================================

CREATE TABLE IF NOT EXISTS public.planta_origenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planta_id UUID NOT NULL,
    origen_id UUID NOT NULL,
    alias VARCHAR(100),
    es_origen_principal BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(planta_id, origen_id)
);

DO $$
BEGIN
    RAISE NOTICE '✅ Tabla planta_origenes creada';
END $$;

-- =============================================
-- 5. PLANTA_DESTINOS
-- =============================================

CREATE TABLE IF NOT EXISTS public.planta_destinos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planta_id UUID NOT NULL,
    destino_id UUID NOT NULL,
    es_destino_frecuente BOOLEAN DEFAULT false,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(planta_id, destino_id)
);

DO $$
BEGIN
    RAISE NOTICE '✅ Tabla planta_destinos creada';
END $$;

-- =============================================
-- 6. VISUALIZACIONES_OFERTAS
-- =============================================

CREATE TABLE IF NOT EXISTS public.visualizaciones_ofertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oferta_id UUID NOT NULL,
    empresa_transporte_id UUID NOT NULL,
    visualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usuario_id UUID,
    UNIQUE(oferta_id, empresa_transporte_id, visualizado_en)
);

DO $$
BEGIN
    RAISE NOTICE '✅ Tabla visualizaciones_ofertas creada';
END $$;

-- =============================================
-- AGREGAR FOREIGN KEYS
-- =============================================

DO $$
BEGIN
    -- FK destinos → empresas
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'destinos_empresa_cliente_id_fkey'
    ) THEN
        ALTER TABLE public.destinos
        ADD CONSTRAINT destinos_empresa_cliente_id_fkey
        FOREIGN KEY (empresa_cliente_id) REFERENCES public.empresas(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ FK: destinos → empresas';
    END IF;

    -- FK planta_transportes → empresas (planta)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'planta_transportes_planta_id_fkey'
    ) THEN
        ALTER TABLE public.planta_transportes
        ADD CONSTRAINT planta_transportes_planta_id_fkey
        FOREIGN KEY (planta_id) REFERENCES public.empresas(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ FK: planta_transportes → empresas (planta)';
    END IF;

    -- FK planta_transportes → empresas (transporte)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'planta_transportes_transporte_id_fkey'
    ) THEN
        ALTER TABLE public.planta_transportes
        ADD CONSTRAINT planta_transportes_transporte_id_fkey
        FOREIGN KEY (transporte_id) REFERENCES public.empresas(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ FK: planta_transportes → empresas (transporte)';
    END IF;

    -- FK planta_origenes → empresas
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'planta_origenes_planta_id_fkey'
    ) THEN
        ALTER TABLE public.planta_origenes
        ADD CONSTRAINT planta_origenes_planta_id_fkey
        FOREIGN KEY (planta_id) REFERENCES public.empresas(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ FK: planta_origenes → empresas';
    END IF;

    -- FK planta_origenes → origenes
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'planta_origenes_origen_id_fkey'
    ) THEN
        ALTER TABLE public.planta_origenes
        ADD CONSTRAINT planta_origenes_origen_id_fkey
        FOREIGN KEY (origen_id) REFERENCES public.origenes(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ FK: planta_origenes → origenes';
    END IF;

    -- FK planta_destinos → empresas
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'planta_destinos_planta_id_fkey'
    ) THEN
        ALTER TABLE public.planta_destinos
        ADD CONSTRAINT planta_destinos_planta_id_fkey
        FOREIGN KEY (planta_id) REFERENCES public.empresas(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ FK: planta_destinos → empresas';
    END IF;

    -- FK planta_destinos → destinos
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'planta_destinos_destino_id_fkey'
    ) THEN
        ALTER TABLE public.planta_destinos
        ADD CONSTRAINT planta_destinos_destino_id_fkey
        FOREIGN KEY (destino_id) REFERENCES public.destinos(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ FK: planta_destinos → destinos';
    END IF;

    -- FK visualizaciones_ofertas → ofertas_red_nodexia
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'visualizaciones_ofertas_oferta_id_fkey'
    ) THEN
        ALTER TABLE public.visualizaciones_ofertas
        ADD CONSTRAINT visualizaciones_ofertas_oferta_id_fkey
        FOREIGN KEY (oferta_id) REFERENCES public.ofertas_red_nodexia(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ FK: visualizaciones_ofertas → ofertas';
    END IF;

    -- FK visualizaciones_ofertas → empresas
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'visualizaciones_ofertas_empresa_transporte_id_fkey'
    ) THEN
        ALTER TABLE public.visualizaciones_ofertas
        ADD CONSTRAINT visualizaciones_ofertas_empresa_transporte_id_fkey
        FOREIGN KEY (empresa_transporte_id) REFERENCES public.empresas(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ FK: visualizaciones_ofertas → empresas';
    END IF;

    -- FK visualizaciones_ofertas → auth.users
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'visualizaciones_ofertas_usuario_id_fkey'
    ) THEN
        ALTER TABLE public.visualizaciones_ofertas
        ADD CONSTRAINT visualizaciones_ofertas_usuario_id_fkey
        FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ FK: visualizaciones_ofertas → auth.users';
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error agregando FKs: %', SQLERRM;
END $$;

-- =============================================
-- HABILITAR RLS
-- =============================================

ALTER TABLE public.origenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planta_transportes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planta_origenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planta_destinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visualizaciones_ofertas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE '✅ RLS habilitado en todas las tablas';
END $$;

-- =============================================
-- CREAR ÍNDICES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_origenes_codigo ON public.origenes(codigo);
CREATE INDEX IF NOT EXISTS idx_origenes_tipo ON public.origenes(tipo);
CREATE INDEX IF NOT EXISTS idx_destinos_codigo ON public.destinos(codigo);
CREATE INDEX IF NOT EXISTS idx_destinos_empresa_cliente ON public.destinos(empresa_cliente_id);
CREATE INDEX IF NOT EXISTS idx_planta_transportes_planta ON public.planta_transportes(planta_id);
CREATE INDEX IF NOT EXISTS idx_planta_transportes_transporte ON public.planta_transportes(transporte_id);
CREATE INDEX IF NOT EXISTS idx_planta_origenes_planta ON public.planta_origenes(planta_id);
CREATE INDEX IF NOT EXISTS idx_planta_destinos_planta ON public.planta_destinos(planta_id);
CREATE INDEX IF NOT EXISTS idx_visualizaciones_oferta ON public.visualizaciones_ofertas(oferta_id);

DO $$
BEGIN
    RAISE NOTICE '✅ Índices creados';
END $$;

-- =============================================
-- RESUMEN
-- =============================================

DO $$
DECLARE
    v_origenes INTEGER;
    v_destinos INTEGER;
    v_planta_trans INTEGER;
    v_planta_orig INTEGER;
    v_planta_dest INTEGER;
    v_visualizaciones INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_origenes FROM information_schema.tables WHERE table_name = 'origenes';
    SELECT COUNT(*) INTO v_destinos FROM information_schema.tables WHERE table_name = 'destinos';
    SELECT COUNT(*) INTO v_planta_trans FROM information_schema.tables WHERE table_name = 'planta_transportes';
    SELECT COUNT(*) INTO v_planta_orig FROM information_schema.tables WHERE table_name = 'planta_origenes';
    SELECT COUNT(*) INTO v_planta_dest FROM information_schema.tables WHERE table_name = 'planta_destinos';
    SELECT COUNT(*) INTO v_visualizaciones FROM information_schema.tables WHERE table_name = 'visualizaciones_ofertas';
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '✅ TABLAS FALTANTES CREADAS';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📊 VERIFICACIÓN:';
    RAISE NOTICE '   • origenes: %', CASE WHEN v_origenes > 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   • destinos: %', CASE WHEN v_destinos > 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   • planta_transportes: %', CASE WHEN v_planta_trans > 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   • planta_origenes: %', CASE WHEN v_planta_orig > 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   • planta_destinos: %', CASE WHEN v_planta_dest > 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   • visualizaciones_ofertas: %', CASE WHEN v_visualizaciones > 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 SIGUIENTE PASO:';
    RAISE NOTICE '   Ejecutar: 005_seed_datos_demo.sql';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
END $$;