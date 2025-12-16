-- Script de solucion completa para usuario Luis
-- Adaptado a la estructura real de tu base de datos

DO $$
DECLARE
  v_user_id UUID := '59371825-6099-438c-b2f9-e3ba42f3216';
  v_email TEXT := 'luis@centro.com.ar';
  v_nombre TEXT := 'Luis Martinez';
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CONFIGURANDO USUARIO LUIS';
  RAISE NOTICE '========================================';

  -- 1. Crear entrada en profiles (si la tabla existe)
  BEGIN
    INSERT INTO profiles (
      id,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE '✓ Perfil creado en profiles';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠ Error en profiles (tabla puede no existir): %', SQLERRM;
  END;

  -- 2. Crear entrada en usuarios (si la tabla existe)
  BEGIN
    INSERT INTO usuarios (
      id,
      email,
      nombre_completo,
      activo,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_email,
      v_nombre,
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      nombre_completo = EXCLUDED.nombre_completo,
      activo = EXCLUDED.activo,
      updated_at = NOW();
    
    RAISE NOTICE '✓ Usuario creado en tabla usuarios';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠ Error en usuarios: %', SQLERRM;
  END;

  -- 3. Actualizar metadata en auth.users
  UPDATE auth.users
  SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
      'full_name', v_nombre,
      'nombre_completo', v_nombre
    ),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW()
  WHERE id = v_user_id;
  
  RAISE NOTICE '✓ Metadata actualizada en auth.users';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'CONFIGURACION COMPLETADA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Usuario: %', v_email;
  RAISE NOTICE 'ID: %', v_user_id;
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANTE: Ahora debes:';
  RAISE NOTICE '1. Establecer password en Dashboard > Auth > Users';
  RAISE NOTICE '2. Vincular a empresa desde UI del admin';
  RAISE NOTICE '';

END;
$$;

-- Verificacion final
SELECT 
  'VERIFICACION' as tipo,
  (SELECT COUNT(*) FROM usuarios WHERE email = 'luis@centro.com.ar') as en_usuarios,
  (SELECT COUNT(*) FROM profiles WHERE id::text = '59371825-6099-438c-b2f9-e3ba42f3216') as en_profiles,
  (SELECT email_confirmed_at IS NOT NULL FROM auth.users WHERE email = 'luis@centro.com.ar') as email_confirmado;
