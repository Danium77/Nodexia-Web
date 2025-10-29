-- =============================================
-- CONFIGURAR USUARIO ADMIN DEMO
-- Usuario: admin.demo@nodexia.com
-- =============================================

-- PASO 0: Agregar rol super_admin si no existe en roles_empresa
DO $$
BEGIN
    -- Agregar super_admin para todos los tipos de empresa
    INSERT INTO public.roles_empresa (nombre_rol, descripcion, tipo_empresa, permisos, activo)
    VALUES 
        ('super_admin', 'Super Administrador con acceso total', 'planta', 
         '{"gestionar_usuarios": true, "gestionar_empresas": true, "ver_reportes": true, "configurar_sistema": true}'::jsonb, 
         true),
        ('super_admin', 'Super Administrador con acceso total', 'transporte', 
         '{"gestionar_usuarios": true, "gestionar_empresas": true, "ver_reportes": true, "configurar_sistema": true}'::jsonb, 
         true),
        ('super_admin', 'Super Administrador con acceso total', 'cliente', 
         '{"gestionar_usuarios": true, "gestionar_empresas": true, "ver_reportes": true, "configurar_sistema": true}'::jsonb, 
         true)
    ON CONFLICT (nombre_rol, tipo_empresa) DO NOTHING;
    
    RAISE NOTICE '✅ Rol super_admin agregado a roles_empresa';
END $$;

-- PASO 1: Verificar si existe la empresa Nodexia
DO $$
DECLARE
    v_empresa_id UUID;
    v_user_id UUID;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '🔧 CONFIGURAR ADMIN DEMO';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '';

    -- Buscar empresa Nodexia
    SELECT id INTO v_empresa_id FROM public.empresas WHERE nombre = 'Nodexia';
    
    IF v_empresa_id IS NULL THEN
        -- Crear empresa Nodexia si no existe
        INSERT INTO public.empresas (nombre, cuit, tipo_empresa, direccion, localidad, provincia, activo)
        VALUES ('Nodexia', '00-00000000-0', 'planta', 'Oficina Central', 'Rosario', 'Santa Fe', true)
        RETURNING id INTO v_empresa_id;
        
        RAISE NOTICE '✅ Empresa Nodexia creada con ID: %', v_empresa_id;
    ELSE
        RAISE NOTICE '✅ Empresa Nodexia ya existe con ID: %', v_empresa_id;
    END IF;

    -- Buscar usuario admin.demo@nodexia.com
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin.demo@nodexia.com';
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '❌ Usuario admin.demo@nodexia.com NO existe en auth.users';
        RAISE NOTICE '   Por favor créalo manualmente en Supabase Dashboard';
    ELSE
        RAISE NOTICE '✅ Usuario encontrado con ID: %', v_user_id;
        
        -- Verificar si ya existe la vinculación
        IF EXISTS (
            SELECT 1 FROM public.usuarios_empresa 
            WHERE user_id = v_user_id 
            AND empresa_id = v_empresa_id
            AND rol_interno = 'super_admin'
        ) THEN
            RAISE NOTICE '✅ Usuario ya está vinculado como super_admin';
        ELSE
            -- Crear vinculación
            INSERT INTO public.usuarios_empresa (user_id, empresa_id, rol_interno, activo, nombre_completo)
            VALUES (v_user_id, v_empresa_id, 'super_admin', true, 'Admin Demo');
            
            RAISE NOTICE '✅ Usuario vinculado como super_admin a Nodexia';
        END IF;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '🎯 SIGUIENTE PASO:';
    RAISE NOTICE '';
    RAISE NOTICE '1. Inicia sesión en la aplicación:';
    RAISE NOTICE '   Email: admin.demo@nodexia.com';
    RAISE NOTICE '   Password: (tu password)';
    RAISE NOTICE '';
    RAISE NOTICE '2. Ve a /admin/empresas para crear empresas';
    RAISE NOTICE '3. Ve a /admin/usuarios para crear usuarios';
    RAISE NOTICE '4. O prueba /signup → /admin/solicitudes';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';

END $$;

-- Verificar resultado
SELECT 
    u.email,
    e.nombre as empresa,
    ue.rol_interno,
    ue.activo
FROM public.usuarios_empresa ue
JOIN auth.users u ON u.id = ue.user_id
JOIN public.empresas e ON e.id = ue.empresa_id
WHERE u.email = 'admin.demo@nodexia.com';
