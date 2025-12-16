-- Diagnostico simplificado - buscar por email y vinculo

-- 1. Buscar usuario en auth.users por email
SELECT 
  'AUTH.USERS' as fuente,
  id::text as user_id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'luis@centro.com.ar';

-- 2. Buscar en usuarios por email  
SELECT 
  'USUARIOS' as fuente,
  COUNT(*) as registros_encontrados
FROM usuarios
WHERE email = 'luis@centro.com.ar';

-- 3. Buscar en profiles
SELECT 
  'PROFILES' as fuente,
  COUNT(*) as registros_encontrados
FROM profiles
WHERE full_name ILIKE '%luis%';

-- 4. Buscar vinculos en usuarios_empresa por email interno
SELECT 
  'USUARIOS_EMPRESA' as fuente,
  ue.id::text as vinculo_id,
  ue.user_id::text,
  ue.empresa_id::text,
  ue.rol_interno,
  ue.nombre_completo,
  ue.email_interno,
  ue.activo,
  e.razon_social as empresa_nombre,
  e.tipo_empresa
FROM usuarios_empresa ue
LEFT JOIN empresas e ON ue.empresa_id = e.id
WHERE ue.email_interno = 'luis@centro.com.ar'
   OR ue.nombre_completo ILIKE '%luis%';
