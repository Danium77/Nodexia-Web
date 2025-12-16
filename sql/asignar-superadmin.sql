-- PASO 1: Ver estructura de la tabla profiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- PASO 2: Ver datos actuales del usuario admin@nodexia.com
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at
FROM auth.users u
WHERE u.email = 'admin@nodexia.com';
