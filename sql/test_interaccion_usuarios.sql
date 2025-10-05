-- Script para crear usuarios adicionales y probar interacciones
-- Ejecutar después de setup_empresas_usuarios.sql

-- 1. Crear usuario coordinador adicional para la empresa coordinadora
DO $$
DECLARE
    empresa_coordinadora_id UUID;
    nuevo_user_id UUID;
BEGIN
    -- Obtener ID de empresa coordinadora
    SELECT id INTO empresa_coordinadora_id FROM public.empresas WHERE tipo_empresa = 'coordinador' LIMIT 1;
    
    IF empresa_coordinadora_id IS NOT NULL THEN
        -- Crear usuario coordinador en auth.users (esto normalmente se haría via signup)
        -- Por simplicidad, vamos a asumir que el usuario ya existe o se creará externamente
        
        -- Si tienes un usuario coordinador.demo@nodexia.com, vincularlo
        SELECT id INTO nuevo_user_id FROM auth.users WHERE email = 'coordinador.demo@nodexia.com';
        
        IF nuevo_user_id IS NOT NULL THEN
            INSERT INTO public.usuarios_empresa (
                user_id,
                empresa_id,
                rol_interno,
                nombre_completo,
                email_interno,
                departamento,
                fecha_ingreso
            ) VALUES (
                nuevo_user_id,
                empresa_coordinadora_id,
                'coordinador',
                'Coordinador Demo',
                'coordinador.demo@coordinadora-demo.com',
                'Operaciones',
                CURRENT_DATE
            ) ON CONFLICT (user_id, empresa_id) DO NOTHING;
            
            RAISE NOTICE 'Usuario coordinador vinculado a empresa coordinadora';
        ELSE
            RAISE NOTICE 'Usuario coordinador.demo@nodexia.com no encontrado';
        END IF;
    END IF;
END $$;

-- 2. Crear usuario chofer para la empresa de transporte
DO $$
DECLARE
    empresa_transporte_id UUID;
    nuevo_user_id UUID;
BEGIN
    -- Obtener ID de empresa de transporte
    SELECT id INTO empresa_transporte_id FROM public.empresas WHERE tipo_empresa = 'transporte' LIMIT 1;
    
    IF empresa_transporte_id IS NOT NULL THEN
        -- Si tienes un usuario chofer.demo@nodexia.com, vincularlo
        SELECT id INTO nuevo_user_id FROM auth.users WHERE email = 'chofer.demo@nodexia.com';
        
        IF nuevo_user_id IS NOT NULL THEN
            INSERT INTO public.usuarios_empresa (
                user_id,
                empresa_id,
                rol_interno,
                nombre_completo,
                email_interno,
                departamento,
                fecha_ingreso
            ) VALUES (
                nuevo_user_id,
                empresa_transporte_id,
                'chofer',
                'Chofer Demo',
                'chofer.demo@transportes-demo.com',
                'Operaciones',
                CURRENT_DATE
            ) ON CONFLICT (user_id, empresa_id) DO NOTHING;
            
            RAISE NOTICE 'Usuario chofer vinculado a empresa de transporte';
        ELSE
            RAISE NOTICE 'Usuario chofer.demo@nodexia.com no encontrado';
        END IF;
    END IF;
END $$;

-- 3. Crear despacho de prueba entre empresas
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
    'Puerto Buenos Aires',
    'Rosario, Santa Fe',
    CURRENT_DATE + INTERVAL '1 day',
    'planificado',
    'Despacho de prueba para validar interacción entre empresas',
    (SELECT ue.user_id FROM public.usuarios_empresa ue 
     INNER JOIN public.empresas e ON ue.empresa_id = e.id 
     WHERE e.tipo_empresa = 'coordinador' AND ue.rol_interno = 'admin' LIMIT 1)
WHERE EXISTS (
    SELECT 1 FROM public.empresas WHERE tipo_empresa = 'coordinador'
) AND EXISTS (
    SELECT 1 FROM public.empresas WHERE tipo_empresa = 'transporte'
);

-- 4. Función para simular login y obtener contexto de empresa
CREATE OR REPLACE FUNCTION simular_contexto_usuario(p_email TEXT)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    empresa_id UUID,
    empresa_nombre TEXT,
    empresa_tipo TEXT,
    rol_interno TEXT,
    permisos JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        au.email,
        ue.empresa_id,
        e.nombre,
        e.tipo_empresa,
        ue.rol_interno,
        COALESCE(re.permisos, '{}'::jsonb)
    FROM auth.users au
    INNER JOIN public.usuarios_empresa ue ON au.id = ue.user_id
    INNER JOIN public.empresas e ON ue.empresa_id = e.id
    LEFT JOIN public.roles_empresa re ON ue.rol_interno = re.nombre_rol 
        AND (re.tipo_empresa = e.tipo_empresa OR re.tipo_empresa = 'ambos')
    WHERE au.email = p_email AND ue.activo = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función para obtener despachos visibles según empresa y rol
CREATE OR REPLACE FUNCTION obtener_despachos_usuario(p_user_id UUID)
RETURNS TABLE (
    despacho_id UUID,
    origen TEXT,
    destino TEXT,
    fecha_despacho DATE,
    estado TEXT,
    empresa_cliente TEXT,
    empresa_transporte TEXT,
    puede_editar BOOLEAN
) AS $$
DECLARE
    mi_empresa_id UUID;
    mi_rol TEXT;
    mi_tipo_empresa TEXT;
BEGIN
    -- Obtener contexto del usuario
    SELECT ue.empresa_id, ue.rol_interno, e.tipo_empresa
    INTO mi_empresa_id, mi_rol, mi_tipo_empresa
    FROM public.usuarios_empresa ue
    INNER JOIN public.empresas e ON ue.empresa_id = e.id
    WHERE ue.user_id = p_user_id AND ue.activo = true
    LIMIT 1;
    
    RETURN QUERY
    SELECT 
        dr.id,
        dr.origen,
        dr.destino,
        dr.fecha_despacho,
        dr.estado,
        ec.nombre as empresa_cliente,
        et.nombre as empresa_transporte,
        (mi_rol IN ('admin', 'coordinador') AND 
         (dr.empresa_cliente_id = mi_empresa_id OR dr.empresa_transporte_id = mi_empresa_id)) as puede_editar
    FROM public.despachos_red dr
    INNER JOIN public.empresas ec ON dr.empresa_cliente_id = ec.id
    INNER JOIN public.empresas et ON dr.empresa_transporte_id = et.id
    WHERE dr.empresa_cliente_id = mi_empresa_id OR dr.empresa_transporte_id = mi_empresa_id
    ORDER BY dr.fecha_despacho DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Pruebas de interacción
SELECT 'PRUEBAS DE INTERACCIÓN' as seccion, '====================' as detalle;

-- Simular login de usuario admin coordinador
SELECT 'Contexto Admin Coordinador:' as test;
SELECT * FROM simular_contexto_usuario('admin.demo@nodexia.com');

-- Simular login de usuario admin transporte
SELECT 'Contexto Admin Transporte:' as test;
SELECT * FROM simular_contexto_usuario('transporte.demo@nodexia.com');

-- Ver despachos desde perspectiva del admin coordinador
SELECT 'Despachos visibles para Admin Coordinador:' as test;
SELECT * FROM obtener_despachos_usuario(
    (SELECT id FROM auth.users WHERE email = 'admin.demo@nodexia.com')
);

-- Ver despachos desde perspectiva del admin transporte
SELECT 'Despachos visibles para Admin Transporte:' as test;
SELECT * FROM obtener_despachos_usuario(
    (SELECT id FROM auth.users WHERE email = 'transporte.demo@nodexia.com')
);

-- 7. Verificar permisos específicos
SELECT 'VERIFICACIÓN DE PERMISOS' as seccion, '====================' as detalle;

SELECT 
    au.email,
    e.nombre as empresa,
    ue.rol_interno,
    re.permisos->>'gestionar_usuarios' as puede_gestionar_usuarios,
    re.permisos->>'crear_despachos' as puede_crear_despachos,
    re.permisos->>'ver_reportes' as puede_ver_reportes
FROM auth.users au
INNER JOIN public.usuarios_empresa ue ON au.id = ue.user_id
INNER JOIN public.empresas e ON ue.empresa_id = e.id
LEFT JOIN public.roles_empresa re ON ue.rol_interno = re.nombre_rol 
    AND (re.tipo_empresa = e.tipo_empresa OR re.tipo_empresa = 'ambos')
WHERE ue.activo = true
ORDER BY e.nombre, ue.rol_interno;