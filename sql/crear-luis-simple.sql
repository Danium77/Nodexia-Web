-- Solucion simple sin bloque DO - ejecutar paso a paso

-- PASO 1: Crear en profiles (con columna name requerida)
INSERT INTO profiles (
  id,
  name,
  created_at
) 
SELECT 
  id,
  'Luis Martinez',
  NOW()
FROM auth.users
WHERE email = 'luis@centro.com.ar'
ON CONFLICT (id) DO NOTHING;

-- PASO 2: Crear en usuarios (solo columnas basicas)
INSERT INTO usuarios (
  id,
  email,
  nombre_completo,
  created_at
)
SELECT 
  id,
  email,
  'Luis Martinez',
  NOW()
FROM auth.users
WHERE email = 'luis@centro.com.ar'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  nombre_completo = EXCLUDED.nombre_completo;

-- PASO 3: Actualizar metadata en auth.users
UPDATE auth.users
SET 
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'full_name', 'Luis Martinez',
    'nombre_completo', 'Luis Martinez'
  ),
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  updated_at = NOW()
WHERE email = 'luis@centro.com.ar';

-- VERIFICACION
SELECT 
  'RESULTADO' as estado,
  (SELECT COUNT(*) FROM usuarios WHERE email = 'luis@centro.com.ar') as creado_en_usuarios,
  (SELECT COUNT(*) FROM profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'luis@centro.com.ar')) as creado_en_profiles,
  (SELECT email_confirmed_at IS NOT NULL FROM auth.users WHERE email = 'luis@centro.com.ar') as email_confirmado;
