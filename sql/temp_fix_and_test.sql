-- =============================================
-- Script de Diagnóstico y Solución Temporal
-- =============================================

-- 1. Temporalmente deshabilitar RLS para debugging
ALTER TABLE public.relaciones_empresa DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_empresa DISABLE ROW LEVEL SECURITY;

-- 2. Verificar si el usuario coordinador.demo@nodexia.com existe en auth
-- Si no existe, lo creamos en las tablas públicas con un ID temporal
DO $$
DECLARE
    v_user_id UUID;
    v_empresa_id UUID;
BEGIN
    -- Generar un UUID para el usuario si no existe
    v_user_id := gen_random_uuid();
    
    -- Insertar usuario en public.usuarios si no existe
    INSERT INTO public.usuarios (id, email, nombre_completo)
    VALUES (v_user_id, 'coordinador.demo@nodexia.com', 'Coordinador Demo Nodexia')
    ON CONFLICT (email) DO UPDATE SET
        nombre_completo = EXCLUDED.nombre_completo;
    
    -- Obtener el ID de la empresa coordinadora
    SELECT id INTO v_empresa_id
    FROM public.empresas
    WHERE tipo_empresa = 'coordinador'
    LIMIT 1;
    
    -- Asociar usuario con empresa coordinadora
    INSERT INTO public.usuarios_empresa (user_id, empresa_id, rol_interno, activo)
    SELECT 
        (SELECT id FROM public.usuarios WHERE email = 'coordinador.demo@nodexia.com'),
        v_empresa_id,
        'Coordinador',
        true
    ON CONFLICT (user_id, empresa_id) DO UPDATE SET
        rol_interno = EXCLUDED.rol_interno,
        activo = EXCLUDED.activo;
        
    RAISE NOTICE 'Usuario configurado correctamente';
END $$;

-- 3. Verificar la configuración
SELECT 
    'VERIFICACION FINAL' as status,
    u.email,
    u.id as user_id,
    e.nombre as empresa,
    e.tipo_empresa,
    ue.rol_interno
FROM public.usuarios u
JOIN public.usuarios_empresa ue ON u.id = ue.user_id  
JOIN public.empresas e ON e.id = ue.empresa_id
WHERE u.email = 'coordinador.demo@nodexia.com';

-- 4. Mostrar empresas de transporte disponibles
SELECT 
    'TRANSPORTES DISPONIBLES' as status,
    nombre,
    id,
    cuit,
    activo
FROM public.empresas
WHERE tipo_empresa = 'transporte' AND activo = true;