-- Diagnóstico de usuarios para entender por qué no coinciden los IDs

-- 1. Ver usuarios en auth.users que contengan "zayas"
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE LOWER(email) LIKE '%zayas%'
   OR LOWER(raw_user_meta_data::text) LIKE '%zayas%';

-- 2. Ver usuarios en usuarios_empresa que contengan "zayas"
SELECT 
  user_id,
  nombre_completo,
  rol_interno,
  activo,
  telefono_interno,
  empresa_id
FROM usuarios_empresa
WHERE LOWER(nombre_completo) LIKE '%zayas%';

-- 3. Ver todos los user_id en usuarios_empresa
SELECT DISTINCT user_id, nombre_completo
FROM usuarios_empresa
ORDER BY nombre_completo;

-- 4. Ver todos los emails en auth.users
SELECT id, email, email_confirmed_at
FROM auth.users
ORDER BY email;

-- 5. Comparar: ¿Hay user_ids en usuarios_empresa que NO existan en auth.users?
SELECT 
  ue.user_id,
  ue.nombre_completo,
  CASE 
    WHEN au.id IS NULL THEN '❌ NO EXISTE EN AUTH'
    ELSE '✅ EXISTE'
  END as estado,
  au.email
FROM usuarios_empresa ue
LEFT JOIN auth.users au ON au.id = ue.user_id
ORDER BY ue.nombre_completo;
