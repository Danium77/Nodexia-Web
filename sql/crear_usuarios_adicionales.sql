-- Script para crear usuarios adicionales de prueba
-- Este script debe ejecutarse después de setup_empresas_usuarios.sql

-- Función auxiliar para crear usuario si no existe
CREATE OR REPLACE FUNCTION crear_usuario_si_no_existe(
    p_email TEXT,
    p_password TEXT DEFAULT 'demo123456'
)
RETURNS UUID AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Verificar si el usuario ya existe
    SELECT id INTO user_id FROM auth.users WHERE email = p_email;
    
    IF user_id IS NULL THEN
        -- Nota: En un entorno real, esto se haría a través del SDK de Supabase
        -- Por ahora, insertamos directamente (solo para desarrollo/testing)
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            confirmation_token,
            raw_app_meta_data,
            raw_user_meta_data
        ) VALUES (
            gen_random_uuid(),
            p_email,
            crypt(p_password, gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '',
            '{"provider":"email","providers":["email"]}',
            '{}'
        ) RETURNING id INTO user_id;
        
        RAISE NOTICE 'Usuario % creado con ID %', p_email, user_id;
    ELSE
        RAISE NOTICE 'Usuario % ya existe con ID %', p_email, user_id;
    END IF;
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Crear usuarios adicionales de prueba
DO $$
DECLARE
    coordinador_user_id UUID;
    chofer_user_id UUID;
    admin_coordinador_user_id UUID;
    operador_transporte_user_id UUID;
    empresa_coordinadora_id UUID;
    empresa_transporte_id UUID;
BEGIN
    -- Obtener IDs de empresas
    SELECT id INTO empresa_coordinadora_id FROM public.empresas WHERE tipo_empresa = 'coordinador' LIMIT 1;
    SELECT id INTO empresa_transporte_id FROM public.empresas WHERE tipo_empresa = 'transporte' LIMIT 1;
    
    -- Crear usuarios (solo si no existen)
    coordinador_user_id := crear_usuario_si_no_existe('coordinador.demo@nodexia.com');
    chofer_user_id := crear_usuario_si_no_existe('chofer.demo@nodexia.com');
    admin_coordinador_user_id := crear_usuario_si_no_existe('admin.coordinador@nodexia.com');
    operador_transporte_user_id := crear_usuario_si_no_existe('operador.transporte@nodexia.com');
    
    -- Vincular coordinador a empresa coordinadora
    IF coordinador_user_id IS NOT NULL AND empresa_coordinadora_id IS NOT NULL THEN
        INSERT INTO public.usuarios_empresa (
            user_id,
            empresa_id,
            rol_interno,
            nombre_completo,
            email_interno,
            departamento,
            fecha_ingreso
        ) VALUES (
            coordinador_user_id,
            empresa_coordinadora_id,
            'coordinador',
            'Coordinador Demo',
            'coordinador@coordinadora-demo.com',
            'Operaciones',
            CURRENT_DATE
        ) ON CONFLICT (user_id, empresa_id) DO NOTHING;
        
        RAISE NOTICE 'Coordinador vinculado a empresa coordinadora';
    END IF;
    
    -- Vincular chofer a empresa de transporte
    IF chofer_user_id IS NOT NULL AND empresa_transporte_id IS NOT NULL THEN
        INSERT INTO public.usuarios_empresa (
            user_id,
            empresa_id,
            rol_interno,
            nombre_completo,
            email_interno,
            departamento,
            fecha_ingreso
        ) VALUES (
            chofer_user_id,
            empresa_transporte_id,
            'chofer',
            'Chofer Demo Juan',
            'chofer@transportes-demo.com',
            'Operaciones',
            CURRENT_DATE
        ) ON CONFLICT (user_id, empresa_id) DO NOTHING;
        
        RAISE NOTICE 'Chofer vinculado a empresa de transporte';
    END IF;
    
    -- Vincular admin coordinador adicional
    IF admin_coordinador_user_id IS NOT NULL AND empresa_coordinadora_id IS NOT NULL THEN
        INSERT INTO public.usuarios_empresa (
            user_id,
            empresa_id,
            rol_interno,
            nombre_completo,
            email_interno,
            departamento,
            fecha_ingreso
        ) VALUES (
            admin_coordinador_user_id,
            empresa_coordinadora_id,
            'admin',
            'Admin Coordinador 2',
            'admin2@coordinadora-demo.com',
            'Administración',
            CURRENT_DATE
        ) ON CONFLICT (user_id, empresa_id) DO NOTHING;
        
        RAISE NOTICE 'Admin coordinador adicional vinculado';
    END IF;
    
    -- Vincular operador a empresa de transporte
    IF operador_transporte_user_id IS NOT NULL AND empresa_transporte_id IS NOT NULL THEN
        INSERT INTO public.usuarios_empresa (
            user_id,
            empresa_id,
            rol_interno,
            nombre_completo,
            email_interno,
            departamento,
            fecha_ingreso
        ) VALUES (
            operador_transporte_user_id,
            empresa_transporte_id,
            'operador',
            'Operador Transporte Demo',
            'operador@transportes-demo.com',
            'Operaciones',
            CURRENT_DATE
        ) ON CONFLICT (user_id, empresa_id) DO NOTHING;
        
        RAISE NOTICE 'Operador vinculado a empresa de transporte';
    END IF;
    
END $$;

-- 2. Crear algunos choferes y vehículos de prueba vinculados a la empresa
DO $$
DECLARE
    empresa_transporte_id UUID;
    chofer_demo_id UUID;
BEGIN
    SELECT id INTO empresa_transporte_id FROM public.empresas WHERE tipo_empresa = 'transporte' LIMIT 1;
    
    IF empresa_transporte_id IS NOT NULL THEN
        -- Crear chofer de prueba
        INSERT INTO public.choferes (
            nombre,
            apellido,
            dni,
            telefono,
            email,
            licencia,
            vencimiento_licencia,
            empresa_id
        ) VALUES (
            'Juan Carlos',
            'Pérez',
            '12345678',
            '+54 11 1234-5678',
            'jperez@transportes-demo.com',
            'C123456789',
            CURRENT_DATE + INTERVAL '1 year',
            empresa_transporte_id
        ) ON CONFLICT (dni) DO NOTHING
        RETURNING id INTO chofer_demo_id;
        
        -- Crear camión de prueba
        INSERT INTO public.camiones (
            patente,
            marca,
            modelo,
            año,
            id_transporte,
            empresa_id
        ) VALUES (
            'ABC123',
            'Mercedes Benz',
            'Actros 2644',
            2020,
            (SELECT user_id FROM public.usuarios_empresa WHERE empresa_id = empresa_transporte_id AND rol_interno = 'admin' LIMIT 1),
            empresa_transporte_id
        ) ON CONFLICT (patente) DO NOTHING;
        
        -- Crear acoplado de prueba
        INSERT INTO public.acoplados (
            patente,
            marca,
            modelo,
            año,
            tipo_acoplado,
            id_transporte,
            empresa_id
        ) VALUES (
            'DEF456',
            'Randon',
            'Sider',
            2019,
            'Semiremolque',
            (SELECT user_id FROM public.usuarios_empresa WHERE empresa_id = empresa_transporte_id AND rol_interno = 'admin' LIMIT 1),
            empresa_transporte_id
        ) ON CONFLICT (patente) DO NOTHING;
        
        RAISE NOTICE 'Vehículos de prueba creados para empresa de transporte';
    END IF;
END $$;

-- 3. Crear despachos adicionales de prueba
INSERT INTO public.despachos_red (
    empresa_cliente_id,
    empresa_transporte_id,
    origen,
    destino,
    fecha_despacho,
    estado,
    observaciones,
    creado_por
) SELECT 
    (SELECT id FROM public.empresas WHERE tipo_empresa = 'coordinador' LIMIT 1),
    (SELECT id FROM public.empresas WHERE tipo_empresa = 'transporte' LIMIT 1),
    'Terminal Retiro, CABA',
    'Mendoza Capital',
    CURRENT_DATE + INTERVAL '2 days',
    'planificado',
    'Despacho de carga general - Prueba 2',
    (SELECT ue.user_id FROM public.usuarios_empresa ue 
     INNER JOIN public.empresas e ON ue.empresa_id = e.id 
     WHERE e.tipo_empresa = 'coordinador' AND ue.rol_interno = 'coordinador' LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM public.despachos_red 
    WHERE origen = 'Terminal Retiro, CABA' AND destino = 'Mendoza Capital'
);

INSERT INTO public.despachos_red (
    empresa_cliente_id,
    empresa_transporte_id,
    origen,
    destino,
    fecha_despacho,
    estado,
    observaciones,
    creado_por
) SELECT 
    (SELECT id FROM public.empresas WHERE tipo_empresa = 'coordinador' LIMIT 1),
    (SELECT id FROM public.empresas WHERE tipo_empresa = 'transporte' LIMIT 1),
    'Puerto de La Plata',
    'Tucumán Capital',
    CURRENT_DATE + INTERVAL '3 days',
    'asignado',
    'Despacho de containers - En proceso',
    (SELECT ue.user_id FROM public.usuarios_empresa ue 
     INNER JOIN public.empresas e ON ue.empresa_id = e.id 
     WHERE e.tipo_empresa = 'coordinador' AND ue.rol_interno = 'admin' LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM public.despachos_red 
    WHERE origen = 'Puerto de La Plata' AND destino = 'Tucumán Capital'
);

-- 4. Mostrar resumen final de la configuración
SELECT 'RESUMEN DE CONFIGURACIÓN' as seccion, '=====================' as detalle;

SELECT 
    'Empresas configuradas:' as item,
    count(*)::text as cantidad
FROM public.empresas
UNION ALL
SELECT 
    'Usuarios vinculados a empresas:' as item,
    count(*)::text as cantidad
FROM public.usuarios_empresa WHERE activo = true
UNION ALL
SELECT 
    'Relaciones entre empresas:' as item,
    count(*)::text as cantidad
FROM public.relaciones_empresas WHERE estado = 'activa'
UNION ALL
SELECT 
    'Despachos de prueba:' as item,
    count(*)::text as cantidad
FROM public.despachos_red
UNION ALL
SELECT 
    'Choferes vinculados:' as item,
    count(*)::text as cantidad
FROM public.choferes WHERE empresa_id IS NOT NULL
UNION ALL
SELECT 
    'Vehículos vinculados:' as item,
    count(*)::text as cantidad
FROM public.camiones WHERE empresa_id IS NOT NULL;

-- Mostrar usuarios por empresa y rol
SELECT 
    e.nombre as empresa,
    e.tipo_empresa,
    ue.rol_interno,
    count(*) as cantidad_usuarios
FROM public.empresas e
LEFT JOIN public.usuarios_empresa ue ON e.id = ue.empresa_id
WHERE ue.activo = true
GROUP BY e.nombre, e.tipo_empresa, ue.rol_interno
ORDER BY e.nombre, ue.rol_interno;

-- Limpiar función temporal
DROP FUNCTION IF EXISTS crear_usuario_si_no_existe(TEXT, TEXT);