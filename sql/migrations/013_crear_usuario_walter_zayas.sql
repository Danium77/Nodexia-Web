-- =====================================================
-- Crear usuario para chofer Walter Zayas
-- Logística Express
-- Fecha: 2025-11-23
-- =====================================================

-- 1. Verificar que el chofer existe en la tabla choferes
DO $$
DECLARE
  v_chofer_id UUID;
  v_empresa_id UUID;
  v_user_id UUID;
BEGIN
  -- Buscar el chofer por DNI
  SELECT id, empresa_id INTO v_chofer_id, v_empresa_id
  FROM choferes
  WHERE dni = '30123456' AND cuil = '1121608941';
  
  IF v_chofer_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el chofer con DNI 30123456 y CUIL 1121608941';
  END IF;
  
  RAISE NOTICE 'Chofer encontrado: % - Empresa: %', v_chofer_id, v_empresa_id;
  
  -- Verificar si ya tiene un user_id asignado
  IF EXISTS (SELECT 1 FROM choferes WHERE id = v_chofer_id AND user_id IS NOT NULL) THEN
    RAISE NOTICE 'El chofer ya tiene un usuario asignado';
    RETURN;
  END IF;
  
  -- Crear el usuario en auth.users (simulado para Supabase)
  -- NOTA: En Supabase, esto se hace desde el Dashboard o API
  -- Este script solo prepara los datos en la tabla profiles
  
  RAISE NOTICE 'Para completar la creación del usuario:';
  RAISE NOTICE '1. Ir a Supabase Dashboard -> Authentication -> Add User';
  RAISE NOTICE '2. Email: walter.zayas@logisticaexpres.com';
  RAISE NOTICE '3. Password: (temporal, cambiar en primer login)';
  RAISE NOTICE '4. Luego ejecutar la segunda parte del script con el UUID generado';
  
END $$;

-- =====================================================
-- PARTE 2: Ejecutar DESPUÉS de crear el usuario en Supabase Dashboard
-- Reemplazar 'USER_UUID_AQUI' con el UUID real del usuario creado
-- =====================================================

/*
DO $$
DECLARE
  v_user_id UUID := 'USER_UUID_AQUI'; -- REEMPLAZAR con UUID real
  v_chofer_id UUID;
  v_empresa_id UUID;
BEGIN
  -- Buscar el chofer
  SELECT id, empresa_id INTO v_chofer_id, v_empresa_id
  FROM choferes
  WHERE dni = '30123456' AND cuil = '1121608941';
  
  -- Crear perfil del usuario
  INSERT INTO profiles (
    id,
    email,
    full_name,
    rol_primario,
    empresa_id,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'walter.zayas@logisticaexpres.com',
    'Walter Zayas',
    'chofer',
    v_empresa_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    rol_primario = 'chofer',
    empresa_id = v_empresa_id,
    updated_at = NOW();
  
  -- Asociar el usuario con el chofer
  UPDATE choferes
  SET 
    user_id = v_user_id,
    updated_at = NOW()
  WHERE id = v_chofer_id;
  
  RAISE NOTICE '✅ Usuario creado y vinculado correctamente';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Chofer ID: %', v_chofer_id;
  RAISE NOTICE 'Email: walter.zayas@logisticaexpres.com';
  
END $$;
*/

-- =====================================================
-- Consulta de verificación
-- =====================================================
SELECT 
  c.id as chofer_id,
  c.nombre,
  c.apellido,
  c.dni,
  c.cuil,
  c.user_id,
  c.empresa_id,
  e.razon_social as empresa,
  p.email,
  p.rol_primario
FROM choferes c
LEFT JOIN profiles p ON c.user_id = p.id
LEFT JOIN empresas e ON c.empresa_id = e.id
WHERE c.dni = '30123456' AND c.cuil = '1121608941';
