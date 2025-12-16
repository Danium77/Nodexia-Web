-- Actualizar función agregar_usuario_empresa para crear registros en profiles y usuarios
-- Esta función ahora sincroniza automáticamente todas las tablas necesarias

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
        RAISE EXCEPTION 'Usuario con email % no encontrado en auth.users', p_email_usuario;
    END IF;
    
    -- Verificar que el usuario no esté ya en la empresa
    IF EXISTS (
        SELECT 1 FROM public.usuarios_empresa 
        WHERE user_id = usuario_target_id 
        AND empresa_id = mi_empresa_id
    ) THEN
        RAISE EXCEPTION 'El usuario ya pertenece a esta empresa';
    END IF;
    
    -- Asegurar que existe en profiles (con columna 'name')
    INSERT INTO public.profiles (id, name)
    VALUES (usuario_target_id, p_nombre_completo)
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Profile synced for user %', usuario_target_id;
    
    -- Asegurar que existe en usuarios
    INSERT INTO public.usuarios (id, email, nombre_completo)
    VALUES (usuario_target_id, p_email_usuario, p_nombre_completo)
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Usuario record synced for user %', usuario_target_id;
    
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
    
    RAISE NOTICE 'User successfully added to company';
    
    RETURN usuario_empresa_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar que la función fue actualizada
SELECT 'Función agregar_usuario_empresa actualizada correctamente' as status;
