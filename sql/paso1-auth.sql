-- 1. Usuario en auth.users
SELECT 
  'AUTH.USERS' as tabla,
  id::text as user_id,
  email,
  email_confirmed_at
FROM auth.users
WHERE email = 'luis@centro.com.ar';
