-- Diagnostico ultra simple - por ID de usuario

-- 1. Usuario en auth.users
SELECT 
  'AUTH.USERS' as fuente,
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE id = '59371825-6099-438c-b2f9-e3ba42f3216'::uuid;

-- 2. Usuario en tabla usuarios (por ID)
SELECT 
  'USUARIOS' as fuente,
  *
FROM usuarios
WHERE id = '59371825-6099-438c-b2f9-e3ba42f3216'::uuid;

-- 3. Usuario en profiles (por ID)
SELECT 
  'PROFILES' as fuente,
  *
FROM profiles
WHERE id = '59371825-6099-438c-b2f9-e3ba42f3216'::uuid;

-- 4. Vinculos en usuarios_empresa
SELECT 
  'USUARIOS_EMPRESA' as fuente,
  ue.id as vinculo_id,
  ue.user_id,
  ue.empresa_id,
  ue.rol_interno,
  ue.rol_empresa_id,
  ue.nombre_completo,
  ue.activo,
  e.razon_social as empresa_nombre,
  e.tipo_empresa
FROM usuarios_empresa ue
LEFT JOIN empresas e ON ue.empresa_id = e.id
WHERE ue.user_id = '59371825-6099-438c-b2f9-e3ba42f3216'::uuid;
