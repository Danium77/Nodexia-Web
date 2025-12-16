-- =====================================================
-- TRIGGERS DE SINCRONIZACIÓN AUTOMÁTICA
-- Previene usuarios huérfanos entre auth.users y usuarios_empresa
-- =====================================================

-- 1. FUNCIÓN: Sincronizar nuevo usuario de auth a profiles y usuarios
CREATE OR REPLACE FUNCTION sync_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear entrada en profiles si no existe
  INSERT INTO public.profiles (id, rol_primario, created_at, updated_at)
  VALUES (
    NEW.id,
    'usuario', -- rol por defecto
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Crear entrada en usuarios si no existe
  INSERT INTO public.usuarios (id, nombre_completo, email, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email),
    NEW.email,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. TRIGGER: Cuando se crea un usuario en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_new_auth_user();

-- 3. FUNCIÓN: Sincronizar actualización de email en auth
CREATE OR REPLACE FUNCTION sync_auth_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar email en usuarios si cambió
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.usuarios
    SET email = NEW.email, updated_at = NOW()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. TRIGGER: Cuando se actualiza email en auth.users
DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION sync_auth_user_email();

-- 5. FUNCIÓN: Prevenir eliminación si tiene empresas asociadas
CREATE OR REPLACE FUNCTION prevent_delete_with_empresas()
RETURNS TRIGGER AS $$
DECLARE
  empresa_count INTEGER;
BEGIN
  -- Contar empresas asociadas
  SELECT COUNT(*) INTO empresa_count
  FROM public.usuarios_empresa
  WHERE usuario_id = OLD.id;

  IF empresa_count > 0 THEN
    RAISE EXCEPTION 'No se puede eliminar usuario %. Tiene % empresa(s) asociada(s). Primero desactivar en usuarios_empresa.',
      OLD.email, empresa_count;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. TRIGGER: Antes de eliminar usuario de auth
DROP TRIGGER IF EXISTS prevent_auth_user_delete ON auth.users;
CREATE TRIGGER prevent_auth_user_delete
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_delete_with_empresas();

-- 7. FUNCIÓN: Log de cambios de estado en usuarios_empresa
CREATE OR REPLACE FUNCTION log_usuarios_empresa_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se desactiva un usuario, registrar
  IF TG_OP = 'UPDATE' AND NEW.activo = false AND OLD.activo = true THEN
    INSERT INTO public.usuarios_empresa_audit (
      usuario_id,
      empresa_id,
      accion,
      rol_anterior,
      rol_nuevo,
      activo_anterior,
      activo_nuevo,
      changed_by,
      changed_at
    ) VALUES (
      NEW.usuario_id,
      NEW.empresa_id,
      'desactivar',
      OLD.rol_interno,
      NEW.rol_interno,
      OLD.activo,
      NEW.activo,
      auth.uid(),
      NOW()
    );
  END IF;

  -- Si se reactiva un usuario, registrar
  IF TG_OP = 'UPDATE' AND NEW.activo = true AND OLD.activo = false THEN
    INSERT INTO public.usuarios_empresa_audit (
      usuario_id,
      empresa_id,
      accion,
      rol_anterior,
      rol_nuevo,
      activo_anterior,
      activo_nuevo,
      changed_by,
      changed_at
    ) VALUES (
      NEW.usuario_id,
      NEW.empresa_id,
      'reactivar',
      OLD.rol_interno,
      NEW.rol_interno,
      OLD.activo,
      NEW.activo,
      auth.uid(),
      NOW()
    );
  END IF;

  -- Si cambia el rol, registrar
  IF TG_OP = 'UPDATE' AND NEW.rol_interno IS DISTINCT FROM OLD.rol_interno THEN
    INSERT INTO public.usuarios_empresa_audit (
      usuario_id,
      empresa_id,
      accion,
      rol_anterior,
      rol_nuevo,
      activo_anterior,
      activo_nuevo,
      changed_by,
      changed_at
    ) VALUES (
      NEW.usuario_id,
      NEW.empresa_id,
      'cambio_rol',
      OLD.rol_interno,
      NEW.rol_interno,
      OLD.activo,
      NEW.activo,
      auth.uid(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. CREAR TABLA DE AUDITORÍA si no existe
CREATE TABLE IF NOT EXISTS public.usuarios_empresa_audit (
  id BIGSERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL,
  empresa_id BIGINT,
  accion TEXT NOT NULL, -- 'desactivar', 'reactivar', 'cambio_rol', 'crear', 'eliminar'
  rol_anterior TEXT,
  rol_nuevo TEXT,
  activo_anterior BOOLEAN,
  activo_nuevo BOOLEAN,
  changed_by UUID, -- ID del usuario que hizo el cambio
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB -- Para datos adicionales
);

-- Índices para auditoría
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_audit_usuario 
  ON public.usuarios_empresa_audit(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_audit_empresa 
  ON public.usuarios_empresa_audit(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_audit_changed_at 
  ON public.usuarios_empresa_audit(changed_at DESC);

-- 9. TRIGGER: Auditoría de cambios en usuarios_empresa
DROP TRIGGER IF EXISTS audit_usuarios_empresa_changes ON public.usuarios_empresa;
CREATE TRIGGER audit_usuarios_empresa_changes
  AFTER UPDATE ON public.usuarios_empresa
  FOR EACH ROW
  EXECUTE FUNCTION log_usuarios_empresa_changes();

-- 10. FUNCIÓN: Reparar usuarios huérfanos automáticamente
CREATE OR REPLACE FUNCTION repair_orphan_users()
RETURNS TABLE(
  usuario_id UUID,
  email TEXT,
  accion_realizada TEXT
) AS $$
BEGIN
  -- Crear profiles faltantes
  INSERT INTO public.profiles (id, rol_primario, created_at, updated_at)
  SELECT 
    au.id,
    'usuario',
    NOW(),
    NOW()
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE p.id IS NULL
  RETURNING id, 'usuario', 'profile_creado';

  -- Crear usuarios faltantes
  INSERT INTO public.usuarios (id, nombre_completo, email, created_at)
  SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'nombre_completo', au.email),
    au.email,
    NOW()
  FROM auth.users au
  LEFT JOIN public.usuarios u ON au.id = u.id
  WHERE u.id IS NULL;

  -- Retornar usuarios reparados
  RETURN QUERY
  SELECT 
    au.id as usuario_id,
    au.email,
    'reparado_automaticamente' as accion_realizada
  FROM auth.users au
  LEFT JOIN public.usuarios_empresa ue ON au.id = ue.usuario_id
  WHERE ue.usuario_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. FUNCIÓN: Verificar salud del sistema de usuarios
CREATE OR REPLACE FUNCTION check_users_health()
RETURNS TABLE(
  categoria TEXT,
  cantidad BIGINT,
  detalles JSONB
) AS $$
BEGIN
  -- Total de usuarios en auth
  RETURN QUERY
  SELECT 
    'total_auth_users'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_build_object('descripcion', 'Usuarios totales en auth.users')
  FROM auth.users;

  -- Usuarios sin profile
  RETURN QUERY
  SELECT 
    'sin_profile'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_agg(jsonb_build_object('id', au.id, 'email', au.email))
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE p.id IS NULL;

  -- Usuarios sin entrada en tabla usuarios
  RETURN QUERY
  SELECT 
    'sin_usuarios'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_agg(jsonb_build_object('id', au.id, 'email', au.email))
  FROM auth.users au
  LEFT JOIN public.usuarios u ON au.id = u.id
  WHERE u.id IS NULL;

  -- Usuarios sin empresa asignada
  RETURN QUERY
  SELECT 
    'sin_empresa'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_agg(jsonb_build_object('id', au.id, 'email', au.email))
  FROM auth.users au
  LEFT JOIN public.usuarios_empresa ue ON au.id = ue.usuario_id
  WHERE ue.usuario_id IS NULL;

  -- Usuarios activos con empresa
  RETURN QUERY
  SELECT 
    'activos_con_empresa'::TEXT,
    COUNT(DISTINCT ue.usuario_id)::BIGINT,
    jsonb_build_object('descripcion', 'Usuarios activos vinculados a empresas')
  FROM public.usuarios_empresa ue
  WHERE ue.activo = true;

  -- Usuarios inactivos
  RETURN QUERY
  SELECT 
    'inactivos'::TEXT,
    COUNT(DISTINCT ue.usuario_id)::BIGINT,
    jsonb_build_object('descripcion', 'Usuarios desactivados en usuarios_empresa')
  FROM public.usuarios_empresa ue
  WHERE ue.activo = false;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. GRANT permisos a service_role
GRANT EXECUTE ON FUNCTION sync_new_auth_user() TO service_role;
GRANT EXECUTE ON FUNCTION sync_auth_user_email() TO service_role;
GRANT EXECUTE ON FUNCTION prevent_delete_with_empresas() TO service_role;
GRANT EXECUTE ON FUNCTION log_usuarios_empresa_changes() TO service_role;
GRANT EXECUTE ON FUNCTION repair_orphan_users() TO service_role;
GRANT EXECUTE ON FUNCTION check_users_health() TO service_role;

-- 13. Comentarios en funciones
COMMENT ON FUNCTION sync_new_auth_user() IS 'Sincroniza automáticamente nuevos usuarios de auth a profiles y usuarios';
COMMENT ON FUNCTION sync_auth_user_email() IS 'Sincroniza cambios de email de auth.users a usuarios';
COMMENT ON FUNCTION prevent_delete_with_empresas() IS 'Previene eliminación de usuarios con empresas asociadas';
COMMENT ON FUNCTION log_usuarios_empresa_changes() IS 'Registra cambios en usuarios_empresa para auditoría';
COMMENT ON FUNCTION repair_orphan_users() IS 'Repara usuarios huérfanos creando entradas faltantes';
COMMENT ON FUNCTION check_users_health() IS 'Verifica la salud del sistema de usuarios';

-- =====================================================
-- INSTALACIÓN COMPLETADA
-- =====================================================
-- Los triggers están activos y se ejecutarán automáticamente
-- Para verificar estado: SELECT * FROM check_users_health();
-- Para reparar huérfanos: SELECT * FROM repair_orphan_users();
-- =====================================================
