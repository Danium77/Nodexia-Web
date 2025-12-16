-- ============================================================================
-- Script: Crear Datos Demo para Testing de Alto Volumen
-- Fecha: 2024-12-04
-- Descripción: Crea 10 empresas de transporte y 30 choferes demo
-- ============================================================================

-- ============================================================================
-- PASO 1: Crear 10 Empresas de Transporte Demo
-- ============================================================================
DO $$
DECLARE
  v_empresa_id uuid;
  v_empresa_nombre text;
  i integer;
BEGIN
  FOR i IN 1..10 LOOP
    v_empresa_nombre := 'Transportes ' || 
      CASE i
        WHEN 1 THEN 'Norte'
        WHEN 2 THEN 'Sur'
        WHEN 3 THEN 'Este'
        WHEN 4 THEN 'Oeste'
        WHEN 5 THEN 'Central'
        WHEN 6 THEN 'Rápido'
        WHEN 7 THEN 'Express'
        WHEN 8 THEN 'Continental'
        WHEN 9 THEN 'Nacional'
        WHEN 10 THEN 'Regional'
      END || ' Demo';
    
    -- Crear empresa
    INSERT INTO empresas (
      nombre,
      tipo_empresa,
      cuit,
      telefono,
      email,
      direccion,
      activo
    ) VALUES (
      v_empresa_nombre,
      'transporte',
      '20-' || LPAD((30000000 + i)::text, 8, '0') || '-' || MOD(i, 10),
      '+54 11 ' || (4000 + i * 100) || '-' || (1000 + i * 10),
      'contacto@' || LOWER(REPLACE(v_empresa_nombre, ' ', '')) || '.com.ar',
      'Av. Libertador ' || (1000 + i * 100) || ', CABA',
      true
    )
    RETURNING id INTO v_empresa_id;
    
    RAISE NOTICE 'Empresa creada: % (ID: %)', v_empresa_nombre, v_empresa_id;
  END LOOP;
END $$;

-- ============================================================================
-- PASO 2: Verificar Empresas Creadas
-- ============================================================================
SELECT 
  id,
  nombre,
  cuit,
  email,
  created_at
FROM empresas
WHERE nombre LIKE '%Demo'
ORDER BY nombre;

-- ============================================================================
-- PASO 3: Crear 30 Usuarios Choferes en auth.users
-- ============================================================================
DO $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_nombre text;
  v_apellido text;
  v_password_hash text;
  i integer;
BEGIN
  -- Password hash para "Demo2025!" (bcrypt)
  v_password_hash := crypt('Demo2025!', gen_salt('bf'));
  
  FOR i IN 1..30 LOOP
    -- Generar nombres y apellidos variados
    v_nombre := CASE MOD(i, 10)
      WHEN 0 THEN 'Juan'
      WHEN 1 THEN 'Pedro'
      WHEN 2 THEN 'Carlos'
      WHEN 3 THEN 'Luis'
      WHEN 4 THEN 'Miguel'
      WHEN 5 THEN 'Jorge'
      WHEN 6 THEN 'Roberto'
      WHEN 7 THEN 'Diego'
      WHEN 8 THEN 'Martín'
      WHEN 9 THEN 'Fernando'
    END;
    
    v_apellido := CASE MOD(i, 15)
      WHEN 0 THEN 'García'
      WHEN 1 THEN 'Rodríguez'
      WHEN 2 THEN 'González'
      WHEN 3 THEN 'Fernández'
      WHEN 4 THEN 'López'
      WHEN 5 THEN 'Martínez'
      WHEN 6 THEN 'Sánchez'
      WHEN 7 THEN 'Pérez'
      WHEN 8 THEN 'Gómez'
      WHEN 9 THEN 'Díaz'
      WHEN 10 THEN 'Torres'
      WHEN 11 THEN 'Ramírez'
      WHEN 12 THEN 'Flores'
      WHEN 13 THEN 'Silva'
      WHEN 14 THEN 'Morales'
    END || ' Demo';
    
    v_email := 'chofer' || i || '@demo.com.ar';
    
    -- Crear usuario en auth.users
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role
    ) VALUES (
      gen_random_uuid(),
      v_email,
      v_password_hash,
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', v_nombre || ' ' || v_apellido),
      false,
      'authenticated'
    )
    RETURNING id INTO v_user_id;
    
    -- Crear en profiles
    INSERT INTO profiles (id, name, created_at)
    VALUES (v_user_id, v_nombre || ' ' || v_apellido, NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Crear en usuarios
    INSERT INTO usuarios (id, email, nombre_completo, created_at)
    VALUES (v_user_id, v_email, v_nombre || ' ' || v_apellido, NOW())
    ON CONFLICT (email) DO NOTHING;
    
    RAISE NOTICE 'Usuario creado: % % (%, ID: %)', v_nombre, v_apellido, v_email, v_user_id;
  END LOOP;
END $$;

-- ============================================================================
-- PASO 4: Obtener Rol "chofer" de tipo transporte
-- ============================================================================
SELECT 
  id,
  nombre,
  nombre_rol,
  tipo_empresa
FROM roles_empresa
WHERE nombre_rol = 'chofer' 
  AND tipo_empresa = 'transporte'
LIMIT 1;

-- ============================================================================
-- PASO 5: Vincular Choferes a Empresas (3 choferes por empresa)
-- ============================================================================
DO $$
DECLARE
  v_empresa record;
  v_chofer record;
  v_rol_id uuid;
  v_chofer_count integer := 0;
  v_empresa_index integer := 0;
BEGIN
  -- Obtener rol_id de chofer
  SELECT id INTO v_rol_id
  FROM roles_empresa
  WHERE nombre_rol = 'chofer' 
    AND tipo_empresa = 'transporte'
  LIMIT 1;
  
  IF v_rol_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el rol de chofer para tipo transporte';
  END IF;
  
  RAISE NOTICE 'Usando rol_id: %', v_rol_id;
  
  -- Iterar empresas demo
  FOR v_empresa IN (
    SELECT id, nombre
    FROM empresas
    WHERE nombre LIKE '%Demo'
    ORDER BY nombre
  ) LOOP
    v_empresa_index := v_empresa_index + 1;
    v_chofer_count := 0;
    
    -- Asignar 3 choferes a cada empresa
    FOR v_chofer IN (
      SELECT u.id, u.email, u.raw_user_meta_data->>'full_name' as nombre
      FROM auth.users u
      WHERE u.email LIKE 'chofer%@demo.com.ar'
        AND NOT EXISTS (
          SELECT 1 FROM usuarios_empresa ue 
          WHERE ue.user_id = u.id
        )
      ORDER BY u.email
      LIMIT 3
    ) LOOP
      -- Crear vinculación en usuarios_empresa
      INSERT INTO usuarios_empresa (
        user_id,
        empresa_id,
        rol_interno,
        rol_empresa_id,
        email_interno,
        activo,
        fecha_vinculacion
      ) VALUES (
        v_chofer.id,
        v_empresa.id,
        'chofer',
        v_rol_id,
        v_chofer.email,
        true,
        NOW()
      );
      
      v_chofer_count := v_chofer_count + 1;
      RAISE NOTICE 'Chofer % vinculado a empresa % (% de 3)', 
        v_chofer.nombre, v_empresa.nombre, v_chofer_count;
    END LOOP;
    
    IF v_chofer_count < 3 THEN
      RAISE NOTICE 'ADVERTENCIA: Solo se pudieron vincular % choferes a %', 
        v_chofer_count, v_empresa.nombre;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- PASO 6: Crear registros en tabla choferes para cada chofer vinculado
-- ============================================================================
DO $$
DECLARE
  v_ue record;
  v_user_data record;
  v_nombre text;
  v_apellido text;
  v_dni text;
  v_telefono text;
BEGIN
  FOR v_ue IN (
    SELECT 
      ue.user_id,
      ue.empresa_id,
      u.email,
      u.raw_user_meta_data->>'full_name' as nombre_completo
    FROM usuarios_empresa ue
    JOIN auth.users u ON u.id = ue.user_id
    WHERE u.email LIKE 'chofer%@demo.com.ar'
      AND ue.rol_interno = 'chofer'
      AND NOT EXISTS (
        SELECT 1 FROM choferes c WHERE c.usuario_id = ue.user_id
      )
  ) LOOP
    -- Extraer nombre y apellido del nombre completo
    v_nombre := SPLIT_PART(v_ue.nombre_completo, ' ', 1);
    v_apellido := SUBSTRING(v_ue.nombre_completo FROM LENGTH(v_nombre) + 2);
    
    -- Generar DNI único
    v_dni := (30000000 + (RANDOM() * 9999999)::integer)::text;
    
    -- Generar teléfono
    v_telefono := '+54 9 11 ' || (4000 + (RANDOM() * 5999)::integer) || '-' || (1000 + (RANDOM() * 8999)::integer);
    
    -- Crear registro en choferes con usuario_id
    INSERT INTO choferes (
      nombre,
      apellido,
      dni,
      telefono,
      foto_url,
      id_transporte,
      usuario_alta,
      usuario_id
    ) VALUES (
      v_nombre,
      v_apellido,
      v_dni,
      v_telefono,
      NULL,
      v_ue.empresa_id,
      v_ue.user_id,
      v_ue.user_id
    );
    
    RAISE NOTICE 'Registro chofer creado: % % (DNI: %, usuario_id: %)', 
      v_nombre, v_apellido, v_dni, v_ue.user_id;
  END LOOP;
END $$;

-- ============================================================================
-- PASO 7: Verificación Final
-- ============================================================================

-- Contar empresas demo
SELECT COUNT(*) as total_empresas_demo
FROM empresas
WHERE nombre LIKE '%Demo';

-- Contar usuarios choferes demo
SELECT COUNT(*) as total_usuarios_chofer_demo
FROM auth.users
WHERE email LIKE 'chofer%@demo.com.ar';

-- Contar vinculaciones
SELECT COUNT(*) as total_vinculaciones_demo
FROM usuarios_empresa ue
JOIN auth.users u ON u.id = ue.user_id
WHERE u.email LIKE 'chofer%@demo.com.ar';

-- Contar registros en choferes
SELECT COUNT(*) as total_choferes_demo
FROM choferes
WHERE apellido LIKE '%Demo';

-- Detalle de empresas con sus choferes
SELECT 
  e.nombre as empresa,
  COUNT(c.id) as cantidad_choferes,
  STRING_AGG(c.nombre || ' ' || c.apellido, ', ' ORDER BY c.apellido) as choferes
FROM empresas e
LEFT JOIN choferes c ON c.id_transporte = e.id AND c.apellido LIKE '%Demo'
WHERE e.nombre LIKE '%Demo'
GROUP BY e.id, e.nombre
ORDER BY e.nombre;

-- ============================================================================
-- RESULTADO ESPERADO:
-- - 10 empresas de transporte con sufijo "Demo"
-- - 30 usuarios en auth.users (chofer1@demo.com.ar ... chofer30@demo.com.ar)
-- - 30 vinculaciones en usuarios_empresa (3 choferes por empresa)
-- - 30 registros en tabla choferes con usuario_id poblado
-- - Contraseña para todos: Demo2025!
-- ============================================================================
