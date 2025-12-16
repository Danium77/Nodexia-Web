-- 1. Usuario en auth.users
SELECT 
  'AUTH.USERS' as tabla,
  id,
  email,
  email_confirmed_at,
  raw_user_meta_data,
  created_at
FROM auth.users
WHERE email = 'luis@centro.com.ar';

-- 2. Usuario en tabla usuarios
SELECT 
  'USUARIOS' as tabla,
  id,
  email,
  nombre_completo,
  rol_principal,
  empresa_id,
  activo,
  created_at
FROM usuarios
WHERE email = 'luis@centro.com.ar';

-- 3. Usuario en profiles
SELECT 
  'PROFILES' as tabla,
  id,
  email,
  full_name,
  created_at
FROM profiles
WHERE email = 'luis@centro.com.ar';

-- 4. Vínculos en usuarios_empresa
SELECT 
  'USUARIOS_EMPRESA' as tabla,
  ue.id,
  ue.user_id,
  ue.empresa_id,
  ue.rol_interno,
  ue.rol_empresa_id,
  ue.nombre_completo,
  ue.activo,
  e.razon_social as empresa_nombre,
  e.tipo_empresa,
  ue.created_at
FROM usuarios_empresa ue
LEFT JOIN empresas e ON ue.empresa_id = e.id
WHERE ue.user_id = '59371825-6099-438c-b2f9-e3ba42f3216';

-- 5. Roles asignados (si rol_empresa_id existe)
SELECT 
  'ROLES_EMPRESA' as tabla,
  ue.id as vinculo_id,
  ue.rol_interno,
  ue.rol_empresa_id,
  re.nombre as rol_nombre,
  re.descripcion,
  re.permisos
FROM usuarios_empresa ue
LEFT JOIN roles_empresa re ON ue.rol_empresa_id = re.id
WHERE ue.user_id = '59371825-6099-438c-b2f9-e3ba42f3216';
