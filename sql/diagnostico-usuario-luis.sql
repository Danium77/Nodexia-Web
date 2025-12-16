-- Diagnóstico del usuario Luis
-- Verificar estado actual en todas las tablas relevantes

-- 1. Usuario en auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  raw_user_meta_data,
  created_at
FROM auth.users
WHERE email = 'luis@centro.com.ar';

-- 2. Usuario en tabla usuarios
SELECT 
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
  id,
  email,
  full_name,
  created_at
FROM profiles
WHERE email = 'luis@centro.com.ar';

-- 4. Vínculos en usuarios_empresa
SELECT 
  ue.id,
  ue.user_id,
  ue.empresa_id,
  ue.rol_interno,
  ue.nombre_completo,
  ue.activo,
  e.razon_social as empresa_nombre,
  e.tipo_empresa,
  ue.created_at
FROM usuarios_empresa ue
LEFT JOIN empresas e ON ue.empresa_id = e.id
WHERE ue.user_id = '59371825-6099-438c-b2f9-e3ba42f3216';

-- 5. Roles asignados
SELECT 
  ue.id,
  ue.rol_interno,
  re.nombre as rol_nombre,
  re.descripcion,
  re.permisos
FROM usuarios_empresa ue
LEFT JOIN roles_empresa re ON ue.rol_empresa_id = re.id
WHERE ue.user_id = '59371825-6099-438c-b2f9-e3ba42f3216';
