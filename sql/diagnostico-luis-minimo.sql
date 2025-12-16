-- Diagnostico minimo - solo columnas basicas

-- 1. Usuario en auth.users
SELECT 
  'AUTH.USERS' as tabla,
  id,
  email,
  email_confirmed_at
FROM auth.users
WHERE email = 'luis@centro.com.ar';

-- 2. Usuario en tabla usuarios (solo columnas basicas)
SELECT 
  'USUARIOS' as tabla,
  *
FROM usuarios
WHERE email = 'luis@centro.com.ar';

-- 3. Usuario en profiles
SELECT 
  'PROFILES' as tabla,
  *
FROM profiles
WHERE email = 'luis@centro.com.ar';

-- 4. Vinculos en usuarios_empresa (todo)
SELECT 
  'USUARIOS_EMPRESA' as tabla,
  ue.*,
  e.razon_social as empresa_nombre
FROM usuarios_empresa ue
LEFT JOIN empresas e ON ue.empresa_id = e.id
WHERE ue.user_id = '59371825-6099-438c-b2f9-e3ba42f3216';
