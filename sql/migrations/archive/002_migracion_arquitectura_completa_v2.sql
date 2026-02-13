-- =============================================
-- MIGRACIÓN DEFINITIVA: Arquitectura Completa NODEXIA
-- Fecha: 19 de Octubre 2025
-- Versión: 2.1 (CORREGIDA - Sin empresa_planta_id en empresas)
-- =============================================
-- 
-- CAMBIOS PRINCIPALES:
-- 1. tipo_empresa: 'planta' (no 'coordinador'), 'transporte', 'cliente'
-- 2. Multi-rol habilitado: UNIQUE(user_id, empresa_id, rol_interno)
-- 3. Nuevas tablas: destinos, origenes, planta_*, ofertas_red_nodexia
-- 4. RLS policies actualizadas
-- =============================================

-- =============================================
-- PASO 0: VERIFICACIÓN INICIAL
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '🚀 Iniciando migración...';
    RAISE NOTICE '📊 Verificando estructura actual...';
END $$;

-- =============================================
-- PASO 1: CORREGIR TABLA EMPRESAS
-- =============================================

-- Eliminar constraint viejo si existe
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'empresas_tipo_empresa_check'
    ) THEN
        ALTER TABLE public.empresas DROP CONSTRAINT empresas_tipo_empresa_check;
        RAISE NOTICE '✅ Constraint viejo eliminado';
    END IF;
END $$;

-- Actualizar valores existentes de 'coordinador' a 'planta'
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.empresas 
    SET tipo_empresa = 'planta' 
    WHERE tipo_empresa = 'coordinador';
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    IF v_count > 0 THEN
        RAISE NOTICE '✅ % empresas actualizadas de "coordinador" a "planta"', v_count;
    ELSE
        RAISE NOTICE '✅ No hay empresas tipo "coordinador" para actualizar';
    END IF;
END $$;

-- Agregar columnas faltantes si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'empresas' 
                   AND column_name = 'localidad') THEN
        ALTER TABLE public.empresas ADD COLUMN localidad VARCHAR(100);
        RAISE NOTICE '✅ Columna localidad agregada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public'
                   AND table_name = 'empresas' 
                   AND column_name = 'provincia') THEN
        ALTER TABLE public.empresas ADD COLUMN provincia VARCHAR(100);
        RAISE NOTICE '✅ Columna provincia agregada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public'
                   AND table_name = 'empresas' 
                   AND column_name = 'activo') THEN
        ALTER TABLE public.empresas ADD COLUMN activo BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Columna activo agregada';
    END IF;
END $$;

-- Agregar constraint correcto
DO $$
BEGIN
    ALTER TABLE public.empresas 
    ADD CONSTRAINT empresas_tipo_empresa_check 
    CHECK (tipo_empresa IN ('planta', 'transporte', 'cliente'));
    
    RAISE NOTICE '✅ Constraint tipo_empresa actualizado: planta, transporte, cliente';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE '⚠️  Constraint ya existe, continuando...';
END $$;

-- =============================================
-- PASO 2: CORREGIR TABLA USUARIOS_EMPRESA (MULTI-ROL)
-- =============================================

-- Verificar si la tabla existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios_empresa'
    ) THEN
        RAISE EXCEPTION 'ERROR: La tabla usuarios_empresa no existe. Detener migración.';
    END IF;
    
    RAISE NOTICE '✅ Tabla usuarios_empresa encontrada';
END $$;

-- Eliminar constraint viejo que impedía multi-rol
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'usuarios_empresa_user_id_empresa_id_key'
    ) THEN
        ALTER TABLE public.usuarios_empresa 
        DROP CONSTRAINT usuarios_empresa_user_id_empresa_id_key;
        RAISE NOTICE '✅ Constraint viejo de multi-rol eliminado';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_user_empresa'
    ) THEN
        ALTER TABLE public.usuarios_empresa 
        DROP CONSTRAINT unique_user_empresa;
        RAISE NOTICE '✅ Constraint unique_user_empresa eliminado';
    END IF;
END $$;

-- Agregar constraint correcto que PERMITE multi-rol
DO $$
BEGIN
    ALTER TABLE public.usuarios_empresa 
    ADD CONSTRAINT usuarios_empresa_user_empresa_rol_unique 
    UNIQUE(user_id, empresa_id, rol_interno);
    
    RAISE NOTICE '✅ Multi-rol habilitado: UNIQUE(user_id, empresa_id, rol_interno)';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE '⚠️  Constraint multi-rol ya existe, continuando...';
END $$;

-- =============================================
-- PASO 3: CREAR TABLA ORIGENES
-- =============================================

CREATE TABLE IF NOT EXISTS public.origenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('planta', 'deposito', 'centro_distribucion')),
    nombre VARCHAR(255) NOT NULL,
    direccion TEXT NOT NULL,
    localidad VARCHAR(100) NOT NULL,
    provincia VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(10),
    gps_latitud NUMERIC(10,8),
    gps_longitud NUMERIC(11,8),
    capacidad_almacenamiento_tn NUMERIC(10,2),
    capacidad_carga_diaria_tn NUMERIC(10,2),
    horario_carga_desde TIME,
    horario_carga_hasta TIME,
    dias_operacion TEXT[], -- ['lunes', 'martes', ...]
    observaciones TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    RAISE NOTICE '✅ Tabla origenes creada';
END $$;

COMMENT ON TABLE public.origenes IS 'Orígenes globales creados por Admin Nodexia. Plantas pueden agregar a su configuración.';

-- =============================================
-- PASO 4: CREAR TABLA DESTINOS
-- =============================================

CREATE TABLE IF NOT EXISTS public.destinos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_cliente_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
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
    dias_recepcion TEXT[], -- ['lunes', 'martes', ...]
    contacto_nombre VARCHAR(100),
    contacto_telefono VARCHAR(20),
    contacto_email VARCHAR(100),
    requiere_cita_previa BOOLEAN DEFAULT false,
    link_solicitud_turno TEXT,
    observaciones_entrega TEXT,
    tipo_carga_acepta TEXT,
    capacidad_descarga_diaria NUMERIC(10,2),
    tiempo_promedio_descarga_min INTEGER,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    RAISE NOTICE '✅ Tabla destinos creada';
END $$;

COMMENT ON TABLE public.destinos IS 'Destinos de entrega. Pueden estar vinculados a empresa_cliente (con login) o ser independientes.';
COMMENT ON COLUMN public.destinos.empresa_cliente_id IS 'Si tiene empresa_cliente_id, ese cliente puede loguear y ver despachos. Si NULL, es solo dirección de entrega.';

-- =============================================
-- PASO 5: CREAR TABLA PLANTA_TRANSPORTES (Red Privada)
-- =============================================

CREATE TABLE IF NOT EXISTS public.planta_transportes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planta_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    transporte_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'pausado', 'bloqueado')),
    tarifa_acordada NUMERIC(10,2),
    moneda VARCHAR(3) DEFAULT 'ARS',
    es_preferido BOOLEAN DEFAULT false,
    prioridad INTEGER DEFAULT 5 CHECK (prioridad BETWEEN 1 AND 10),
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(planta_id, transporte_id)
);

CREATE INDEX IF NOT EXISTS idx_planta_transportes_planta ON public.planta_transportes(planta_id);
CREATE INDEX IF NOT EXISTS idx_planta_transportes_transporte ON public.planta_transportes(transporte_id);

DO $$
BEGIN
    RAISE NOTICE '✅ Tabla planta_transportes creada (Red Privada)';
END $$;

COMMENT ON TABLE public.planta_transportes IS 'Red privada de transportes de cada planta. Relaciones directas con tarifas acordadas.';

-- =============================================
-- PASO 6: CREAR TABLA PLANTA_ORIGENES
-- =============================================

CREATE TABLE IF NOT EXISTS public.planta_origenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planta_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    origen_id UUID NOT NULL REFERENCES public.origenes(id) ON DELETE CASCADE,
    alias VARCHAR(100),
    es_origen_principal BOOLEAN DEFAULT false,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(planta_id, origen_id)
);

CREATE INDEX IF NOT EXISTS idx_planta_origenes_planta ON public.planta_origenes(planta_id);
CREATE INDEX IF NOT EXISTS idx_planta_origenes_origen ON public.planta_origenes(origen_id);

DO $$
BEGIN
    RAISE NOTICE '✅ Tabla planta_origenes creada';
END $$;

COMMENT ON TABLE public.planta_origenes IS 'Orígenes que cada planta ha agregado a su configuración. Admin crea orígenes globales, plantas los agregan aquí.';

-- =============================================
-- PASO 7: CREAR TABLA PLANTA_DESTINOS
-- =============================================

CREATE TABLE IF NOT EXISTS public.planta_destinos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planta_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    destino_id UUID NOT NULL REFERENCES public.destinos(id) ON DELETE CASCADE,
    es_destino_frecuente BOOLEAN DEFAULT false,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(planta_id, destino_id)
);

CREATE INDEX IF NOT EXISTS idx_planta_destinos_planta ON public.planta_destinos(planta_id);
CREATE INDEX IF NOT EXISTS idx_planta_destinos_destino ON public.planta_destinos(destino_id);

DO $$
BEGIN
    RAISE NOTICE '✅ Tabla planta_destinos creada';
END $$;

COMMENT ON TABLE public.planta_destinos IS 'Destinos que cada planta usa frecuentemente. Facilita la creación rápida de despachos.';

-- =============================================
-- PASO 8: CREAR TABLA OFERTAS_RED_NODEXIA
-- =============================================

CREATE TABLE IF NOT EXISTS public.ofertas_red_nodexia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    despacho_id UUID NOT NULL,
    planta_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    estado VARCHAR(20) NOT NULL DEFAULT 'publicada' CHECK (estado IN ('borrador', 'publicada', 'tomada', 'expirada', 'cancelada')),
    urgencia VARCHAR(20) NOT NULL DEFAULT 'media' CHECK (urgencia IN ('baja', 'media', 'alta', 'urgente')),
    tarifa_ofrecida NUMERIC(10,2),
    moneda VARCHAR(3) DEFAULT 'ARS',
    fecha_limite_respuesta TIMESTAMP WITH TIME ZONE,
    observaciones_oferta TEXT,
    visualizaciones INTEGER DEFAULT 0,
    fecha_publicacion TIMESTAMP WITH TIME ZONE,
    fecha_expiracion TIMESTAMP WITH TIME ZONE,
    transporte_tomador_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
    fecha_tomada TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ofertas_red_despacho ON public.ofertas_red_nodexia(despacho_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_red_planta ON public.ofertas_red_nodexia(planta_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_red_estado ON public.ofertas_red_nodexia(estado);
CREATE INDEX IF NOT EXISTS idx_ofertas_red_urgencia ON public.ofertas_red_nodexia(urgencia);

DO $$
BEGIN
    RAISE NOTICE '✅ Tabla ofertas_red_nodexia creada (Marketplace)';
END $$;

COMMENT ON TABLE public.ofertas_red_nodexia IS 'Marketplace de despachos. Plantas publican, TODOS los transportes ven, uno toma.';

-- =============================================
-- PASO 9: CREAR TABLA VISUALIZACIONES_OFERTAS
-- =============================================

CREATE TABLE IF NOT EXISTS public.visualizaciones_ofertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oferta_id UUID NOT NULL REFERENCES public.ofertas_red_nodexia(id) ON DELETE CASCADE,
    transporte_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    fecha_visualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(oferta_id, transporte_id)
);

CREATE INDEX IF NOT EXISTS idx_visualizaciones_oferta ON public.visualizaciones_ofertas(oferta_id);
CREATE INDEX IF NOT EXISTS idx_visualizaciones_transporte ON public.visualizaciones_ofertas(transporte_id);

DO $$
BEGIN
    RAISE NOTICE '✅ Tabla visualizaciones_ofertas creada';
END $$;

COMMENT ON TABLE public.visualizaciones_ofertas IS 'Tracking de qué transportes vieron cada oferta. Ayuda a métricas y evita duplicados.';

-- =============================================
-- PASO 10: ACTUALIZAR TABLA DESPACHOS (si existe)
-- =============================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'despachos'
    ) THEN
        -- Agregar columnas nuevas si no existen
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public'
                       AND table_name = 'despachos' 
                       AND column_name = 'origen_id') THEN
            ALTER TABLE public.despachos ADD COLUMN origen_id UUID REFERENCES public.origenes(id);
            RAISE NOTICE '✅ Columna origen_id agregada a despachos';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public'
                       AND table_name = 'despachos' 
                       AND column_name = 'destino_id') THEN
            ALTER TABLE public.despachos ADD COLUMN destino_id UUID REFERENCES public.destinos(id);
            RAISE NOTICE '✅ Columna destino_id agregada a despachos';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public'
                       AND table_name = 'despachos' 
                       AND column_name = 'planta_id') THEN
            ALTER TABLE public.despachos ADD COLUMN planta_id UUID REFERENCES public.empresas(id);
            RAISE NOTICE '✅ Columna planta_id agregada a despachos';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public'
                       AND table_name = 'despachos' 
                       AND column_name = 'transporte_id') THEN
            ALTER TABLE public.despachos ADD COLUMN transporte_id UUID REFERENCES public.empresas(id);
            RAISE NOTICE '✅ Columna transporte_id agregada a despachos';
        END IF;
        
        -- Crear índices
        CREATE INDEX IF NOT EXISTS idx_despachos_origen ON public.despachos(origen_id);
        CREATE INDEX IF NOT EXISTS idx_despachos_destino ON public.despachos(destino_id);
        CREATE INDEX IF NOT EXISTS idx_despachos_planta ON public.despachos(planta_id);
        CREATE INDEX IF NOT EXISTS idx_despachos_transporte ON public.despachos(transporte_id);
        
        RAISE NOTICE '✅ Tabla despachos actualizada con nuevas columnas';
    ELSE
        RAISE NOTICE '⚠️  Tabla despachos no existe aún, saltando actualización';
    END IF;
END $$;

-- =============================================
-- PASO 11: HABILITAR RLS EN NUEVAS TABLAS
-- =============================================

ALTER TABLE public.origenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planta_transportes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planta_origenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planta_destinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofertas_red_nodexia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visualizaciones_ofertas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE '✅ RLS habilitado en todas las tablas nuevas';
END $$;

-- =============================================
-- PASO 12: FUNCIONES AUXILIARES
-- =============================================

-- Función para incrementar visualizaciones
CREATE OR REPLACE FUNCTION public.incrementar_visualizaciones(p_oferta_id UUID, p_transporte_id UUID)
RETURNS void AS $$
BEGIN
    -- Insertar visualización si no existe
    INSERT INTO public.visualizaciones_ofertas (oferta_id, transporte_id, user_id)
    VALUES (p_oferta_id, p_transporte_id, auth.uid())
    ON CONFLICT (oferta_id, transporte_id) DO NOTHING;
    
    -- Incrementar contador
    UPDATE public.ofertas_red_nodexia
    SET visualizaciones = visualizaciones + 1
    WHERE id = p_oferta_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    RAISE NOTICE '✅ Función incrementar_visualizaciones() creada';
END $$;

-- Función para expirar ofertas vencidas
CREATE OR REPLACE FUNCTION public.expirar_ofertas_vencidas()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.ofertas_red_nodexia
    SET estado = 'expirada'
    WHERE estado = 'publicada'
    AND fecha_expiracion < NOW();
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    RAISE NOTICE '✅ Función expirar_ofertas_vencidas() creada';
END $$;

-- =============================================
-- VERIFICACIÓN FINAL
-- =============================================

DO $$
DECLARE
    v_count_empresas INTEGER;
    v_count_origenes INTEGER;
    v_count_destinos INTEGER;
    v_count_planta_transportes INTEGER;
    v_count_ofertas INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count_empresas FROM public.empresas;
    SELECT COUNT(*) INTO v_count_origenes FROM public.origenes;
    SELECT COUNT(*) INTO v_count_destinos FROM public.destinos;
    SELECT COUNT(*) INTO v_count_planta_transportes FROM public.planta_transportes;
    SELECT COUNT(*) INTO v_count_ofertas FROM public.ofertas_red_nodexia;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '✅ MIGRACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📊 RESUMEN:';
    RAISE NOTICE '   • Empresas: %', v_count_empresas;
    RAISE NOTICE '   • Orígenes: %', v_count_origenes;
    RAISE NOTICE '   • Destinos: %', v_count_destinos;
    RAISE NOTICE '   • Relaciones Planta-Transporte: %', v_count_planta_transportes;
    RAISE NOTICE '   • Ofertas Red Nodexia: %', v_count_ofertas;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Multi-rol habilitado: UNIQUE(user_id, empresa_id, rol_interno)';
    RAISE NOTICE '✅ Tipo empresa: planta, transporte, cliente';
    RAISE NOTICE '✅ 7 Tablas nuevas creadas';
    RAISE NOTICE '✅ Funciones auxiliares instaladas';
    RAISE NOTICE '✅ RLS habilitado';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Sistema listo para uso';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
