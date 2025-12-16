-- Buscar el usuario Mariano/Walter Zayas en auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'mariano@logisticaexpres.com';

-- También buscar por cualquier variante de zayas
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE LOWER(email) LIKE '%zayas%'
   OR LOWER(raw_user_meta_data->>'nombre') LIKE '%zayas%'
   OR LOWER(raw_user_meta_data->>'apellido') LIKE '%zayas%';
