-- PASO 2: Verificar usuarios en public.usuarios
SELECT 
    'public.usuarios' as tabla,
    email,
    id as user_id,
    nombre_completo,
    created_at
FROM public.usuarios 
WHERE email IN (
    'coordinador.demo@nodexia.com',
    'coord_demo@example.com'
)
ORDER BY email;