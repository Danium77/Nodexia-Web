-- Script para verificar y configurar usuario transporte.demo
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si el usuario existe en auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'transporte.demo@nodexia.com';

-- 2. Verificar si existe en profile_users
SELECT pu.*, r.name as role_name
FROM profile_users pu
JOIN roles r ON pu.role_id = r.id
WHERE pu.user_id IN (
    SELECT id FROM auth.users WHERE email = 'transporte.demo@nodexia.com'
);

-- 3. Si no existe en profile_users, crearlo (reemplazar USER_ID_AQUI con el ID real)
-- INSERT INTO profile_users (user_id, profile_id, role_id, nombre, apellido)
-- SELECT 
--     'USER_ID_AQUI',
--     (SELECT id FROM profiles WHERE nombre = 'Transporte' LIMIT 1),
--     (SELECT id FROM roles WHERE name = 'transporte'),
--     'Demo',
--     'Transporte'
-- WHERE NOT EXISTS (
--     SELECT 1 FROM profile_users WHERE user_id = 'USER_ID_AQUI'
-- );

-- 4. Verificar políticas en tabla documentos
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'documentos';

-- 5. Verificar si RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'documentos';

-- 6. Verificar estructura de tabla documentos
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'documentos' AND table_schema = 'public'
ORDER BY ordinal_position;