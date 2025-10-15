-- Ejecuta cada consulta por separado para ver los resultados

-- PASO 1: Verificar usuarios en auth.users
SELECT 
    'auth.users' as tabla,
    email,
    id as user_id,
    created_at
FROM auth.users 
WHERE email IN (
    'coordinador.demo@nodexia.com',
    'coord_demo@example.com'
)
ORDER BY email;