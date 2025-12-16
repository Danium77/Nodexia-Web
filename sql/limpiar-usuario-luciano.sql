-- Limpiar usuario duplicado luciano@centro.com.ar para poder recrearlo

-- Ver estado actual
SELECT 
  'auth.users' as tabla,
  id,
  email,
  created_at
FROM auth.users 
WHERE email = 'luciano@centro.com.ar'

UNION ALL

SELECT 
  'usuarios' as tabla,
  id::text,
  email,
  created_at
FROM usuarios 
WHERE email = 'luciano@centro.com.ar'

UNION ALL

SELECT 
  'usuarios_empresa' as tabla,
  user_id::text,
  email_interno,
  fecha_vinculacion
FROM usuarios_empresa 
WHERE email_interno = 'luciano@centro.com.ar';

-- Si necesitas eliminar el usuario parcialmente creado:
/*
-- 1. Eliminar de usuarios_empresa (si existe)
DELETE FROM usuarios_empresa WHERE email_interno = 'luciano@centro.com.ar';

-- 2. Eliminar de usuarios (si existe)
DELETE FROM usuarios WHERE email = 'luciano@centro.com.ar';

-- 3. Eliminar de profiles (si existe)
DELETE FROM profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'luciano@centro.com.ar');

-- 4. Eliminar de auth.users (último paso)
-- Este paso debe hacerse desde Supabase Dashboard > Authentication > Users
-- O usando supabaseAdmin.auth.admin.deleteUser(user_id)
*/
