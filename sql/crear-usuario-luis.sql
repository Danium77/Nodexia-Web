-- Script de creación completa de usuario coordinador de transporte
-- Usuario: luis@centro.com.ar (UID: 59371825-6099-438c-b2f9-e3ba42f3216)
-- Empresa: Logística Express SRL

-- PASO 1: Reemplaza EMPRESA_ID_AQUI con el UUID real de la empresa

DO $$
DECLARE
  v_user_id UUID := '59371825-6099-438c-b2f9-e3ba42f3216';
  v_empresa_id UUID := 'EMPRESA_ID_AQUI'; -- Reemplaza con el UUID de Logística Express
  v_rol_id UUID;
BEGIN
  -- 1. Crear/actualizar perfil del usuario
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

  RAISE NOTICE 'Perfil creado/actualizado';

  -- 2. Buscar/crear rol coordinador_transporte
  SELECT id INTO v_rol_id
  FROM roles_empresa
  WHERE nombre = 'coordinador_transporte'
  LIMIT 1;

  IF v_rol_id IS NULL THEN
    INSERT INTO roles_empresa (
      nombre,
      descripcion,
      permisos,
      activo
    ) VALUES (
      'coordinador_transporte',
      'Coordinador de Transporte',
      jsonb_build_object(
        'ver_despachos_asignados', true,
        'ver_red_nodexia', true,
        'tomar_ofertas', true,
        'asignar_choferes', true,
        'asignar_vehiculos', true,
        'gestionar_flota', true,
        'crear_despachos', false,
        'ver_planificacion', false
      ),
      true
    )
    RETURNING id INTO v_rol_id;
    
    RAISE NOTICE 'Rol coordinador_transporte creado';
  ELSE
    RAISE NOTICE 'Rol coordinador_transporte ya existe';
  END IF;

  -- 3. Crear entrada en tabla usuarios
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
    'coordinador_transporte',
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

  RAISE NOTICE 'Usuario creado/actualizado en tabla usuarios';

  -- 4. Vincular usuario con empresa y rol
  INSERT INTO usuarios_empresa (
    user_id,
    empresa_id,
    rol_empresa_id,
    activo,
    created_at
  ) VALUES (
    v_user_id,
    v_empresa_id,
    v_rol_id,
    true,
    NOW()
  )
  ON CONFLICT (user_id, empresa_id, rol_empresa_id) DO UPDATE SET
    activo = true;

  RAISE NOTICE 'Usuario vinculado con empresa y rol';

  -- 5. Actualizar metadata del usuario en auth.users
  UPDATE auth.users
  SET 
    raw_user_meta_data = jsonb_build_object(
      'full_name', 'Luis Martinez',
      'rol', 'coordinador_transporte',
      'empresa_id', v_empresa_id
    ),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE id = v_user_id;

  RAISE NOTICE 'Metadata actualizada en auth.users';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'USUARIO CONFIGURADO EXITOSAMENTE';
  RAISE NOTICE '============================================';

END;
$$;

-- Verificar la creación
SELECT 
  u.id,
  u.email,
  u.nombre_completo,
  u.rol_principal,
  e.razon_social as empresa,
  ue.activo as vinculo_activo,
  r.nombre as rol_empresa
FROM usuarios u
LEFT JOIN usuarios_empresa ue ON u.id = ue.user_id
LEFT JOIN empresas e ON ue.empresa_id = e.id
LEFT JOIN roles_empresa r ON ue.rol_empresa_id = r.id
WHERE u.email = 'luis@centro.com.ar';
