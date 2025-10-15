-- Crear usuario coordinador.demo@nodexia.com en auth.users
-- EJECUTAR SOLO SI QUIERES CREAR EL USUARIO FALTANTE

-- 1. Crear usuario en auth.users (esto normalmente se hace via signup)
-- Nota: No podemos insertar directamente en auth.users desde SQL
-- Necesitas usar la interfaz de Supabase Auth o signup en la app

-- 2. Una vez creado el usuario, ejecutar esto para asociarlo:
INSERT INTO public.usuarios (id, email, nombre_completo)
SELECT 
    id,
    'coordinador.demo@nodexia.com',
    'Coordinador Demo Nodexia'
FROM auth.users 
WHERE email = 'coordinador.demo@nodexia.com'
ON CONFLICT (email) DO UPDATE SET
    nombre_completo = EXCLUDED.nombre_completo;

-- 3. Asociar con empresa coordinadora
INSERT INTO public.usuarios_empresa (user_id, empresa_id, rol_interno, activo)
SELECT 
    u.id,
    e.id,
    'Coordinador',
    true
FROM public.usuarios u
CROSS JOIN public.empresas e
WHERE u.email = 'coordinador.demo@nodexia.com'
AND e.tipo_empresa = 'coordinador'
ON CONFLICT (user_id, empresa_id) DO UPDATE SET
    rol_interno = EXCLUDED.rol_interno,
    activo = EXCLUDED.activo;