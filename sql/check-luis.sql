-- Diagnostico minimo sin joins

-- 1. Usuario en auth.users
SELECT 
  'AUTH.USERS' as tabla,
  id::text as user_id,
  email,
  email_confirmed_at
FROM auth.users
WHERE email = 'luis@centro.com.ar';

-- 2. Total usuarios
SELECT 
  'USUARIOS' as tabla,
  COUNT(*) as total
FROM usuarios;

-- 3. Total profiles  
SELECT 
  'PROFILES' as tabla,
  COUNT(*) as total
FROM profiles;

-- 4. Vinculo de Luis
SELECT 
  'USUARIOS_EMPRESA' as tabla,
  user_id::text,
  empresa_id::text,
  nombre_completo,
  email_interno,
  rol_interno,
  activo
FROM usuarios_empresa
WHERE email_interno ILIKE '%luis%'
   OR nombre_completo ILIKE '%luis%';
