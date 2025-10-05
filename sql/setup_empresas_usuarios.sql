-- Script para configurar empresas y vincular usuarios existentes
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar usuarios existentes en el sistema
SELECT 'Usuarios en auth.users' as tabla, count(*) as cantidad FROM auth.users
UNION ALL
SELECT 'Usuarios en profile_users' as tabla, count(*) as cantidad FROM profile_users
UNION ALL
SELECT 'Empresas existentes' as tabla, count(*) as cantidad FROM empresas
UNION ALL
SELECT 'Usuarios en empresas' as tabla, count(*) as cantidad FROM usuarios_empresa;

-- 2. Ver detalle de usuarios existentes
SELECT 
    au.id,
    au.email,
    au.created_at,
    pu.nombre,
    pu.apellido,
    r.name as role,
    p.name as profile
FROM auth.users au
LEFT JOIN profile_users pu ON au.id = pu.user_id
LEFT JOIN roles r ON pu.role_id = r.id
LEFT JOIN profiles p ON pu.profile_id = p.id
ORDER BY au.created_at;

-- 3. Crear empresas de ejemplo si no existen

-- Empresa coordinadora (cliente)
INSERT INTO public.empresas (
    nombre,
    cuit,
    tipo_empresa,
    email,
    telefono,
    direccion,
    localidad,
    provincia
) VALUES (
    'Empresa Coordinadora Demo',
    '20-12345678-9',
    'coordinador',
    'contacto@coordinadora-demo.com',
    '+54 11 1234-5678',
    'Av. Principal 123',
    'Buenos Aires',
    'CABA'
) ON CONFLICT (cuit) DO NOTHING;

-- Empresa de transporte
INSERT INTO public.empresas (
    nombre,
    cuit,
    tipo_empresa,
    email,
    telefono,
    direccion,
    localidad,
    provincia
) VALUES (
    'Transportes Demo SA',
    '30-87654321-2',
    'transporte',
    'admin@transportes-demo.com',
    '+54 11 8765-4321',
    'Ruta 9 Km 45',
    'San Martín',
    'Buenos Aires'
) ON CONFLICT (cuit) DO NOTHING;

-- 4. Obtener IDs de las empresas creadas
DO $$
DECLARE
    empresa_coordinadora_id UUID;
    empresa_transporte_id UUID;
    admin_user_id UUID;
    transporte_user_id UUID;
BEGIN
    -- Obtener IDs de empresas
    SELECT id INTO empresa_coordinadora_id FROM public.empresas WHERE cuit = '20-12345678-9';
    SELECT id INTO empresa_transporte_id FROM public.empresas WHERE cuit = '30-87654321-2';
    
    -- Obtener IDs de usuarios (asumir que existen admin.demo y transporte.demo)
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin.demo@nodexia.com';
    SELECT id INTO transporte_user_id FROM auth.users WHERE email = 'transporte.demo@nodexia.com';
    
    -- Vincular usuario admin a empresa coordinadora
    IF admin_user_id IS NOT NULL AND empresa_coordinadora_id IS NOT NULL THEN
        INSERT INTO public.usuarios_empresa (
            user_id,
            empresa_id,
            rol_interno,
            nombre_completo,
            email_interno,
            departamento,
            fecha_ingreso
        ) VALUES (
            admin_user_id,
            empresa_coordinadora_id,
            'admin',
            'Administrador Demo',
            'admin.demo@coordinadora-demo.com',
            'Administración',
            CURRENT_DATE
        ) ON CONFLICT (user_id, empresa_id) DO NOTHING;
        
        -- Actualizar empresa con usuario admin
        UPDATE public.empresas 
        SET usuario_admin = admin_user_id 
        WHERE id = empresa_coordinadora_id;
        
        RAISE NOTICE 'Usuario admin vinculado a empresa coordinadora';
    ELSE
        RAISE NOTICE 'Usuario admin no encontrado o empresa coordinadora no creada';
    END IF;
    
    -- Vincular usuario transporte a empresa de transporte
    IF transporte_user_id IS NOT NULL AND empresa_transporte_id IS NOT NULL THEN
        INSERT INTO public.usuarios_empresa (
            user_id,
            empresa_id,
            rol_interno,
            nombre_completo,
            email_interno,
            departamento,
            fecha_ingreso
        ) VALUES (
            transporte_user_id,
            empresa_transporte_id,
            'admin',
            'Admin Transporte Demo',
            'admin@transportes-demo.com',
            'Administración',
            CURRENT_DATE
        ) ON CONFLICT (user_id, empresa_id) DO NOTHING;
        
        -- Actualizar empresa con usuario admin
        UPDATE public.empresas 
        SET usuario_admin = transporte_user_id 
        WHERE id = empresa_transporte_id;
        
        RAISE NOTICE 'Usuario transporte vinculado a empresa de transporte';
    ELSE
        RAISE NOTICE 'Usuario transporte no encontrado o empresa transporte no creada';
    END IF;
    
END $$;

-- 5. Crear relación entre empresas (coordinadora contrata a transporte)
INSERT INTO public.relaciones_empresas (
    empresa_cliente_id,
    empresa_transporte_id,
    estado,
    condiciones
) SELECT 
    (SELECT id FROM public.empresas WHERE tipo_empresa = 'coordinador' LIMIT 1),
    (SELECT id FROM public.empresas WHERE tipo_empresa = 'transporte' LIMIT 1),
    'activa',
    '{"tarifa_base": 1000, "moneda": "ARS", "condiciones_pago": "30 días"}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM public.relaciones_empresas 
    WHERE empresa_cliente_id = (SELECT id FROM public.empresas WHERE tipo_empresa = 'coordinador' LIMIT 1)
    AND empresa_transporte_id = (SELECT id FROM public.empresas WHERE tipo_empresa = 'transporte' LIMIT 1)
);

-- 6. Verificar resultado final
SELECT 'RESULTADO FINAL' as seccion, '=================' as detalle
UNION ALL
SELECT 'Empresas creadas:', count(*)::text FROM public.empresas
UNION ALL
SELECT 'Usuarios vinculados:', count(*)::text FROM public.usuarios_empresa
UNION ALL
SELECT 'Relaciones activas:', count(*)::text FROM public.relaciones_empresas WHERE estado = 'activa';

-- 7. Ver detalle de usuarios por empresa
SELECT 
    e.nombre as empresa,
    e.tipo_empresa,
    ue.nombre_completo,
    ue.rol_interno,
    ue.email_interno,
    au.email as email_auth
FROM public.empresas e
LEFT JOIN public.usuarios_empresa ue ON e.id = ue.empresa_id
LEFT JOIN auth.users au ON ue.user_id = au.id
ORDER BY e.nombre, ue.nombre_completo;