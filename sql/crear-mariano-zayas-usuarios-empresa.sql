-- Buscar a Mariano Zayas en auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'mariano@logisticaexpres.com';

-- Verificar si ya existe en usuarios_empresa
SELECT * FROM usuarios_empresa 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'mariano@logisticaexpres.com'
);

-- Insertar a Mariano en usuarios_empresa si existe en auth.users
DO $$
DECLARE
  v_user_id uuid;
  v_empresa_id uuid := '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'; -- Logística Express SRL
BEGIN
  -- Buscar el user_id de Mariano
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'mariano@logisticaexpres.com';

  IF v_user_id IS NOT NULL THEN
    -- Eliminar si existe (para evitar duplicados)
    DELETE FROM usuarios_empresa 
    WHERE user_id = v_user_id AND empresa_id = v_empresa_id;

    -- Insertar
    INSERT INTO usuarios_empresa (
      user_id,
      empresa_id,
      rol_interno,
      activo,
      nombre_completo,
      telefono_interno,
      departamento,
      fecha_vinculacion
    )
    VALUES (
      v_user_id,
      v_empresa_id,
      'chofer',
      true,
      'Mariano Demian Zayas',
      '+5493564389373',
      'Operaciones',
      NOW()
    );

    RAISE NOTICE '✅ Usuario Mariano Zayas agregado a usuarios_empresa';
  ELSE
    RAISE NOTICE '❌ Usuario mariano@logisticaexpres.com no encontrado en auth.users';
  END IF;
END $$;

-- Verificar el resultado
SELECT 
  ue.user_id,
  ue.nombre_completo,
  ue.rol_interno,
  ue.activo,
  ue.telefono_interno,
  e.nombre as empresa_nombre,
  u.email
FROM usuarios_empresa ue
LEFT JOIN empresas e ON e.id = ue.empresa_id
LEFT JOIN auth.users u ON u.id = ue.user_id
WHERE LOWER(ue.nombre_completo) LIKE '%zayas%'
ORDER BY ue.nombre_completo;
