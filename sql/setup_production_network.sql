-- =============================================
-- Script de Configuración de Red Empresarial
-- Para ambiente de producción/demo
-- IMPORTANTE: Ejecutar primero create_database_structure.sql
-- =============================================

-- Verificar que las tablas existan antes de continuar
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' AND table_name = 'empresas') THEN
        RAISE EXCEPTION 'Tabla empresas no existe. Ejecuta primero create_database_structure.sql';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'empresas' 
                   AND column_name = 'activo') THEN
        RAISE EXCEPTION 'Columna activo no existe en tabla empresas. Ejecuta primero create_database_structure.sql';
    END IF;
    
    RAISE NOTICE 'Estructura de base de datos validada correctamente';
END $$;

-- 1. Crear empresas base si no existen
INSERT INTO public.empresas (nombre, cuit, tipo_empresa, email, telefono, direccion, activo)
VALUES 
  ('Empresa Coordinadora Demo', '20-12345678-9', 'coordinador', 'contacto@coordinadora-demo.com', '+54-11-4000-1000', 'Av. Industrial 1000, CABA', true),
  ('Transportes Demo SA', '20-87654321-0', 'transporte', 'contacto@transportes-demo.com', '+54-11-4000-2000', 'Ruta 9 Km 50, Buenos Aires', true),
  ('Logística Express SRL', '20-11111111-1', 'transporte', 'info@logistica-express.com', '+54-11-4000-3000', 'Parque Industrial Sur, Quilmes', true)
ON CONFLICT (cuit) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  email = EXCLUDED.email,
  activo = EXCLUDED.activo;

-- 2. Asegurar que existen los usuarios base en la tabla usuarios
INSERT INTO public.usuarios (email, nombre_completo)
VALUES
  ('coord_demo@example.com', 'Coordinador Demo'),
  ('coordinador.demo@nodexia.com', 'Coordinador Nodexia'),
  ('transporte.demo@nodexia.com', 'Transporte Demo'),
  ('control.acceso@nodexia.com', 'Control Acceso'),
  ('supervisor.carga@nodexia.com', 'Supervisor Carga'),
  ('chofer.demo@nodexia.com', 'Chofer Demo')
ON CONFLICT (email) DO UPDATE SET
  nombre_completo = EXCLUDED.nombre_completo;

-- 3. Función para asociar usuarios con empresas
CREATE OR REPLACE FUNCTION asociar_usuario_empresa(
  p_user_email TEXT,
  p_empresa_cuit TEXT,
  p_rol_interno TEXT
) RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_empresa_id UUID;
  v_auth_user_id UUID;
BEGIN
  -- Buscar usuario en auth.users por email
  SELECT id INTO v_auth_user_id 
  FROM auth.users 
  WHERE email = p_user_email;
  
  IF v_auth_user_id IS NULL THEN
    RAISE NOTICE 'Usuario % no encontrado en auth.users', p_user_email;
    RETURN;
  END IF;
  
  -- Buscar o crear usuario en tabla usuarios
  SELECT id INTO v_user_id 
  FROM public.usuarios 
  WHERE email = p_user_email;
  
  IF v_user_id IS NULL THEN
    INSERT INTO public.usuarios (id, email, nombre_completo)
    VALUES (v_auth_user_id, p_user_email, split_part(p_user_email, '@', 1))
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
    RETURNING id INTO v_user_id;
  ELSE
    -- Actualizar el ID para que coincida con auth.users
    UPDATE public.usuarios 
    SET id = v_auth_user_id 
    WHERE email = p_user_email AND id != v_auth_user_id;
    v_user_id := v_auth_user_id;
  END IF;
  
  -- Buscar empresa por CUIT
  SELECT id INTO v_empresa_id 
  FROM public.empresas 
  WHERE cuit = p_empresa_cuit;
  
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Empresa con CUIT % no encontrada', p_empresa_cuit;
  END IF;
  
  -- Crear o actualizar asociación usuario-empresa
  INSERT INTO public.usuarios_empresa (user_id, empresa_id, rol_interno, activo)
  VALUES (v_user_id, v_empresa_id, p_rol_interno, true)
  ON CONFLICT (user_id, empresa_id) DO UPDATE SET
    rol_interno = EXCLUDED.rol_interno,
    activo = EXCLUDED.activo;
    
  RAISE NOTICE 'Usuario % asociado con empresa % como %', p_user_email, p_empresa_cuit, p_rol_interno;
END;
$$ LANGUAGE plpgsql;

-- 4. Asociar usuarios con empresas
SELECT asociar_usuario_empresa('coord_demo@example.com', '20-12345678-9', 'Coordinador');
SELECT asociar_usuario_empresa('coordinador.demo@nodexia.com', '20-12345678-9', 'Coordinador');
SELECT asociar_usuario_empresa('transporte.demo@nodexia.com', '20-87654321-0', 'Administrador');
SELECT asociar_usuario_empresa('control.acceso@nodexia.com', '20-12345678-9', 'Control de Acceso');
SELECT asociar_usuario_empresa('supervisor.carga@nodexia.com', '20-12345678-9', 'Supervisor de Carga');
SELECT asociar_usuario_empresa('chofer.demo@nodexia.com', '20-87654321-0', 'Chofer');

-- 5. Crear relaciones entre empresas (coordinador -> transportes)
INSERT INTO public.relaciones_empresa (
  empresa_coordinadora_id,
  empresa_transporte_id,
  estado,
  fecha_inicio,
  activo
)
SELECT 
  (SELECT id FROM empresas WHERE cuit = '20-12345678-9'),
  (SELECT id FROM empresas WHERE cuit = '20-87654321-0'),
  'activa',
  CURRENT_DATE,
  true
ON CONFLICT DO NOTHING;

INSERT INTO public.relaciones_empresa (
  empresa_coordinadora_id,
  empresa_transporte_id,
  estado,
  fecha_inicio,
  activo
)
SELECT 
  (SELECT id FROM empresas WHERE cuit = '20-12345678-9'),
  (SELECT id FROM empresas WHERE cuit = '20-11111111-1'),
  'activa',
  CURRENT_DATE,
  true
ON CONFLICT DO NOTHING;

-- 6. Verificar configuración
SELECT 
  u.email,
  u.nombre_completo,
  e.nombre as empresa,
  e.tipo_empresa,
  ue.rol_interno,
  ue.activo
FROM usuarios u
JOIN usuarios_empresa ue ON u.id = ue.user_id
JOIN empresas e ON ue.empresa_id = e.id
WHERE u.email IN (
  'coord_demo@example.com',
  'coordinador.demo@nodexia.com', 
  'transporte.demo@nodexia.com',
  'control.acceso@nodexia.com',
  'supervisor.carga@nodexia.com',
  'chofer.demo@nodexia.com'
)
ORDER BY u.email;

-- 7. Limpiar función temporal
DROP FUNCTION IF EXISTS asociar_usuario_empresa(TEXT, TEXT, TEXT);

-- Mensaje de finalización (sin emoji que puede causar problemas)
DO $$
BEGIN
  RAISE NOTICE 'Configuración de red empresarial completada correctamente';
END $$;