-- Mejora de la función agregar_usuario_empresa
-- para que sincronice automáticamente con las tablas usuarios y profiles

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
    v_rol_principal TEXT;
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
        RAISE EXCEPTION 'Usuario con email % no encontrado en auth.users. Debe crear el usuario primero en Authentication.', p_email_usuario;
    END IF;
    
    -- Verificar que el usuario no esté ya en la empresa
    IF EXISTS (
        SELECT 1 FROM public.usuarios_empresa 
        WHERE user_id = usuario_target_id 
        AND empresa_id = mi_empresa_id
    ) THEN
        RAISE EXCEPTION 'El usuario ya pertenece a esta empresa';
    END IF;
    
    -- ========================================
    -- NUEVO: Determinar rol principal correcto
    -- ========================================
    CASE mi_tipo_empresa
        WHEN 'transporte' THEN
            CASE LOWER(p_rol_interno)
                WHEN 'operador' THEN v_rol_principal := 'coordinador_transporte';
                WHEN 'coordinador' THEN v_rol_principal := 'coordinador_transporte';
                WHEN 'coordinador_transporte' THEN v_rol_principal := 'coordinador_transporte';
                WHEN 'admin' THEN v_rol_principal := 'coordinador_transporte';
                WHEN 'chofer' THEN v_rol_principal := 'chofer';
                ELSE v_rol_principal := 'coordinador_transporte';
            END CASE;
        WHEN 'planta' THEN
            CASE LOWER(p_rol_interno)
                WHEN 'coordinador' THEN v_rol_principal := 'coordinador';
                WHEN 'admin' THEN v_rol_principal := 'coordinador';
                WHEN 'control_acceso' THEN v_rol_principal := 'control_acceso';
                WHEN 'supervisor' THEN v_rol_principal := 'supervisor_carga';
                ELSE v_rol_principal := 'coordinador';
            END CASE;
        ELSE
            v_rol_principal := 'visor'; -- Cliente u otro
    END CASE;

    -- ========================================
    -- NUEVO: Crear/actualizar profile
    -- ========================================
    INSERT INTO profiles (
        id,
        email,
        full_name,
        created_at,
        updated_at
    ) VALUES (
        usuario_target_id,
        p_email_usuario,
        p_nombre_completo,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();

    -- ========================================
    -- NUEVO: Crear/actualizar en tabla usuarios
    -- ========================================
    INSERT INTO usuarios (
        id,
        email,
        nombre_completo,
        rol_principal,
        empresa_id,
        activo,
        created_at,
        updated_at
    ) VALUES (
        usuario_target_id,
        p_email_usuario,
        p_nombre_completo,
        v_rol_principal,
        mi_empresa_id,
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        nombre_completo = EXCLUDED.nombre_completo,
        rol_principal = EXCLUDED.rol_principal,
        empresa_id = EXCLUDED.empresa_id,
        activo = EXCLUDED.activo,
        updated_at = NOW();

    -- ========================================
    -- NUEVO: Actualizar metadata en auth.users
    -- ========================================
    UPDATE auth.users
    SET 
        raw_user_meta_data = jsonb_build_object(
            'full_name', p_nombre_completo,
            'rol', v_rol_principal,
            'empresa_id', mi_empresa_id
        ),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = usuario_target_id;
    
    -- Agregar usuario a la empresa (tabla usuarios_empresa)
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
    
    RAISE NOTICE 'Usuario % agregado exitosamente. Perfil, usuarios y metadata sincronizados.', p_email_usuario;
    
    RETURN usuario_empresa_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION agregar_usuario_empresa IS 'Agrega un usuario a la empresa actual y sincroniza con profiles, usuarios y auth.users metadata';
