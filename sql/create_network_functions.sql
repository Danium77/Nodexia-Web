-- Funciones auxiliares para la red de empresas

-- Función para validar que un rol sea válido para un tipo de empresa
CREATE OR REPLACE FUNCTION validar_rol_empresa(p_rol TEXT, p_tipo_empresa TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.roles_empresa 
        WHERE nombre_rol = p_rol 
        AND (tipo_empresa = p_tipo_empresa OR tipo_empresa = 'ambos')
        AND activo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener permisos de un usuario
CREATE OR REPLACE FUNCTION get_user_permisos()
RETURNS JSONB AS $$
DECLARE
    mi_empresa_id UUID;
    mi_rol TEXT;
    mi_tipo_empresa TEXT;
    permisos_rol JSONB;
BEGIN
    -- Obtener empresa y rol del usuario
    SELECT ue.empresa_id, ue.rol_interno, e.tipo_empresa
    INTO mi_empresa_id, mi_rol, mi_tipo_empresa
    FROM public.usuarios_empresa ue
    INNER JOIN public.empresas e ON ue.empresa_id = e.id
    WHERE ue.user_id = auth.uid() 
    AND ue.activo = true
    LIMIT 1;
    
    IF mi_empresa_id IS NULL THEN
        RETURN '{}'::jsonb;
    END IF;
    
    -- Obtener permisos del rol
    SELECT permisos INTO permisos_rol
    FROM public.roles_empresa 
    WHERE nombre_rol = mi_rol 
    AND (tipo_empresa = mi_tipo_empresa OR tipo_empresa = 'ambos')
    AND activo = true
    LIMIT 1;
    
    RETURN COALESCE(permisos_rol, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario tiene un permiso específico
CREATE OR REPLACE FUNCTION user_has_permission(p_permiso TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    permisos JSONB;
BEGIN
    permisos := get_user_permisos();
    RETURN COALESCE((permisos->>p_permiso)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener roles disponibles para un tipo de empresa
CREATE OR REPLACE FUNCTION get_roles_disponibles(p_tipo_empresa TEXT)
RETURNS TABLE (
    nombre_rol TEXT,
    descripcion TEXT,
    permisos JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        re.nombre_rol,
        re.descripcion,
        re.permisos
    FROM public.roles_empresa re
    WHERE (re.tipo_empresa = p_tipo_empresa OR re.tipo_empresa = 'ambos')
    AND re.activo = true
    ORDER BY re.nombre_rol;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener usuarios de mi empresa
CREATE OR REPLACE FUNCTION get_usuarios_mi_empresa()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    nombre_completo TEXT,
    email_interno TEXT,
    telefono_interno TEXT,
    rol_interno TEXT,
    departamento TEXT,
    fecha_ingreso DATE,
    activo BOOLEAN,
    fecha_vinculacion TIMESTAMPTZ,
    permisos JSONB
) AS $$
DECLARE
    mi_empresa_id UUID;
    mi_tipo_empresa TEXT;
BEGIN
    -- Obtener empresa del usuario actual
    SELECT ue.empresa_id, e.tipo_empresa
    INTO mi_empresa_id, mi_tipo_empresa
    FROM public.usuarios_empresa ue
    INNER JOIN public.empresas e ON ue.empresa_id = e.id
    WHERE ue.user_id = auth.uid() 
    AND ue.activo = true
    LIMIT 1;
    
    -- Verificar permisos
    IF NOT user_has_permission('gestionar_usuarios') THEN
        RAISE EXCEPTION 'No tiene permisos para ver usuarios de la empresa';
    END IF;
    
    RETURN QUERY
    SELECT 
        ue.id,
        ue.user_id,
        ue.nombre_completo,
        ue.email_interno,
        ue.telefono_interno,
        ue.rol_interno,
        ue.departamento,
        ue.fecha_ingreso,
        ue.activo,
        ue.fecha_vinculacion,
        COALESCE(re.permisos, '{}'::jsonb) as permisos
    FROM public.usuarios_empresa ue
    LEFT JOIN public.roles_empresa re ON ue.rol_interno = re.nombre_rol 
        AND (re.tipo_empresa = mi_tipo_empresa OR re.tipo_empresa = 'ambos')
    WHERE ue.empresa_id = mi_empresa_id
    ORDER BY ue.nombre_completo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para agregar usuario a empresa
CREATE OR REPLACE FUNCTION agregar_usuario_empresa(
    p_email_usuario TEXT,
    p_rol_interno TEXT,
    p_nombre_completo TEXT,
    p_email_interno TEXT DEFAULT NULL,
    p_telefono_interno TEXT DEFAULT NULL,
    p_departamento TEXT DEFAULT NULL,
    p_fecha_ingreso DATE DEFAULT CURRENT_DATE
)
RETURNS UUID AS $$
DECLARE
    mi_empresa_id UUID;
    mi_tipo_empresa TEXT;
    usuario_target_id UUID;
    usuario_empresa_id UUID;
BEGIN
    -- Obtener empresa del usuario actual
    SELECT ue.empresa_id, e.tipo_empresa
    INTO mi_empresa_id, mi_tipo_empresa
    FROM public.usuarios_empresa ue
    INNER JOIN public.empresas e ON ue.empresa_id = e.id
    WHERE ue.user_id = auth.uid() 
    AND ue.activo = true
    LIMIT 1;
    
    -- Verificar permisos
    IF NOT user_has_permission('gestionar_usuarios') THEN
        RAISE EXCEPTION 'No tiene permisos para agregar usuarios';
    END IF;
    
    -- Validar que el rol sea válido para este tipo de empresa
    IF NOT validar_rol_empresa(p_rol_interno, mi_tipo_empresa) THEN
        RAISE EXCEPTION 'Rol no válido para este tipo de empresa';
    END IF;
    
    -- Buscar el usuario por email
    SELECT id INTO usuario_target_id 
    FROM auth.users 
    WHERE email = p_email_usuario;
    
    IF usuario_target_id IS NULL THEN
        RAISE EXCEPTION 'Usuario con email % no encontrado', p_email_usuario;
    END IF;
    
    -- Verificar que el usuario no esté ya en la empresa
    IF EXISTS (
        SELECT 1 FROM public.usuarios_empresa 
        WHERE user_id = usuario_target_id 
        AND empresa_id = mi_empresa_id
    ) THEN
        RAISE EXCEPTION 'El usuario ya pertenece a esta empresa';
    END IF;
    
    -- Agregar usuario a la empresa
    INSERT INTO public.usuarios_empresa (
        user_id,
        empresa_id,
        rol_interno,
        nombre_completo,
        email_interno,
        telefono_interno,
        departamento,
        fecha_ingreso,
        vinculado_por
    ) VALUES (
        usuario_target_id,
        mi_empresa_id,
        p_rol_interno,
        p_nombre_completo,
        COALESCE(p_email_interno, p_email_usuario),
        p_telefono_interno,
        p_departamento,
        p_fecha_ingreso,
        auth.uid()
    ) RETURNING id INTO usuario_empresa_id;
    
    RETURN usuario_empresa_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION get_user_empresa()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT empresa_id 
        FROM public.usuarios_empresa 
        WHERE user_id = auth.uid() 
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario es admin de una empresa
CREATE OR REPLACE FUNCTION is_empresa_admin(empresa_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND empresa_id = empresa_uuid 
        AND rol_interno = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener empresas transportistas disponibles para un coordinador
CREATE OR REPLACE FUNCTION get_available_transportistas()
RETURNS TABLE (
    id UUID,
    nombre TEXT,
    cuit TEXT,
    email TEXT,
    telefono TEXT,
    activa BOOLEAN,
    ya_contratado BOOLEAN
) AS $$
DECLARE
    mi_empresa_id UUID;
BEGIN
    -- Obtener la empresa del usuario actual
    mi_empresa_id := get_user_empresa();
    
    -- Verificar que el usuario sea coordinador
    IF NOT EXISTS (
        SELECT 1 FROM public.usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND empresa_id = mi_empresa_id 
        AND rol_interno IN ('admin', 'coordinador')
    ) THEN
        RAISE EXCEPTION 'Usuario no autorizado para ver transportistas';
    END IF;
    
    RETURN QUERY
    SELECT 
        e.id,
        e.nombre,
        e.cuit,
        e.email,
        e.telefono,
        e.activa,
        EXISTS (
            SELECT 1 FROM public.relaciones_empresas 
            WHERE empresa_cliente_id = mi_empresa_id 
            AND empresa_transporte_id = e.id 
            AND estado = 'activa'
        ) as ya_contratado
    FROM public.empresas e
    WHERE e.tipo_empresa = 'transporte'
    AND e.activa = true
    ORDER BY e.nombre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener clientes de una empresa transportista
CREATE OR REPLACE FUNCTION get_mis_clientes()
RETURNS TABLE (
    id UUID,
    nombre TEXT,
    cuit TEXT,
    email TEXT,
    telefono TEXT,
    fecha_inicio TIMESTAMPTZ,
    estado TEXT
) AS $$
DECLARE
    mi_empresa_id UUID;
BEGIN
    -- Obtener la empresa del usuario actual
    mi_empresa_id := get_user_empresa();
    
    -- Verificar que el usuario sea de una empresa de transporte
    IF NOT EXISTS (
        SELECT 1 FROM public.empresas 
        WHERE id = mi_empresa_id 
        AND tipo_empresa = 'transporte'
    ) THEN
        RAISE EXCEPTION 'Solo empresas de transporte pueden ver clientes';
    END IF;
    
    RETURN QUERY
    SELECT 
        e.id,
        e.nombre,
        e.cuit,
        e.email,
        e.telefono,
        re.fecha_inicio,
        re.estado
    FROM public.empresas e
    INNER JOIN public.relaciones_empresas re ON e.id = re.empresa_cliente_id
    WHERE re.empresa_transporte_id = mi_empresa_id
    AND re.estado = 'activa'
    ORDER BY e.nombre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear una relación empresa cliente-transporte
CREATE OR REPLACE FUNCTION crear_relacion_empresa(
    p_empresa_transporte_id UUID,
    p_condiciones JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    mi_empresa_id UUID;
    relacion_id UUID;
BEGIN
    -- Obtener la empresa del usuario actual
    mi_empresa_id := get_user_empresa();
    
    -- Verificar que el usuario sea coordinador
    IF NOT EXISTS (
        SELECT 1 FROM public.usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND empresa_id = mi_empresa_id 
        AND rol_interno IN ('admin', 'coordinador')
    ) THEN
        RAISE EXCEPTION 'Usuario no autorizado para crear relaciones';
    END IF;
    
    -- Verificar que la empresa transportista existe y es del tipo correcto
    IF NOT EXISTS (
        SELECT 1 FROM public.empresas 
        WHERE id = p_empresa_transporte_id 
        AND tipo_empresa = 'transporte'
        AND activa = true
    ) THEN
        RAISE EXCEPTION 'Empresa transportista no válida';
    END IF;
    
    -- Crear la relación
    INSERT INTO public.relaciones_empresas (
        empresa_cliente_id,
        empresa_transporte_id,
        condiciones
    ) VALUES (
        mi_empresa_id,
        p_empresa_transporte_id,
        p_condiciones
    ) RETURNING id INTO relacion_id;
    
    RETURN relacion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de red
CREATE OR REPLACE FUNCTION get_network_stats()
RETURNS TABLE (
    total_empresas INTEGER,
    empresas_transporte INTEGER,
    empresas_coordinador INTEGER,
    relaciones_activas INTEGER,
    despachos_mes_actual INTEGER
) AS $$
DECLARE
    mi_empresa_id UUID;
BEGIN
    mi_empresa_id := get_user_empresa();
    
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM public.empresas WHERE activa = true),
        (SELECT COUNT(*)::INTEGER FROM public.empresas WHERE tipo_empresa = 'transporte' AND activa = true),
        (SELECT COUNT(*)::INTEGER FROM public.empresas WHERE tipo_empresa = 'coordinador' AND activa = true),
        (SELECT COUNT(*)::INTEGER FROM public.relaciones_empresas WHERE estado = 'activa'),
        (SELECT COUNT(*)::INTEGER FROM public.despachos_red 
         WHERE DATE_TRUNC('month', fecha_creacion) = DATE_TRUNC('month', NOW())
         AND (empresa_cliente_id = mi_empresa_id OR empresa_transporte_id = mi_empresa_id)
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;