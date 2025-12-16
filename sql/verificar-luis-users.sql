-- Verificar en qué tabla existe Luis
-- Buscar en auth.users
SELECT 'auth.users' as tabla, id, email, created_at 
FROM auth.users 
WHERE email = 'luis@centro.com.ar'

UNION ALL

-- Buscar en public.users (si existe)
SELECT 'public.users' as tabla, id::text, email, created_at 
FROM users 
WHERE email = 'luis@centro.com.ar';
