-- Vincular Luis Martinez a Logística del Centro Demo
-- Ejecutar este script para que Luis aparezca en la lista de usuarios

DO $$
DECLARE
  v_user_id UUID := '59371825-0099-438c-b2f9-e3ba4a273216';
  v_email TEXT := 'luis@centro.com.ar';
  v_empresa_id UUID;
  v_rol_id UUID;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VINCULANDO LUIS A EMPRESA';
  RAISE NOTICE '========================================';

  -- 1. Buscar la empresa "Logística del Centro Demo"
  SELECT id INTO v_empresa_id
  FROM empresas
  WHERE nombre = 'Logística del Centro Demo'
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'No se encontro la empresa Logistica del Centro Demo';
  END IF;

  RAISE NOTICE 'Empresa encontrada: %', v_empresa_id;

  -- 2. Buscar rol "coordinador_transporte" para transporte
  SELECT id INTO v_rol_id
  FROM roles_empresa
  WHERE nombre_rol = 'coordinador_transporte'
  AND tipo_empresa IN ('transporte', 'ambos')
  AND activo = true
  LIMIT 1;

  IF v_rol_id IS NULL THEN
    RAISE EXCEPTION 'No se encontro rol coordinador_transporte para empresa de transporte';
  END IF;

  RAISE NOTICE 'Rol asignado: %', v_rol_id;

  -- 3. Crear vínculo en usuarios_empresa
  INSERT INTO usuarios_empresa (
    user_id,
    empresa_id,
    rol_interno,
    rol_empresa_id,
    nombre_completo,
    email_interno,
    activo,
    fecha_vinculacion
  ) VALUES (
    v_user_id,
    v_empresa_id,
    'coordinador_transporte',
    v_rol_id,
    'Luis Martinez',
    v_email,
    true,
    NOW()
  )
  ON CONFLICT (user_id, empresa_id, rol_interno) DO UPDATE SET
    activo = true,
    nombre_completo = EXCLUDED.nombre_completo,
    email_interno = EXCLUDED.email_interno,
    rol_empresa_id = EXCLUDED.rol_empresa_id;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'VINCULO CREADO EXITOSAMENTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Usuario: Luis Martinez';
  RAISE NOTICE 'Email: %', v_email;
  RAISE NOTICE 'Empresa: Logistica del Centro Demo';
  RAISE NOTICE 'Rol: operador';
  RAISE NOTICE '';
  RAISE NOTICE 'Luis ahora debe aparecer en la lista de usuarios';
  RAISE NOTICE '';

END;
$$;

-- Verificar el vínculo
SELECT 
  'VERIFICACION' as estado,
  ue.user_id::text,
  ue.nombre_completo,
  ue.email_interno,
  ue.rol_interno,
  ue.activo,
  e.nombre as empresa
FROM usuarios_empresa ue
LEFT JOIN empresas e ON ue.empresa_id = e.id
WHERE ue.email_interno = 'luis@centro.com.ar'
   OR ue.user_id::text = '59371825-6099-438c-b2f9-e3ba42f3216';
