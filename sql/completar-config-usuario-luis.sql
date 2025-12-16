-- Script para completar la configuración del usuario Luis
-- Este script asume que:
-- 1. El usuario existe en auth.users (UID: 59371825-6099-438c-b2f9-e3ba42f3216)
-- 2. Ya está vinculado en usuarios_empresa desde la UI
-- 3. Necesita completar: usuarios, profiles, metadata

DO $$
DECLARE
  v_user_id UUID := '59371825-6099-438c-b2f9-e3ba42f3216';
  v_empresa_id UUID;
  v_rol_interno TEXT;
  v_rol_empresa_id UUID;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'COMPLETANDO CONFIGURACION DE LUIS';
  RAISE NOTICE '========================================';

  -- 1. Obtener datos del vínculo existente en usuarios_empresa
  SELECT 
    empresa_id, 
    rol_interno,
    rol_empresa_id
  INTO v_empresa_id, v_rol_interno, v_rol_empresa_id
  FROM usuarios_empresa
  WHERE user_id = v_user_id
  AND activo = true
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'No se encontro vinculo en usuarios_empresa para este usuario';
  END IF;

  RAISE NOTICE 'Vinculo encontrado - Empresa ID: %', v_empresa_id;
  RAISE NOTICE 'Rol interno: %', v_rol_interno;

  -- 2. Crear/actualizar perfil en profiles
  INSERT INTO profiles (
    id,
    email,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'luis@centro.com.ar',
    'Luis Martinez',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  RAISE NOTICE '✓ Perfil creado/actualizado';

  -- 3. Determinar rol principal correcto
  -- Convertir rol_interno a rol_principal estándar
  DECLARE
    v_rol_principal TEXT;
  BEGIN
    CASE LOWER(v_rol_interno)
      WHEN 'operador' THEN v_rol_principal := 'coordinador_transporte';
      WHEN 'coordinador' THEN v_rol_principal := 'coordinador_transporte';
      WHEN 'coordinador_transporte' THEN v_rol_principal := 'coordinador_transporte';
      WHEN 'admin' THEN v_rol_principal := 'coordinador_transporte';
      ELSE v_rol_principal := 'coordinador_transporte'; -- Default para transporte
    END CASE;

    RAISE NOTICE 'Rol principal asignado: %', v_rol_principal;

    -- 4. Crear/actualizar entrada en tabla usuarios
    INSERT INTO usuarios (
      id,
      email,
      nombre_completo,
      rol_principal,
      empresa_id,
      activo,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      'luis@centro.com.ar',
      'Luis Martinez',
      v_rol_principal,
      v_empresa_id,
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      nombre_completo = EXCLUDED.nombre_completo,
      rol_principal = EXCLUDED.rol_principal,
      empresa_id = EXCLUDED.empresa_id,
      activo = EXCLUDED.activo,
      updated_at = NOW();

    RAISE NOTICE '✓ Usuario creado/actualizado en tabla usuarios';

    -- 5. Actualizar metadata en auth.users
    UPDATE auth.users
    SET 
      raw_user_meta_data = jsonb_build_object(
        'full_name', 'Luis Martinez',
        'rol', v_rol_principal,
        'empresa_id', v_empresa_id
      ),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = v_user_id;

    RAISE NOTICE '✓ Metadata actualizada en auth.users';

    -- 6. Asegurar que rol_empresa_id esté correcto en usuarios_empresa
    IF v_rol_empresa_id IS NULL THEN
      -- Buscar el rol correcto
      SELECT id INTO v_rol_empresa_id
      FROM roles_empresa
      WHERE nombre IN ('coordinador_transporte', 'operador', 'coordinador', 'admin')
      LIMIT 1;

      IF v_rol_empresa_id IS NOT NULL THEN
        UPDATE usuarios_empresa
        SET rol_empresa_id = v_rol_empresa_id
        WHERE user_id = v_user_id
        AND empresa_id = v_empresa_id;
        
        RAISE NOTICE '✓ rol_empresa_id actualizado';
      ELSE
        RAISE NOTICE '⚠ No se encontro rol_empresa adecuado';
      END IF;
    END IF;

  END;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ CONFIGURACION COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Email: luis@centro.com.ar';
  RAISE NOTICE 'Password: Luis2025! (configurar en Dashboard)';
  RAISE NOTICE 'Rol: Coordinador de Transporte';
  RAISE NOTICE '';
  RAISE NOTICE 'El usuario ahora debe aparecer en:';
  RAISE NOTICE '  - Lista de usuarios de admin Nodexia';
  RAISE NOTICE '  - Puede hacer login en la aplicacion';
  RAISE NOTICE '';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '========================================';
  RAISE NOTICE '❌ ERROR EN LA CONFIGURACION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Error: %', SQLERRM;
  RAISE;
END;
$$;

-- Verificación final
SELECT 
  '=== VERIFICACION FINAL ===' as etapa,
  NULL::uuid as id,
  NULL::text as tabla,
  NULL::text as email,
  NULL::text as nombre,
  NULL::text as rol,
  NULL::boolean as activo
UNION ALL
SELECT 
  'auth.users',
  id,
  'auth',
  email,
  (raw_user_meta_data->>'full_name')::text,
  (raw_user_meta_data->>'rol')::text,
  (email_confirmed_at IS NOT NULL) as activo
FROM auth.users
WHERE email = 'luis@centro.com.ar'
UNION ALL
SELECT 
  'usuarios',
  id,
  'usuarios',
  email,
  nombre_completo,
  rol_principal,
  activo
FROM usuarios
WHERE email = 'luis@centro.com.ar'
UNION ALL
SELECT 
  'profiles',
  id,
  'profiles',
  email,
  full_name,
  NULL,
  true
FROM profiles
WHERE email = 'luis@centro.com.ar'
UNION ALL
SELECT 
  'usuarios_empresa',
  ue.user_id,
  'usuarios_empresa',
  ue.email_interno,
  ue.nombre_completo,
  ue.rol_interno,
  ue.activo
FROM usuarios_empresa ue
WHERE ue.user_id = '59371825-6099-438c-b2f9-e3ba42f3216'
ORDER BY etapa;
