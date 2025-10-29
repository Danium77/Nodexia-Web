-- =============================================
-- MIGRACIÓN SIMPLE Y SEGURA: Arquitectura Completa NODEXIA
-- Fecha: 19 de Octubre 2025
-- Versión: 2.2 (SIMPLIFICADA - Sin FK temporalmente)
-- =============================================

-- =============================================
-- PASO 1: CORREGIR TIPO_EMPRESA
-- =============================================

-- Eliminar constraint viejo
DO $$ 
BEGIN
    ALTER TABLE public.empresas DROP CONSTRAINT IF EXISTS empresas_tipo_empresa_check;
    RAISE NOTICE '✅ Paso 1.1: Constraint viejo eliminado';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Constraint no existía';
END $$;

-- Actualizar valores
UPDATE public.empresas 
SET tipo_empresa = 'planta' 
WHERE tipo_empresa = 'coordinador';

-- Agregar columnas faltantes
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS localidad VARCHAR(100);

ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS provincia VARCHAR(100);

ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- Nuevo constraint
ALTER TABLE public.empresas 
ADD CONSTRAINT empresas_tipo_empresa_check 
CHECK (tipo_empresa IN ('planta', 'transporte', 'cliente'));

DO $$
BEGIN
    RAISE NOTICE '✅ Paso 1: Tabla empresas actualizada';
END $$;

-- =============================================
-- PASO 2: MULTI-ROL EN USUARIOS_EMPRESA
-- =============================================

-- Eliminar constraints viejos
DO $$ 
BEGIN
    ALTER TABLE public.usuarios_empresa 
    DROP CONSTRAINT IF EXISTS usuarios_empresa_user_id_empresa_id_key;
    
    ALTER TABLE public.usuarios_empresa 
    DROP CONSTRAINT IF EXISTS unique_user_empresa;
    
    RAISE NOTICE '✅ Paso 2.1: Constraints viejos eliminados';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Constraints no existían';
END $$;

-- Nuevo constraint multi-rol
DO $$
BEGIN
    ALTER TABLE public.usuarios_empresa 
    ADD CONSTRAINT usuarios_empresa_user_empresa_rol_unique 
    UNIQUE(user_id, empresa_id, rol_interno);
    
    RAISE NOTICE '✅ Paso 2: Multi-rol habilitado';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE '⚠️  Constraint ya existe';
END $$;

-- =============================================
-- PASO 3: CREAR TABLAS SIMPLES (SIN FK TODAVÍA)
-- =============================================

-- ORIGENES
CREATE TABLE IF NOT EXISTS public.origenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(20) NOT NULL,
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
    dias_operacion TEXT[],
    observaciones TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    RAISE NOTICE '✅ Paso 3.1: Tabla origenes creada';
END $$;

-- DESTINOS
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
    RAISE NOTICE '✅ Paso 3.2: Tabla destinos creada';
END $$;

-- PLANTA_TRANSPORTES
CREATE TABLE IF NOT EXISTS public.planta_transportes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planta_id UUID NOT NULL,
    transporte_id UUID NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'activo',
    tarifa_acordada NUMERIC(10,2),
    moneda VARCHAR(3) DEFAULT 'ARS',
    es_preferido BOOLEAN DEFAULT false,
    prioridad INTEGER DEFAULT 5,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(planta_id, transporte_id)
);

DO $$
BEGIN
    RAISE NOTICE '✅ Paso 3.3: Tabla planta_transportes creada';
END $$;

-- PLANTA_ORIGENES
CREATE TABLE IF NOT EXISTS public.planta_origenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planta_id UUID NOT NULL,
    origen_id UUID NOT NULL,
    alias VARCHAR(100),
    es_origen_principal BOOLEAN DEFAULT false,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(planta_id, origen_id)
);

DO $$
BEGIN
    RAISE NOTICE '✅ Paso 3.4: Tabla planta_origenes creada';
END $$;

-- PLANTA_DESTINOS
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
    RAISE NOTICE '✅ Paso 3.5: Tabla planta_destinos creada';
END $$;

-- OFERTAS_RED_NODEXIA
CREATE TABLE IF NOT EXISTS public.ofertas_red_nodexia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    despacho_id UUID,
    planta_id UUID NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'publicada',
    urgencia VARCHAR(20) NOT NULL DEFAULT 'media',
    tarifa_ofrecida NUMERIC(10,2),
    moneda VARCHAR(3) DEFAULT 'ARS',
    fecha_limite_respuesta TIMESTAMP WITH TIME ZONE,
    observaciones_oferta TEXT,
    visualizaciones INTEGER DEFAULT 0,
    fecha_publicacion TIMESTAMP WITH TIME ZONE,
    fecha_expiracion TIMESTAMP WITH TIME ZONE,
    transporte_tomador_id UUID,
    fecha_tomada TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    RAISE NOTICE '✅ Paso 3.6: Tabla ofertas_red_nodexia creada';
END $$;

-- VISUALIZACIONES_OFERTAS
CREATE TABLE IF NOT EXISTS public.visualizaciones_ofertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oferta_id UUID NOT NULL,
    transporte_id UUID NOT NULL,
    user_id UUID NOT NULL,
    fecha_visualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(oferta_id, transporte_id)
);

DO $$
BEGIN
    RAISE NOTICE '✅ Paso 3.7: Tabla visualizaciones_ofertas creada';
END $$;

-- =============================================
-- PASO 4: AGREGAR FOREIGN KEYS (AHORA SÍ)
-- =============================================

-- FK para destinos
DO $$
BEGIN
    ALTER TABLE public.destinos 
    ADD CONSTRAINT fk_destinos_empresa_cliente 
    FOREIGN KEY (empresa_cliente_id) 
    REFERENCES public.empresas(id) 
    ON DELETE SET NULL;
    
    RAISE NOTICE '✅ Paso 4.1: FK destinos → empresas';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE '⚠️  FK ya existe';
END $$;

-- FK para planta_transportes
DO $$
BEGIN
    ALTER TABLE public.planta_transportes 
    ADD CONSTRAINT fk_planta_transportes_planta 
    FOREIGN KEY (planta_id) 
    REFERENCES public.empresas(id) 
    ON DELETE CASCADE;
    
    ALTER TABLE public.planta_transportes 
    ADD CONSTRAINT fk_planta_transportes_transporte 
    FOREIGN KEY (transporte_id) 
    REFERENCES public.empresas(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Paso 4.2: FK planta_transportes → empresas';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE '⚠️  FK ya existen';
END $$;

-- FK para planta_origenes
DO $$
BEGIN
    ALTER TABLE public.planta_origenes 
    ADD CONSTRAINT fk_planta_origenes_planta 
    FOREIGN KEY (planta_id) 
    REFERENCES public.empresas(id) 
    ON DELETE CASCADE;
    
    ALTER TABLE public.planta_origenes 
    ADD CONSTRAINT fk_planta_origenes_origen 
    FOREIGN KEY (origen_id) 
    REFERENCES public.origenes(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Paso 4.3: FK planta_origenes → empresas, origenes';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE '⚠️  FK ya existen';
END $$;

-- FK para planta_destinos
DO $$
BEGIN
    ALTER TABLE public.planta_destinos 
    ADD CONSTRAINT fk_planta_destinos_planta 
    FOREIGN KEY (planta_id) 
    REFERENCES public.empresas(id) 
    ON DELETE CASCADE;
    
    ALTER TABLE public.planta_destinos 
    ADD CONSTRAINT fk_planta_destinos_destino 
    FOREIGN KEY (destino_id) 
    REFERENCES public.destinos(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Paso 4.4: FK planta_destinos → empresas, destinos';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE '⚠️  FK ya existen';
END $$;

-- FK para ofertas_red_nodexia
DO $$
BEGIN
    ALTER TABLE public.ofertas_red_nodexia 
    ADD CONSTRAINT fk_ofertas_planta 
    FOREIGN KEY (planta_id) 
    REFERENCES public.empresas(id) 
    ON DELETE CASCADE;
    
    ALTER TABLE public.ofertas_red_nodexia 
    ADD CONSTRAINT fk_ofertas_transporte 
    FOREIGN KEY (transporte_tomador_id) 
    REFERENCES public.empresas(id) 
    ON DELETE SET NULL;
    
    RAISE NOTICE '✅ Paso 4.5: FK ofertas_red_nodexia → empresas';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE '⚠️  FK ya existen';
END $$;

-- FK para visualizaciones_ofertas
DO $$
BEGIN
    ALTER TABLE public.visualizaciones_ofertas 
    ADD CONSTRAINT fk_visualizaciones_oferta 
    FOREIGN KEY (oferta_id) 
    REFERENCES public.ofertas_red_nodexia(id) 
    ON DELETE CASCADE;
    
    ALTER TABLE public.visualizaciones_ofertas 
    ADD CONSTRAINT fk_visualizaciones_transporte 
    FOREIGN KEY (transporte_id) 
    REFERENCES public.empresas(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Paso 4.6: FK visualizaciones_ofertas → ofertas, empresas';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE '⚠️  FK ya existen';
END $$;

-- =============================================
-- PASO 5: CREAR ÍNDICES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_planta_transportes_planta ON public.planta_transportes(planta_id);
CREATE INDEX IF NOT EXISTS idx_planta_transportes_transporte ON public.planta_transportes(transporte_id);
CREATE INDEX IF NOT EXISTS idx_planta_origenes_planta ON public.planta_origenes(planta_id);
CREATE INDEX IF NOT EXISTS idx_planta_origenes_origen ON public.planta_origenes(origen_id);
CREATE INDEX IF NOT EXISTS idx_planta_destinos_planta ON public.planta_destinos(planta_id);
CREATE INDEX IF NOT EXISTS idx_planta_destinos_destino ON public.planta_destinos(destino_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_red_planta ON public.ofertas_red_nodexia(planta_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_red_estado ON public.ofertas_red_nodexia(estado);
CREATE INDEX IF NOT EXISTS idx_visualizaciones_oferta ON public.visualizaciones_ofertas(oferta_id);

DO $$
BEGIN
    RAISE NOTICE '✅ Paso 5: Índices creados';
END $$;

-- =============================================
-- PASO 6: HABILITAR RLS
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
    RAISE NOTICE '✅ Paso 6: RLS habilitado';
END $$;

-- =============================================
-- PASO 7: FUNCIONES
-- =============================================

CREATE OR REPLACE FUNCTION public.incrementar_visualizaciones(p_oferta_id UUID, p_transporte_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO public.visualizaciones_ofertas (oferta_id, transporte_id, user_id)
    VALUES (p_oferta_id, p_transporte_id, auth.uid())
    ON CONFLICT (oferta_id, transporte_id) DO NOTHING;
    
    UPDATE public.ofertas_red_nodexia
    SET visualizaciones = visualizaciones + 1
    WHERE id = p_oferta_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    RAISE NOTICE '✅ Paso 7: Funciones creadas';
END $$;

-- =============================================
-- VERIFICACIÓN FINAL
-- =============================================

DO $$
DECLARE
    v_empresas INTEGER;
    v_origenes INTEGER;
    v_destinos INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_empresas FROM public.empresas;
    SELECT COUNT(*) INTO v_origenes FROM public.origenes;
    SELECT COUNT(*) INTO v_destinos FROM public.destinos;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '✅ MIGRACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Empresas: %', v_empresas;
    RAISE NOTICE '📦 Orígenes: %', v_origenes;
    RAISE NOTICE '📍 Destinos: %', v_destinos;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Multi-rol: UNIQUE(user_id, empresa_id, rol_interno)';
    RAISE NOTICE '✅ Tipo empresa: planta, transporte, cliente';
    RAISE NOTICE '✅ 7 tablas nuevas creadas';
    RAISE NOTICE '✅ Foreign keys instaladas';
    RAISE NOTICE '✅ RLS habilitado';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Sistema listo';
    RAISE NOTICE '═══════════════════════════════════════════════';
END $$;
