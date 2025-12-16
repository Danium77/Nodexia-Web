-- Solución para usuario que quedó a medio crear
-- Este script limpia completamente a luciano@centro.com.ar

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Obtener el user_id
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'luciano@centro.com.ar';
  
  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE 'Limpiando usuario: %', v_user_id;
    
    -- 1. Eliminar de usuarios_empresa
    DELETE FROM usuarios_empresa WHERE user_id = v_user_id;
    RAISE NOTICE 'Eliminado de usuarios_empresa';
    
    -- 2. Eliminar de usuarios
    DELETE FROM usuarios WHERE id = v_user_id;
    RAISE NOTICE 'Eliminado de usuarios';
    
    -- 3. Eliminar de profiles
    DELETE FROM profiles WHERE id = v_user_id;
    RAISE NOTICE 'Eliminado de profiles';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Usuario limpiado de todas las tablas públicas';
    RAISE NOTICE 'Ahora debes eliminar de auth.users manualmente:';
    RAISE NOTICE 'Dashboard > Authentication > Users > Buscar luciano@centro.com.ar > Delete';
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE 'Usuario no encontrado en auth.users';
  END IF;
END;
$$;

-- Verificar que quedó limpio
SELECT 
  'Verificación' as estado,
  COUNT(*) as registros
FROM (
  SELECT id FROM auth.users WHERE email = 'luciano@centro.com.ar'
  UNION ALL
  SELECT id FROM usuarios WHERE email = 'luciano@centro.com.ar'
  UNION ALL
  SELECT id FROM profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'luciano@centro.com.ar')
  UNION ALL
  SELECT user_id FROM usuarios_empresa WHERE email_interno = 'luciano@centro.com.ar'
) as todos;
