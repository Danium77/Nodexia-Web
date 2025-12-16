-- Diagnostico ultra basico

-- 1. Usuario en auth.users
SELECT 
  'AUTH.USERS' as tabla,
  id::text as user_id,
  email,
  email_confirmed_at
FROM auth.users
WHERE email = 'luis@centro.com.ar';

-- 2. Contar registros en usuarios
SELECT 
  'USUARIOS' as tabla,
  COUNT(*) as total
FROM usuarios;

-- 3. Contar registros en profiles
SELECT 
  'PROFILES' as tabla,
  COUNT(*) as total
FROM profiles;

-- 4. Vinculos de Luis en usuarios_empresa
SELECT 
  'USUARIOS_EMPRESA' as tabla,
  ue.user_id::text,
  ue.nombre_completo,
  ue.email_interno,
  ue.rol_interno,
  ue.activo,
  e.razon_social as empresa
FROM usuarios_empresa ue
LEFT JOIN empresas e ON ue.empresa_id = e.id
WHERE ue.email_interno ILIKE '%luis%'
   OR ue.nombre_completo ILIKE '%luis%';
