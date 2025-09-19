-- sql/seed_admin.sql
-- Seeds adicionales para crear un perfil y un row de profile_users para un admin manualmente.
-- Reemplaza <USER_UUID> por el UUID real del usuario creado en Supabase Auth.

BEGIN;

-- Crear rol admin si no existe
INSERT INTO public.roles (name) VALUES ('admin') ON CONFLICT DO NOTHING;
INSERT INTO public.roles (name) VALUES ('user') ON CONFLICT DO NOTHING;

-- Crear perfil demo
INSERT INTO public.profiles (id, name, type, cuit)
VALUES (gen_random_uuid(), 'Empresa Admin', 'admin', '00000000000')
ON CONFLICT DO NOTHING
RETURNING id;

-- Luego, crea la fila profile_users (manual)
-- INSERT INTO public.profile_users (user_id, profile_id, role_id, nombre, apellido)
-- VALUES ('<USER_UUID>', '<PROFILE_UUID_FROM_ABOVE>', (SELECT id FROM public.roles WHERE name='admin'), 'Admin', 'Demo');

COMMIT;
