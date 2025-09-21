-- Sistema de Administración Central (Super Admin)
-- Gestión de empresas, usuarios, suscripciones y pagos

-- 1. Tabla de planes de suscripción
CREATE TABLE IF NOT EXISTS public.planes_suscripcion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    precio_mensual DECIMAL(10,2),
    precio_anual DECIMAL(10,2),
    caracteristicas JSONB DEFAULT '{}',
    limites JSONB DEFAULT '{}', -- ej: {"max_usuarios": 10, "max_despachos": 100}
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar planes básicos
INSERT INTO public.planes_suscripcion (nombre, descripcion, precio_mensual, precio_anual, caracteristicas, limites) VALUES
('Gratuito', 'Plan básico gratuito', 0.00, 0.00, 
 '{"usuarios": "Hasta 3 usuarios", "despachos": "Hasta 50 despachos/mes", "soporte": "Email básico"}',
 '{"max_usuarios": 3, "max_despachos_mes": 50, "max_vehiculos": 5}'),
('Empresarial', 'Plan para empresas medianas', 99.99, 999.99,
 '{"usuarios": "Hasta 20 usuarios", "despachos": "Despachos ilimitados", "soporte": "Soporte prioritario", "reportes": "Reportes avanzados"}',
 '{"max_usuarios": 20, "max_despachos_mes": -1, "max_vehiculos": 50}'),
('Premium', 'Plan premium para empresas grandes', 299.99, 2999.99,
 '{"usuarios": "Usuarios ilimitados", "despachos": "Despachos ilimitados", "soporte": "Soporte 24/7", "reportes": "Reportes avanzados", "api": "Acceso API completo"}',
 '{"max_usuarios": -1, "max_despachos_mes": -1, "max_vehiculos": -1}')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Tabla de suscripciones de empresas
CREATE TABLE IF NOT EXISTS public.suscripciones_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) NOT NULL,
    plan_id UUID REFERENCES public.planes_suscripcion(id) NOT NULL,
    estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa', 'suspendida', 'cancelada', 'vencida')),
    fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
    fecha_fin TIMESTAMPTZ,
    precio_pagado DECIMAL(10,2),
    periodo TEXT DEFAULT 'mensual' CHECK (periodo IN ('mensual', 'anual')),
    renovacion_automatica BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
    creado_por UUID REFERENCES auth.users(id),
    notas TEXT
);

-- 3. Tabla de pagos
CREATE TABLE IF NOT EXISTS public.pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suscripcion_id UUID REFERENCES public.suscripciones_empresa(id) NOT NULL,
    empresa_id UUID REFERENCES public.empresas(id) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    moneda TEXT DEFAULT 'ARS',
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'fallido', 'reembolsado')),
    metodo_pago TEXT, -- tarjeta, transferencia, efectivo, etc.
    referencia_externa TEXT, -- ID de MercadoPago, Stripe, etc.
    fecha_vencimiento TIMESTAMPTZ,
    fecha_pago TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
    procesado_por UUID REFERENCES auth.users(id),
    detalles JSONB DEFAULT '{}',
    notas TEXT
);

-- 4. Tabla de super administradores
CREATE TABLE IF NOT EXISTS public.super_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
    nombre_completo TEXT NOT NULL,
    permisos JSONB DEFAULT '{}',
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
    creado_por UUID REFERENCES auth.users(id)
);

-- 5. Tabla de configuración global del sistema
CREATE TABLE IF NOT EXISTS public.configuracion_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave TEXT UNIQUE NOT NULL,
    valor JSONB NOT NULL,
    descripcion TEXT,
    categoria TEXT DEFAULT 'general',
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
    actualizado_por UUID REFERENCES auth.users(id)
);

-- Insertar configuraciones básicas
INSERT INTO public.configuracion_sistema (clave, valor, descripcion, categoria) VALUES
('mantenimiento_activo', 'false', 'Indica si el sistema está en mantenimiento', 'sistema'),
('registros_abiertos', 'true', 'Permite registro de nuevas empresas', 'registro'),
('limite_empresas_gratuitas', '100', 'Límite de empresas con plan gratuito', 'limites'),
('dias_gracia_pago', '7', 'Días de gracia después del vencimiento', 'pagos'),
('email_soporte', '"soporte@nodexia.com"', 'Email de soporte técnico', 'contacto'),
('version_sistema', '"1.0.0"', 'Versión actual del sistema', 'sistema')
ON CONFLICT (clave) DO NOTHING;

-- 6. Tabla de logs de administración
CREATE TABLE IF NOT EXISTS public.logs_admin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) NOT NULL,
    accion TEXT NOT NULL,
    entidad_tipo TEXT NOT NULL, -- empresa, usuario, suscripcion, pago
    entidad_id UUID,
    detalles JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS suscripciones_empresa_empresa_id_idx ON public.suscripciones_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS suscripciones_empresa_estado_idx ON public.suscripciones_empresa(estado);
CREATE INDEX IF NOT EXISTS suscripciones_empresa_fecha_fin_idx ON public.suscripciones_empresa(fecha_fin);
CREATE INDEX IF NOT EXISTS pagos_empresa_id_idx ON public.pagos(empresa_id);
CREATE INDEX IF NOT EXISTS pagos_estado_idx ON public.pagos(estado);
CREATE INDEX IF NOT EXISTS pagos_fecha_vencimiento_idx ON public.pagos(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS logs_admin_admin_id_idx ON public.logs_admin(admin_id);
CREATE INDEX IF NOT EXISTS logs_admin_fecha_idx ON public.logs_admin(fecha_creacion);
CREATE INDEX IF NOT EXISTS logs_admin_entidad_idx ON public.logs_admin(entidad_tipo, entidad_id);