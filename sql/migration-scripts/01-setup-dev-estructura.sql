-- ===========================================
-- SETUP DEV: Estructura REAL de Producción
-- ===========================================
-- Ejecutar PRIMERO en Supabase DEV
-- Antes de importar los datos
-- ===========================================

-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. EMPRESAS
-- =============================================
CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre CHARACTER VARYING NOT NULL,
  cuit TEXT,
  email CHARACTER VARYING,
  telefono TEXT,
  direccion TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  tipo_empresa TEXT DEFAULT 'planta',
  localidad TEXT,
  provincia TEXT,
  fecha_creacion TIMESTAMPTZ,
  usuario_admin UUID,
  plan_suscripcion_id UUID,
  tipo_ecosistema_id UUID,
  fecha_suscripcion TIMESTAMPTZ,
  estado_suscripcion CHARACTER VARYING,
  configuracion_empresa JSONB,
  activo BOOLEAN DEFAULT true,
  notas TEXT
);

CREATE INDEX IF NOT EXISTS idx_empresas_tipo ON public.empresas(tipo_empresa);
CREATE INDEX IF NOT EXISTS idx_empresas_cuit ON public.empresas(cuit);

-- =============================================
-- 2. RELACIONES_EMPRESAS
-- =============================================
CREATE TABLE IF NOT EXISTS public.relaciones_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_cliente_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  empresa_transporte_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  estado TEXT DEFAULT 'activa',
  fecha_inicio TIMESTAMPTZ DEFAULT now(),
  fecha_fin TIMESTAMPTZ,
  condiciones TEXT
);

CREATE INDEX IF NOT EXISTS idx_relaciones_cliente ON public.relaciones_empresas(empresa_cliente_id);
CREATE INDEX IF NOT EXISTS idx_relaciones_transporte ON public.relaciones_empresas(empresa_transporte_id);

-- =============================================
-- 3. CAMIONES
-- =============================================
CREATE TABLE IF NOT EXISTS public.camiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patente TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  anio INTEGER,
  foto_url TEXT,
  id_transporte UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  fecha_alta TIMESTAMPTZ DEFAULT now(),
  usuario_alta UUID
);

CREATE INDEX IF NOT EXISTS idx_camiones_transporte ON public.camiones(id_transporte);
CREATE INDEX IF NOT EXISTS idx_camiones_patente ON public.camiones(patente);

-- =============================================
-- 4. ACOPLADOS
-- =============================================
CREATE TABLE IF NOT EXISTS public.acoplados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patente TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  anio INTEGER,
  foto_url TEXT,
  id_transporte UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  fecha_alta TIMESTAMPTZ DEFAULT now(),
  usuario_alta UUID
);

CREATE INDEX IF NOT EXISTS idx_acoplados_transporte ON public.acoplados(id_transporte);
CREATE INDEX IF NOT EXISTS idx_acoplados_patente ON public.acoplados(patente);

-- =============================================
-- 5. CHOFERES
-- =============================================
CREATE TABLE IF NOT EXISTS public.choferes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  dni TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  foto_url TEXT,
  id_transporte UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  fecha_alta TIMESTAMPTZ DEFAULT now(),
  usuario_alta UUID,
  user_id UUID,
  usuario_id UUID
);

CREATE INDEX IF NOT EXISTS idx_choferes_transporte ON public.choferes(id_transporte);
CREATE INDEX IF NOT EXISTS idx_choferes_dni ON public.choferes(dni);

-- =============================================
-- 6. VIAJES_DESPACHO
-- =============================================
CREATE TABLE IF NOT EXISTS public.viajes_despacho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  despacho_id UUID,
  numero_viaje INTEGER,
  id_transporte UUID REFERENCES public.empresas(id),
  id_camion UUID REFERENCES public.camiones(id),
  id_acoplado UUID REFERENCES public.acoplados(id),
  id_chofer UUID REFERENCES public.choferes(id),
  estado TEXT DEFAULT 'pendiente',
  fecha_creacion TIMESTAMPTZ DEFAULT now(),
  fecha_asignacion_transporte TIMESTAMPTZ,
  fecha_asignacion_camion TIMESTAMPTZ,
  fecha_confirmacion_chofer TIMESTAMPTZ,
  fecha_ingreso_planta TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_viajes_transporte ON public.viajes_despacho(id_transporte);
CREATE INDEX IF NOT EXISTS idx_viajes_estado ON public.viajes_despacho(estado);

-- =============================================
-- 7. FUNCIÓN REPROGRAMAR VIAJE
-- =============================================
CREATE OR REPLACE FUNCTION reprogramar_viaje(
  p_viaje_id UUID,
  p_nueva_fecha DATE
)
RETURNS JSONB AS $$
DECLARE
  v_resultado JSONB;
BEGIN
  UPDATE public.viajes_despacho
  SET 
    fecha_creacion = p_nueva_fecha::timestamptz,
    estado = 'pendiente',
    id_transporte = NULL,
    id_camion = NULL,
    id_acoplado = NULL,
    id_chofer = NULL,
    fecha_asignacion_transporte = NULL,
    fecha_asignacion_camion = NULL,
    fecha_confirmacion_chofer = NULL
  WHERE id = p_viaje_id;
  
  v_resultado := jsonb_build_object(
    'success', true,
    'message', 'Viaje reprogramado exitosamente'
  );
  
  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. DESHABILITAR RLS TEMPORALMENTE (para importar datos)
-- =============================================
ALTER TABLE public.empresas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.relaciones_empresas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.camiones DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.acoplados DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.choferes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.viajes_despacho DISABLE ROW LEVEL SECURITY;

SELECT 'Setup DEV completado - Ahora importa los datos' as status;
