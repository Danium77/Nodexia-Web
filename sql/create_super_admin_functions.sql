-- Funciones para Super Administración

-- Función para verificar si un usuario es super admin
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.super_admins 
        WHERE user_id = p_user_id AND activo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener todas las empresas con información de suscripción
CREATE OR REPLACE FUNCTION get_empresas_admin()
RETURNS TABLE (
    empresa_id UUID,
    nombre TEXT,
    cuit TEXT,
    tipo_empresa TEXT,
    email TEXT,
    activa BOOLEAN,
    fecha_creacion TIMESTAMPTZ,
    plan_actual TEXT,
    estado_suscripcion TEXT,
    fecha_fin_suscripcion TIMESTAMPTZ,
    total_usuarios INTEGER,
    ultimo_pago TIMESTAMPTZ
) AS $$
BEGIN
    -- Verificar que sea super admin
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requieren permisos de super administrador';
    END IF;
    
    RETURN QUERY
    SELECT 
        e.id,
        e.nombre,
        e.cuit,
        e.tipo_empresa,
        e.email,
        e.activa,
        e.fecha_creacion,
        COALESCE(ps.nombre, 'Sin plan') as plan_actual,
        COALESCE(se.estado, 'sin_suscripcion') as estado_suscripcion,
        se.fecha_fin,
        COALESCE(usuario_count.total, 0) as total_usuarios,
        ultimo_pago.fecha_pago
    FROM public.empresas e
    LEFT JOIN public.suscripciones_empresa se ON e.id = se.empresa_id 
        AND se.estado = 'activa'
    LEFT JOIN public.planes_suscripcion ps ON se.plan_id = ps.id
    LEFT JOIN (
        SELECT empresa_id, COUNT(*) as total
        FROM public.usuarios_empresa 
        WHERE activo = true
        GROUP BY empresa_id
    ) usuario_count ON e.id = usuario_count.empresa_id
    LEFT JOIN (
        SELECT DISTINCT ON (empresa_id) empresa_id, fecha_pago
        FROM public.pagos 
        WHERE estado = 'pagado'
        ORDER BY empresa_id, fecha_pago DESC
    ) ultimo_pago ON e.id = ultimo_pago.empresa_id
    ORDER BY e.fecha_creacion DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear una nueva empresa desde super admin
CREATE OR REPLACE FUNCTION crear_empresa_admin(
    p_nombre TEXT,
    p_cuit TEXT,
    p_tipo_empresa TEXT,
    p_email TEXT,
    p_telefono TEXT DEFAULT NULL,
    p_direccion TEXT DEFAULT NULL,
    p_admin_email TEXT,
    p_admin_nombre TEXT,
    p_plan_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    nueva_empresa_id UUID;
    admin_user_id UUID;
    suscripcion_id UUID;
    plan_gratuito_id UUID;
BEGIN
    -- Verificar que sea super admin
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requieren permisos de super administrador';
    END IF;
    
    -- Buscar usuario admin por email
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = p_admin_email;
    
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario con email % no encontrado', p_admin_email;
    END IF;
    
    -- Crear empresa
    INSERT INTO public.empresas (
        nombre, cuit, tipo_empresa, email, telefono, direccion, usuario_admin
    ) VALUES (
        p_nombre, p_cuit, p_tipo_empresa, p_email, p_telefono, p_direccion, admin_user_id
    ) RETURNING id INTO nueva_empresa_id;
    
    -- Asociar usuario admin a la empresa
    INSERT INTO public.usuarios_empresa (
        user_id, empresa_id, rol_interno, nombre_completo, email_interno, vinculado_por
    ) VALUES (
        admin_user_id, nueva_empresa_id, 'admin', p_admin_nombre, p_admin_email, auth.uid()
    );
    
    -- Asignar plan (gratuito por defecto)
    IF p_plan_id IS NULL THEN
        SELECT id INTO plan_gratuito_id 
        FROM public.planes_suscripcion 
        WHERE nombre = 'Gratuito' 
        LIMIT 1;
        p_plan_id := plan_gratuito_id;
    END IF;
    
    IF p_plan_id IS NOT NULL THEN
        INSERT INTO public.suscripciones_empresa (
            empresa_id, plan_id, estado, precio_pagado, creado_por
        ) VALUES (
            nueva_empresa_id, p_plan_id, 'activa', 0.00, auth.uid()
        ) RETURNING id INTO suscripcion_id;
    END IF;
    
    -- Log de la acción
    INSERT INTO public.logs_admin (
        admin_id, accion, entidad_tipo, entidad_id, detalles
    ) VALUES (
        auth.uid(), 'crear_empresa', 'empresa', nueva_empresa_id,
        jsonb_build_object(
            'nombre', p_nombre,
            'tipo', p_tipo_empresa,
            'admin_email', p_admin_email,
            'plan_asignado', p_plan_id
        )
    );
    
    RETURN nueva_empresa_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar estado de empresa
CREATE OR REPLACE FUNCTION actualizar_estado_empresa(
    p_empresa_id UUID,
    p_activa BOOLEAN,
    p_motivo TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verificar que sea super admin
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requieren permisos de super administrador';
    END IF;
    
    UPDATE public.empresas 
    SET activa = p_activa
    WHERE id = p_empresa_id;
    
    -- Log de la acción
    INSERT INTO public.logs_admin (
        admin_id, accion, entidad_tipo, entidad_id, detalles
    ) VALUES (
        auth.uid(), 
        CASE WHEN p_activa THEN 'activar_empresa' ELSE 'desactivar_empresa' END,
        'empresa', 
        p_empresa_id,
        jsonb_build_object('motivo', p_motivo)
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para cambiar plan de empresa
CREATE OR REPLACE FUNCTION cambiar_plan_empresa(
    p_empresa_id UUID,
    p_nuevo_plan_id UUID,
    p_periodo TEXT DEFAULT 'mensual'
)
RETURNS UUID AS $$
DECLARE
    suscripcion_id UUID;
    plan_precio DECIMAL;
BEGIN
    -- Verificar que sea super admin
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requieren permisos de super administrador';
    END IF;
    
    -- Obtener precio del plan
    SELECT 
        CASE WHEN p_periodo = 'anual' THEN precio_anual ELSE precio_mensual END
    INTO plan_precio
    FROM public.planes_suscripcion 
    WHERE id = p_nuevo_plan_id;
    
    -- Finalizar suscripción actual
    UPDATE public.suscripciones_empresa 
    SET estado = 'cancelada', fecha_fin = NOW()
    WHERE empresa_id = p_empresa_id AND estado = 'activa';
    
    -- Crear nueva suscripción
    INSERT INTO public.suscripciones_empresa (
        empresa_id, plan_id, estado, precio_pagado, periodo, creado_por
    ) VALUES (
        p_empresa_id, p_nuevo_plan_id, 'activa', plan_precio, p_periodo, auth.uid()
    ) RETURNING id INTO suscripcion_id;
    
    -- Log de la acción
    INSERT INTO public.logs_admin (
        admin_id, accion, entidad_tipo, entidad_id, detalles
    ) VALUES (
        auth.uid(), 'cambiar_plan', 'suscripcion', suscripcion_id,
        jsonb_build_object(
            'empresa_id', p_empresa_id,
            'nuevo_plan_id', p_nuevo_plan_id,
            'periodo', p_periodo,
            'precio', plan_precio
        )
    );
    
    RETURN suscripcion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas del sistema
CREATE OR REPLACE FUNCTION get_estadisticas_sistema()
RETURNS TABLE (
    total_empresas INTEGER,
    empresas_activas INTEGER,
    empresas_inactivas INTEGER,
    empresas_transporte INTEGER,
    empresas_coordinador INTEGER,
    total_usuarios INTEGER,
    suscripciones_activas INTEGER,
    ingresos_mes_actual DECIMAL,
    pagos_pendientes INTEGER
) AS $$
BEGIN
    -- Verificar que sea super admin
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requieren permisos de super administrador';
    END IF;
    
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM public.empresas),
        (SELECT COUNT(*)::INTEGER FROM public.empresas WHERE activa = true),
        (SELECT COUNT(*)::INTEGER FROM public.empresas WHERE activa = false),
        (SELECT COUNT(*)::INTEGER FROM public.empresas WHERE tipo_empresa = 'transporte'),
        (SELECT COUNT(*)::INTEGER FROM public.empresas WHERE tipo_empresa = 'coordinador'),
        (SELECT COUNT(*)::INTEGER FROM public.usuarios_empresa WHERE activo = true),
        (SELECT COUNT(*)::INTEGER FROM public.suscripciones_empresa WHERE estado = 'activa'),
        (SELECT COALESCE(SUM(monto), 0) FROM public.pagos 
         WHERE estado = 'pagado' 
         AND DATE_TRUNC('month', fecha_pago) = DATE_TRUNC('month', NOW())),
        (SELECT COUNT(*)::INTEGER FROM public.pagos WHERE estado = 'pendiente');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener logs de administración
CREATE OR REPLACE FUNCTION get_logs_admin(
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0,
    p_admin_id UUID DEFAULT NULL,
    p_fecha_desde TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    admin_email TEXT,
    accion TEXT,
    entidad_tipo TEXT,
    entidad_id UUID,
    detalles JSONB,
    fecha_creacion TIMESTAMPTZ
) AS $$
BEGIN
    -- Verificar que sea super admin
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requieren permisos de super administrador';
    END IF;
    
    RETURN QUERY
    SELECT 
        l.id,
        u.email,
        l.accion,
        l.entidad_tipo,
        l.entidad_id,
        l.detalles,
        l.fecha_creacion
    FROM public.logs_admin l
    INNER JOIN auth.users u ON l.admin_id = u.id
    WHERE (p_admin_id IS NULL OR l.admin_id = p_admin_id)
    AND (p_fecha_desde IS NULL OR l.fecha_creacion >= p_fecha_desde)
    ORDER BY l.fecha_creacion DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;