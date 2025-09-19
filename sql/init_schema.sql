-- sql/init_schema.sql
-- Esquema inicial para Nodexia-Web (compatible con Supabase/Postgres)
-- Crea tablas necesarias, constraints, índices y una función RPC para listar usuarios con detalles.
-- Ejecútalo en el SQL editor de Supabase (o psql) para recrear la base de datos.

BEGIN;

-- Tabla de perfiles de empresa
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  cuit text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cuit_idx ON public.profiles (cuit);

-- Tabla de roles
CREATE TABLE IF NOT EXISTS public.roles (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE
);

-- Tabla que vincula usuarios (auth.users) con perfil y rol
CREATE TABLE IF NOT EXISTS public.profile_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE, -- vinculado a auth.users.id
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id integer NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  nombre text,
  apellido text,
  dni text,
  localidad text,
  telefono text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profile_users_profile_id ON public.profile_users(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_users_role_id ON public.profile_users(role_id);

-- Tabla opcional 'usuarios' usada para almacenar metadata de usuario (nombre_completo)
-- En muchas implementaciones se podría usar directamente auth.users.user_metadata, pero el código consulta 'usuarios'.
CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid PRIMARY KEY, -- debe coincidir con auth.users.id
  email text,
  nombre_completo text,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- Tabla de transportes
CREATE TABLE IF NOT EXISTS public.transportes (
  id serial PRIMARY KEY,
  nombre text NOT NULL,
  descripcion text,
  created_at timestamptz DEFAULT now()
);

-- Tabla de despachos (logística)
CREATE TABLE IF NOT EXISTS public.despachos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id text,
  origen text,
  destino text,
  estado text,
  scheduled_at timestamptz,
  created_by uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  transport_id integer REFERENCES public.transportes(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  type text,
  created_at timestamptz DEFAULT now()
);

-- FUNCTION: get_users_with_details
-- Devuelve listado de usuarios enriquecido con perfil y rol (se usa en /api/admin/listar-usuarios)
-- Si existe una versión anterior con distinto tipo de retorno, la eliminamos primero
DROP FUNCTION IF EXISTS public.get_users_with_details();

CREATE OR REPLACE FUNCTION public.get_users_with_details()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  dni text,
  profile_id uuid,
  profile_name text,
  role_id integer,
  role_name text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
  -- Prefer the name stored in profile_users; if missing, fall back to the user's email.
  COALESCE(NULLIF(TRIM(CONCAT(COALESCE(pu.nombre, ''), ' ', COALESCE(pu.apellido, ''))), ''), (u.email::text)) AS full_name,
    pu.dni,
    pu.profile_id,
    pr.name AS profile_name,
    pu.role_id,
    r.name AS role_name,
    pu.created_at
  FROM auth.users u
  LEFT JOIN public.profile_users pu ON pu.user_id = u.id
  LEFT JOIN public.profiles pr ON pr.id = pu.profile_id
  LEFT JOIN public.roles r ON r.id = pu.role_id
  ORDER BY full_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Seeds básicos (robustos: manejan el caso en que la tabla `roles` use un enum llamado `user_role`)
DO $$
BEGIN
  -- Intentamos insertar 'admin'. Si falla por enum no existente, añadimos la etiqueta al enum y reintentamos.
  BEGIN
    INSERT INTO public.roles (name) VALUES ('admin') ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'user_role' AND e.enumlabel = 'admin'
      ) THEN
        EXECUTE 'ALTER TYPE user_role ADD VALUE ''admin''';
      END IF;
    END IF;
    BEGIN
      INSERT INTO public.roles (name) VALUES ('admin') ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      -- ignore if still failing
    END;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.roles (name) VALUES ('user') ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'user_role' AND e.enumlabel = 'user'
      ) THEN
        EXECUTE 'ALTER TYPE user_role ADD VALUE ''user''';
      END IF;
    END IF;
    BEGIN
      INSERT INTO public.roles (name) VALUES ('user') ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      -- ignore
    END;
  END;
END;
$$;

-- Ejemplo: crear un perfil de empresa de ejemplo
INSERT INTO public.profiles (id, name, type, cuit)
VALUES (gen_random_uuid(), 'Empresa Demo', 'cliente', '00000000000')
ON CONFLICT DO NOTHING;

COMMIT;

-- Notas:
-- 1) La función usa la tabla auth.users que existe en instancias de Supabase. Si tu proyecto usa otra ubicación para usuarios,
--    ajusta la consulta.
-- 2) Después de ejecutar este SQL, crea un usuario administrador en Supabase Auth y luego inserta una fila en public.profile_users
--    asignándole el role 'admin' y el profile adecuado (usa el id de perfil creado arriba).
-- 3) Para insertarlo manualmente (ejemplo):
--    INSERT INTO public.profile_users (user_id, profile_id, role_id, nombre, apellido) VALUES ('<USER_UUID>','<PROFILE_UUID>', 1, 'Admin', 'Demo');
-- 4) Si no tienes la extensión pgcrypto instalada, reemplaza gen_random_uuid() por uuid_generate_v4() o usa funciones disponibles.
