-- Super Admin System Setup
-- This script creates the complete structure for super administration

-- ==========================================
-- STEP 1: Create tables for super admin system
-- ==========================================

-- Planes de suscripción
CREATE TABLE IF NOT EXISTS planes_suscripcion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    precio_mensual DECIMAL(10,2) NOT NULL DEFAULT 0,
    precio_anual DECIMAL(10,2),
    limite_usuarios INTEGER DEFAULT NULL, -- NULL = ilimitado
    limite_despachos INTEGER DEFAULT NULL, -- NULL = ilimitado
    caracteristicas JSONB,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suscripciones de empresas
CREATE TABLE IF NOT EXISTS suscripciones_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES planes_suscripcion(id),
    estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'suspendida', 'cancelada', 'vencida')),
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin DATE,
    proximo_pago DATE,
    monto_mensual DECIMAL(10,2) NOT NULL,
    ciclo_facturacion TEXT DEFAULT 'mensual' CHECK (ciclo_facturacion IN ('mensual', 'anual')),
    usuarios_actuales INTEGER DEFAULT 0,
    despachos_mes_actual INTEGER DEFAULT 0,
    auto_renovar BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(empresa_id) -- Una empresa solo puede tener una suscripción activa
);

-- Pagos de empresas
CREATE TABLE IF NOT EXISTS pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    suscripcion_id UUID REFERENCES suscripciones_empresa(id),
    monto DECIMAL(10,2) NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completado', 'fallido', 'cancelado')),
    metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('transferencia', 'tarjeta', 'efectivo', 'cheque', 'mercadopago')),
    referencia_externa TEXT,
    fecha_pago TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    fecha_procesamiento TIMESTAMP WITH TIME ZONE,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Super administradores
CREATE TABLE IF NOT EXISTS super_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nombre_completo TEXT NOT NULL,
    activo BOOLEAN DEFAULT true,
    permisos JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(user_id)
);

-- Configuración del sistema
CREATE TABLE IF NOT EXISTS configuracion_sistema (
    clave TEXT PRIMARY KEY,
    valor JSONB NOT NULL,
    descripcion TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Logs de auditoría para super admin
CREATE TABLE IF NOT EXISTS logs_admin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    admin_email TEXT NOT NULL,
    accion TEXT NOT NULL,
    empresa_afectada TEXT,
    usuario_afectado TEXT,
    detalles_cambios JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    observaciones TEXT
);

-- ==========================================
-- STEP 2: Insert default data
-- ==========================================

-- Insertar planes por defecto
INSERT INTO planes_suscripcion (nombre, descripcion, precio_mensual, precio_anual, limite_usuarios, limite_despachos, caracteristicas) 
VALUES 
(
    'Gratuito',
    'Plan básico para pequeñas empresas',
    0,
    0,
    2,
    50,
    '["Gestión básica de despachos", "2 usuarios", "50 despachos/mes", "Soporte por email"]'::jsonb
),
(
    'Empresarial',
    'Plan ideal para empresas medianas',
    15000,
    150000,
    10,
    500,
    '["Gestión completa", "10 usuarios", "500 despachos/mes", "Red de empresas", "Soporte prioritario", "Reportes avanzados"]'::jsonb
),
(
    'Premium',
    'Plan para grandes empresas',
    30000,
    300000,
    NULL,
    NULL,
    '["Sin límites", "Usuarios ilimitados", "Despachos ilimitados", "API personalizada", "Soporte 24/7", "Integración personalizada"]'::jsonb
)
ON CONFLICT (nombre) DO NOTHING;

-- Configuración inicial del sistema
INSERT INTO configuracion_sistema (clave, valor, descripcion)
VALUES 
('version_sistema', '"1.0.0"', 'Versión actual del sistema'),
('mantenimiento', 'false', 'Indica si el sistema está en mantenimiento'),
('registro_empresas_abierto', 'true', 'Permite el registro libre de nuevas empresas'),
('limite_usuarios_por_defecto', '5', 'Límite de usuarios por empresa si no tiene plan'),
('limite_despachos_por_defecto', '100', 'Límite de despachos por mes si no tiene plan')
ON CONFLICT (clave) DO NOTHING;

-- ==========================================
-- STEP 3: Create functions
-- ==========================================

-- Función para verificar si un usuario es super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar si el usuario actual está en la tabla super_admins
    RETURN EXISTS (
        SELECT 1 
        FROM super_admins 
        WHERE user_id = auth.uid() 
        AND activo = true
    );
END;
$$;

-- Función para obtener empresas (solo para super admins)
CREATE OR REPLACE FUNCTION get_empresas_admin(
    filtro_tipo TEXT DEFAULT NULL,
    filtro_estado_suscripcion TEXT DEFAULT NULL,
    filtro_busqueda TEXT DEFAULT NULL
)
RETURNS TABLE (
    empresa_id UUID,
    nombre TEXT,
    cuit TEXT,
    email TEXT,
    telefono TEXT,
    direccion TEXT,
    tipo_empresa TEXT,
    activa BOOLEAN,
    plan_actual TEXT,
    estado_suscripcion TEXT,
    total_usuarios BIGINT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar que el usuario sea super admin
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: No tienes permisos de super administrador';
    END IF;

    RETURN QUERY
    SELECT 
        e.id as empresa_id,
        e.nombre,
        e.cuit,
        e.email,
        e.telefono,
        e.direccion,
        e.tipo_empresa,
        e.activa,
        p.nombre as plan_actual,
        COALESCE(s.estado, 'sin_plan') as estado_suscripcion,
        COUNT(ue.id) as total_usuarios,
        e.created_at
    FROM empresas e
    LEFT JOIN suscripciones_empresa s ON e.id = s.empresa_id
    LEFT JOIN planes_suscripcion p ON s.plan_id = p.id
    LEFT JOIN usuarios_empresa ue ON e.id = ue.empresa_id
    WHERE 
        (filtro_tipo IS NULL OR e.tipo_empresa = filtro_tipo)
        AND (filtro_estado_suscripcion IS NULL OR COALESCE(s.estado, 'sin_plan') = filtro_estado_suscripcion)
        AND (filtro_busqueda IS NULL OR 
             e.nombre ILIKE '%' || filtro_busqueda || '%' OR
             e.cuit ILIKE '%' || filtro_busqueda || '%' OR
             e.email ILIKE '%' || filtro_busqueda || '%')
    GROUP BY e.id, e.nombre, e.cuit, e.email, e.telefono, e.direccion, e.tipo_empresa, e.activa, p.nombre, s.estado, e.created_at
    ORDER BY e.created_at DESC;
END;
$$;

-- Función para crear empresa (solo super admins)
CREATE OR REPLACE FUNCTION crear_empresa_admin(
    p_nombre TEXT,
    p_cuit TEXT,
    p_tipo_empresa TEXT,
    p_email TEXT DEFAULT NULL,
    p_telefono TEXT DEFAULT NULL,
    p_direccion TEXT DEFAULT NULL,
    p_admin_email TEXT,
    p_admin_nombre TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    nueva_empresa_id UUID;
    nuevo_usuario_id UUID;
    resultado JSON;
BEGIN
    -- Verificar que el usuario sea super admin
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: No tienes permisos de super administrador';
    END IF;

    -- Validar que no exista una empresa con el mismo CUIT
    IF EXISTS (SELECT 1 FROM empresas WHERE cuit = p_cuit) THEN
        RAISE EXCEPTION 'Ya existe una empresa con el CUIT: %', p_cuit;
    END IF;

    -- Crear la empresa
    INSERT INTO empresas (nombre, cuit, tipo_empresa, email, telefono, direccion, activa)
    VALUES (p_nombre, p_cuit, p_tipo_empresa, p_email, p_telefono, p_direccion, true)
    RETURNING id INTO nueva_empresa_id;

    -- Crear usuario administrador usando auth.users (simulado)
    -- En un entorno real, esto requeriría integración con el sistema de autenticación
    INSERT INTO auth.users (email, raw_user_meta_data)
    VALUES (p_admin_email, jsonb_build_object('nombre_completo', p_admin_nombre))
    RETURNING id INTO nuevo_usuario_id;

    -- Asignar el usuario como admin de la empresa
    INSERT INTO usuarios_empresa (user_id, empresa_id, rol, activo, email, nombre_completo)
    VALUES (nuevo_usuario_id, nueva_empresa_id, 'admin', true, p_admin_email, p_admin_nombre);

    -- Asignar plan gratuito por defecto
    INSERT INTO suscripciones_empresa (empresa_id, plan_id, monto_mensual)
    SELECT nueva_empresa_id, id, 0
    FROM planes_suscripcion 
    WHERE nombre = 'Gratuito';

    -- Log de auditoría
    INSERT INTO logs_admin (admin_id, admin_email, accion, empresa_afectada, detalles_cambios)
    VALUES (
        auth.uid(),
        (SELECT email FROM auth.users WHERE id = auth.uid()),
        'crear_empresa',
        p_nombre,
        jsonb_build_object(
            'empresa_id', nueva_empresa_id,
            'cuit', p_cuit,
            'tipo_empresa', p_tipo_empresa,
            'admin_email', p_admin_email
        )
    );

    resultado := jsonb_build_object(
        'success', true,
        'empresa_id', nueva_empresa_id,
        'usuario_id', nuevo_usuario_id,
        'message', 'Empresa creada exitosamente'
    );

    RETURN resultado;
END;
$$;

-- Función para cambiar plan de empresa
CREATE OR REPLACE FUNCTION cambiar_plan_empresa(
    p_empresa_id UUID,
    p_plan_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    plan_anterior TEXT;
    plan_nuevo TEXT;
    resultado JSON;
BEGIN
    -- Verificar que el usuario sea super admin
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: No tienes permisos de super administrador';
    END IF;

    -- Obtener nombre del plan anterior
    SELECT p.nombre INTO plan_anterior
    FROM suscripciones_empresa s
    JOIN planes_suscripcion p ON s.plan_id = p.id
    WHERE s.empresa_id = p_empresa_id;

    -- Obtener nombre del plan nuevo
    SELECT nombre INTO plan_nuevo FROM planes_suscripcion WHERE id = p_plan_id;

    -- Actualizar o crear suscripción
    INSERT INTO suscripciones_empresa (empresa_id, plan_id, monto_mensual, estado)
    SELECT p_empresa_id, p_plan_id, precio_mensual, 'activa'
    FROM planes_suscripcion 
    WHERE id = p_plan_id
    ON CONFLICT (empresa_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        monto_mensual = EXCLUDED.monto_mensual,
        estado = EXCLUDED.estado,
        updated_at = NOW();

    -- Log de auditoría
    INSERT INTO logs_admin (admin_id, admin_email, accion, empresa_afectada, detalles_cambios)
    VALUES (
        auth.uid(),
        (SELECT email FROM auth.users WHERE id = auth.uid()),
        'cambiar_plan',
        (SELECT nombre FROM empresas WHERE id = p_empresa_id),
        jsonb_build_object(
            'empresa_id', p_empresa_id,
            'plan_anterior', COALESCE(plan_anterior, 'sin_plan'),
            'plan_nuevo', plan_nuevo
        )
    );

    resultado := jsonb_build_object(
        'success', true,
        'message', 'Plan cambiado exitosamente'
    );

    RETURN resultado;
END;
$$;

-- Función para obtener estadísticas del sistema
CREATE OR REPLACE FUNCTION get_estadisticas_sistema()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    estadisticas JSON;
BEGIN
    -- Verificar que el usuario sea super admin
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: No tienes permisos de super administrador';
    END IF;

    SELECT jsonb_build_object(
        'total_empresas', (SELECT COUNT(*) FROM empresas),
        'empresas_activas', (SELECT COUNT(*) FROM empresas WHERE activa = true),
        'empresas_inactivas', (SELECT COUNT(*) FROM empresas WHERE activa = false),
        'empresas_transporte', (SELECT COUNT(*) FROM empresas WHERE tipo_empresa = 'transporte'),
        'empresas_coordinador', (SELECT COUNT(*) FROM empresas WHERE tipo_empresa = 'coordinador'),
        'total_usuarios', (SELECT COUNT(*) FROM usuarios_empresa),
        'suscripciones_activas', (SELECT COUNT(*) FROM suscripciones_empresa WHERE estado = 'activa'),
        'ingresos_mes_actual', (
            SELECT COALESCE(SUM(monto), 0) 
            FROM pagos 
            WHERE estado = 'completado' 
            AND DATE_TRUNC('month', fecha_pago) = DATE_TRUNC('month', CURRENT_DATE)
        ),
        'pagos_pendientes', (SELECT COUNT(*) FROM pagos WHERE estado = 'pendiente')
    ) INTO estadisticas;

    RETURN estadisticas;
END;
$$;

-- ==========================================
-- STEP 4: Create RLS policies
-- ==========================================

-- Habilitar RLS en todas las tablas
ALTER TABLE planes_suscripcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE suscripciones_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_admin ENABLE ROW LEVEL SECURITY;

-- Políticas para planes_suscripcion
CREATE POLICY "Super admins can manage subscription plans" ON planes_suscripcion
    FOR ALL USING (is_super_admin());

CREATE POLICY "Users can view active subscription plans" ON planes_suscripcion
    FOR SELECT USING (activo = true);

-- Políticas para suscripciones_empresa
CREATE POLICY "Super admins can manage company subscriptions" ON suscripciones_empresa
    FOR ALL USING (is_super_admin());

CREATE POLICY "Company admins can view their subscription" ON suscripciones_empresa
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM usuarios_empresa ue
            WHERE ue.empresa_id = suscripciones_empresa.empresa_id
            AND ue.user_id = auth.uid()
            AND ue.rol = 'admin'
            AND ue.activo = true
        )
    );

-- Políticas para pagos
CREATE POLICY "Super admins can manage all payments" ON pagos
    FOR ALL USING (is_super_admin());

CREATE POLICY "Company admins can view their payments" ON pagos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM usuarios_empresa ue
            WHERE ue.empresa_id = pagos.empresa_id
            AND ue.user_id = auth.uid()
            AND ue.rol = 'admin'
            AND ue.activo = true
        )
    );

-- Políticas para super_admins
CREATE POLICY "Super admins can manage super admin records" ON super_admins
    FOR ALL USING (is_super_admin());

-- Políticas para configuracion_sistema
CREATE POLICY "Super admins can manage system configuration" ON configuracion_sistema
    FOR ALL USING (is_super_admin());

CREATE POLICY "Users can view public system configuration" ON configuracion_sistema
    FOR SELECT USING (clave IN ('version_sistema', 'mantenimiento'));

-- Políticas para logs_admin
CREATE POLICY "Super admins can view audit logs" ON logs_admin
    FOR SELECT USING (is_super_admin());

CREATE POLICY "System can insert audit logs" ON logs_admin
    FOR INSERT WITH CHECK (true);

-- ==========================================
-- STEP 5: Create indexes for performance
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_suscripciones_empresa_id ON suscripciones_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_suscripciones_plan_id ON suscripciones_empresa(plan_id);
CREATE INDEX IF NOT EXISTS idx_pagos_empresa_id ON pagos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos(estado);
CREATE INDEX IF NOT EXISTS idx_super_admins_user_id ON super_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_admin_timestamp ON logs_admin(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_admin_accion ON logs_admin(accion);

-- ==========================================
-- STEP 6: Create triggers for audit logging
-- ==========================================

-- Función para actualizar timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar timestamps
CREATE TRIGGER trigger_update_planes_suscripcion_updated_at
    BEFORE UPDATE ON planes_suscripcion
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_update_suscripciones_empresa_updated_at
    BEFORE UPDATE ON suscripciones_empresa
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_update_configuracion_sistema_updated_at
    BEFORE UPDATE ON configuracion_sistema
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- SUPER ADMIN SETUP COMPLETE
-- ==========================================