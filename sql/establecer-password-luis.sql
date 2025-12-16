-- Establecer password para Luis Martinez directamente
-- Password: Luis2025!

UPDATE auth.users
SET 
  encrypted_password = crypt('Luis2025!', gen_salt('bf')),
  email_confirmed_at = NOW()
WHERE email = 'luis@centro.com.ar';

-- Verificar
SELECT 
  email,
  email_confirmed_at IS NOT NULL as confirmado,
  encrypted_password IS NOT NULL as tiene_password
FROM auth.users
WHERE email = 'luis@centro.com.ar';
