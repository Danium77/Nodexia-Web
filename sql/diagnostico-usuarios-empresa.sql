-- Ver usuarios existentes en usuarios_empresa para entender la estructura
SELECT 
  user_id,
  email_interno,
  nombre_completo,
  rol_interno,
  empresa_id,
  activo
FROM usuarios_empresa
LIMIT 5;

-- Verificar si el UUID de Luis existe en auth.users
SELECT 
  'Luis en auth.users' as verificacion,
  id, 
  email,
  email_confirmed_at IS NOT NULL as confirmado
FROM auth.users 
WHERE id = '59371825-6099-438c-b2f9-e3ba42f32166';
