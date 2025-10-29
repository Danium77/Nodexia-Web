-- =============================================
-- AGREGAR TIPO EMPRESA "SISTEMA" (limpio)
-- Para empresas de plataforma como Nodexia
-- =============================================

-- 0) Asegurar que existe un índice único sobre empresas.cuit (necesario para ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS idx_empresas_cuit_unique ON public.empresas (cuit);

-- 1) Actualizar constraint tipo_empresa para incluir 'sistema'
DO $$
BEGIN
    ALTER TABLE public.empresas DROP CONSTRAINT IF EXISTS empresas_tipo_empresa_check;
    ALTER TABLE public.empresas
        ADD CONSTRAINT empresas_tipo_empresa_check
        CHECK (tipo_empresa IN ('sistema', 'planta', 'transporte', 'cliente'));
    RAISE NOTICE 'Constraint actualizado: tipo_empresa ahora incluye "sistema"';
END$$;

-- 2) Upsert empresa Nodexia (crea si no existe, actualiza si existe)
INSERT INTO public.empresas (nombre, cuit, tipo_empresa, direccion, localidad, provincia, activo)
VALUES ('Nodexia', '00-00000000-0', 'sistema', 'Oficina Central', 'Rosario', 'Santa Fe', true)
ON CONFLICT (cuit) DO UPDATE
    SET tipo_empresa = EXCLUDED.tipo_empresa,
            nombre = EXCLUDED.nombre,
            direccion = EXCLUDED.direccion,
            localidad = EXCLUDED.localidad,
            provincia = EXCLUDED.provincia,
            activo = EXCLUDED.activo;

-- 3) Mostrar id de Nodexia (informativo)
DO $$
DECLARE v_id UUID;
BEGIN
    SELECT id INTO v_id FROM public.empresas WHERE cuit = '00-00000000-0' LIMIT 1;
    RAISE NOTICE 'Nodexia ID: %', v_id;
END$$;

-- 4) Insertar/actualizar roles del tipo 'sistema'
INSERT INTO public.roles_empresa (nombre_rol, descripcion, tipo_empresa, permisos, activo)
VALUES
    ('administrador', 'Administrador con acceso total al sistema', 'sistema',
     '{
            "gestionar_usuarios": true,
            "gestionar_empresas": true,
            "gestionar_solicitudes": true,
            "ver_reportes_globales": true,
            "configurar_sistema": true,
            "gestionar_red_nodexia": true,
            "ver_todas_transacciones": true
        }'::jsonb,
     true),
    ('administrativo', 'Administrativo con permisos limitados', 'sistema',
     '{
            "gestionar_solicitudes": true,
            "ver_reportes_globales": true,
            "ver_empresas": true
        }'::jsonb,
     true)
ON CONFLICT (nombre_rol, tipo_empresa) DO UPDATE
    SET descripcion = EXCLUDED.descripcion,
            permisos = EXCLUDED.permisos,
            activo = EXCLUDED.activo;

-- 5) Vincular admin.demo@nodexia.com como 'administrador' si existe
DO $$
DECLARE
    v_empresa_id UUID;
    v_user_id UUID;
BEGIN
    SELECT id INTO v_empresa_id FROM public.empresas WHERE cuit = '00-00000000-0' LIMIT 1;
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin.demo@nodexia.com' LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'Usuario admin.demo@nodexia.com NO existe en auth.users. Crea el usuario en Supabase Dashboard si quieres vincularlo ahora.';
    ELSE
        -- Eliminar vinculaciones previas (opcional, para forzar estado conocido)
        DELETE FROM public.usuarios_empresa
            WHERE user_id = v_user_id AND empresa_id = v_empresa_id;

        INSERT INTO public.usuarios_empresa (user_id, empresa_id, rol_interno, activo, nombre_completo, fecha_vinculacion)
        VALUES (v_user_id, v_empresa_id, 'administrador', true, 'Admin Demo', now());

        RAISE NOTICE 'Usuario admin.demo@nodexia.com vinculado como administrador a Nodexia (sistema).';
    END IF;
END$$;

-- 6) Resultado final: mostrar la vinculación (si existe)
SELECT u.email, e.nombre AS empresa, e.tipo_empresa, ue.rol_interno, ue.activo
FROM public.usuarios_empresa ue
JOIN auth.users u ON u.id = ue.user_id
JOIN public.empresas e ON e.id = ue.empresa_id
WHERE u.email = 'admin.demo@nodexia.com';
