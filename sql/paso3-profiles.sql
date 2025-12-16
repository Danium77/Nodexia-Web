-- 3. Buscar a Luis en profiles
SELECT *
FROM profiles
WHERE id = (SELECT id FROM auth.users WHERE email = 'luis@centro.com.ar');
