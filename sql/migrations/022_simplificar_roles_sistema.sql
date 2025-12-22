-- Migration 022: Simplificar sistema de roles con interpretación contextual
-- Fecha: 2025-12-20
-- Descripción: Reduce roles específicos a roles genéricos que se interpretan según tipo_empresa
-- Permite creación dinámica de nuevos roles desde Admin Nodexia

BEGIN;

-- ============================================================================
-- PASO 1: Verificar que existe tabla roles_empresa
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'roles_empresa'
  ) THEN
    RAISE EXCEPTION 'Tabla roles_empresa no existe. Ejecutar primero migration 009';
  END IF;
END $$;

-- ============================================================================
-- PASO 2: Agregar columna para roles personalizados y constraint único
-- ============================================================================
ALTER TABLE roles_empresa 
ADD COLUMN IF NOT EXISTS es_sistema BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS icono TEXT,
ADD COLUMN IF NOT EXISTS color TEXT;

-- Agregar constraint único si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'roles_empresa_nombre_tipo_unique'
  ) THEN
    ALTER TABLE roles_empresa 
    ADD CONSTRAINT roles_empresa_nombre_tipo_unique 
    UNIQUE (nombre_rol, tipo_empresa);
    
    RAISE NOTICE '✅ Constraint único agregado';
  ELSE
    RAISE NOTICE 'ℹ️ Constraint único ya existe';
  END IF;
END $$;

COMMENT ON COLUMN roles_empresa.es_sistema IS 'Si es true, el rol no se puede eliminar (rol base del sistema)';
COMMENT ON COLUMN roles_empresa.icono IS 'Nombre del icono para mostrar en UI';
COMMENT ON COLUMN roles_empresa.color IS 'Color hex para badge del rol';

-- ============================================================================
-- PASO 3: Desactivar roles antiguos (no eliminar por seguridad)
-- ============================================================================
UPDATE roles_empresa 
SET activo = false 
WHERE nombre_rol IN (
  'coordinador_transporte',
  'coordinador_planta', 
  'supervisor_carga'
);

-- ============================================================================
-- PASO 4: Insertar nuevos roles base del sistema
-- ============================================================================
INSERT INTO roles_empresa (
  nombre_rol, 
  descripcion, 
  tipo_empresa, 
  permisos, 
  activo,
  es_sistema,
  icono,
  color
) VALUES
  -- Rol super admin (global)
  (
    'admin_nodexia',
    'Administrador central - Acceso total al sistema',
    'admin',
    '{"admin": true, "crear": true, "editar": true, "eliminar": true, "configurar": true}'::jsonb,
    true,
    true,
    'crown',
    '#FFD700'
  ),
  
  -- Rol coordinador (interpretado según tipo_empresa)
  (
    'coordinador',
    'Coordinador - Gestión completa de operaciones',
    'ambos',
    '{"admin": false, "crear": true, "editar": true, "eliminar": true, "planificar": true}'::jsonb,
    true,
    true,
    'clipboard-list',
    '#3B82F6'
  ),
  
  -- Rol control de acceso (solo plantas)
  (
    'control_acceso',
    'Control de Acceso - Registro de ingresos/salidas',
    'coordinador',
    '{"admin": false, "crear": false, "editar": true, "eliminar": false, "registrar_acceso": true}'::jsonb,
    true,
    true,
    'shield-check',
    '#10B981'
  ),
  
  -- Rol chofer (solo transportes)
  (
    'chofer',
    'Chofer - Actualización de estado de viajes',
    'transporte',
    '{"admin": false, "crear": false, "editar": true, "eliminar": false, "actualizar_viaje": true}'::jsonb,
    true,
    true,
    'truck',
    '#F59E0B'
  ),
  
  -- Rol supervisor (interpretado según tipo_empresa)
  (
    'supervisor',
    'Supervisor - Control y supervisión de operaciones',
    'ambos',
    '{"admin": false, "crear": false, "editar": true, "eliminar": false, "supervisar": true, "validar": true}'::jsonb,
    true,
    true,
    'eye',
    '#8B5CF6'
  ),
  
  -- Rol administrativo (todas las empresas)
  (
    'administrativo',
    'Administrativo - Gestión administrativa',
    'ambos',
    '{"admin": false, "crear": true, "editar": true, "eliminar": false, "reportes": true}'::jsonb,
    true,
    true,
    'file-text',
    '#6B7280'
  )
ON CONFLICT (nombre_rol, tipo_empresa) DO UPDATE
SET 
  descripcion = EXCLUDED.descripcion,
  permisos = EXCLUDED.permisos,
  activo = EXCLUDED.activo,
  es_sistema = EXCLUDED.es_sistema,
  icono = EXCLUDED.icono,
  color = EXCLUDED.color;

-- ============================================================================
-- PASO 5: Migrar usuarios existentes a nuevos roles
-- ============================================================================
UPDATE usuarios_empresa 
SET rol_interno = 'coordinador'
WHERE rol_interno IN ('coordinador_transporte', 'coordinador_planta');

UPDATE usuarios_empresa 
SET rol_interno = 'supervisor'
WHERE rol_interno = 'supervisor_carga';

UPDATE usuarios_empresa 
SET rol_interno = 'admin_nodexia'
WHERE rol_interno IN ('super_admin', 'Super Admin', 'admin_nodexia');

-- Normalizar capitalización de roles existentes
UPDATE usuarios_empresa 
SET rol_interno = LOWER(rol_interno)
WHERE rol_interno IN ('Chofer', 'Control de Acceso', 'Supervisor', 'Coordinador');

UPDATE usuarios_empresa 
SET rol_interno = 'control_acceso'
WHERE rol_interno IN ('Control de Acceso', 'control de acceso');

-- ============================================================================
-- PASO 6: Crear función para obtener display name del rol
-- ============================================================================
CREATE OR REPLACE FUNCTION get_rol_display_name(
  p_rol_interno TEXT,
  p_tipo_empresa TEXT
) RETURNS TEXT AS $$
BEGIN
  CASE p_rol_interno
    WHEN 'admin_nodexia' THEN 
      RETURN 'Administrador Nodexia';
    WHEN 'coordinador' THEN
      CASE p_tipo_empresa
        WHEN 'planta' THEN RETURN 'Coordinador de Planta';
        WHEN 'transporte' THEN RETURN 'Coordinador de Transporte';
        WHEN 'cliente' THEN RETURN 'Coordinador Comercial';
        ELSE RETURN 'Coordinador';
      END CASE;
    WHEN 'supervisor' THEN
      CASE p_tipo_empresa
        WHEN 'planta' THEN RETURN 'Supervisor de Carga';
        WHEN 'transporte' THEN RETURN 'Supervisor de Flota';
        ELSE RETURN 'Supervisor';
      END CASE;
    WHEN 'control_acceso' THEN 
      RETURN 'Control de Acceso';
    WHEN 'chofer' THEN 
      RETURN 'Chofer';
    WHEN 'administrativo' THEN
      CASE p_tipo_empresa
        WHEN 'planta' THEN RETURN 'Administrativo Planta';
        WHEN 'transporte' THEN RETURN 'Administrativo Transporte';
        ELSE RETURN 'Administrativo';
      END CASE;
    ELSE 
      RETURN INITCAP(p_rol_interno);
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_rol_display_name IS 'Retorna el nombre de display del rol según el contexto de tipo_empresa';

-- ============================================================================
-- PASO 7: Crear tabla de auditoría para cambios de roles
-- ============================================================================
CREATE TABLE IF NOT EXISTS auditoria_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accion TEXT NOT NULL, -- 'crear', 'editar', 'eliminar', 'activar', 'desactivar'
  rol_id UUID REFERENCES roles_empresa(id),
  rol_nombre TEXT NOT NULL,
  usuario_id UUID REFERENCES auth.users(id),
  cambios JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auditoria_roles_rol_id_idx ON auditoria_roles(rol_id);
CREATE INDEX IF NOT EXISTS auditoria_roles_created_at_idx ON auditoria_roles(created_at);

-- ============================================================================
-- PASO 8: Trigger para auditoría automática
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_auditoria_roles()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO auditoria_roles (accion, rol_id, rol_nombre, cambios)
    VALUES ('crear', NEW.id, NEW.nombre_rol, row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO auditoria_roles (accion, rol_id, rol_nombre, cambios)
    VALUES ('editar', NEW.id, NEW.nombre_rol, 
      jsonb_build_object('antes', row_to_json(OLD), 'despues', row_to_json(NEW)));
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO auditoria_roles (accion, rol_id, rol_nombre, cambios)
    VALUES ('eliminar', OLD.id, OLD.nombre_rol, row_to_json(OLD)::jsonb);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auditoria_roles ON roles_empresa;
CREATE TRIGGER trigger_auditoria_roles
AFTER INSERT OR UPDATE OR DELETE ON roles_empresa
FOR EACH ROW EXECUTE FUNCTION trigger_auditoria_roles();

-- ============================================================================
-- PASO 9: RLS para roles_empresa (solo admin_nodexia puede modificar)
-- ============================================================================
ALTER TABLE roles_empresa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roles_select_policy" ON roles_empresa;
CREATE POLICY "roles_select_policy" ON roles_empresa
  FOR SELECT USING (activo = true); -- Todos pueden ver roles activos

DROP POLICY IF EXISTS "roles_admin_policy" ON roles_empresa;
CREATE POLICY "roles_admin_policy" ON roles_empresa
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresa
      WHERE user_id = auth.uid()
      AND rol_interno = 'admin_nodexia'
      AND activo = true
    )
  );

COMMIT;

-- ============================================================================
-- VALIDACIÓN: Verificar migración exitosa
-- ============================================================================
DO $$
DECLARE
  v_count_nuevos INTEGER;
  v_count_migrados INTEGER;
BEGIN
  -- Contar nuevos roles base
  SELECT COUNT(*) INTO v_count_nuevos 
  FROM roles_empresa 
  WHERE es_sistema = true AND activo = true;
  
  -- Contar usuarios migrados
  SELECT COUNT(*) INTO v_count_migrados
  FROM usuarios_empresa
  WHERE rol_interno IN ('coordinador', 'supervisor', 'control_acceso', 'chofer', 'administrativo', 'admin_nodexia');
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ MIGRACIÓN 022 COMPLETADA';
  RAISE NOTICE '   - Roles base del sistema: %', v_count_nuevos;
  RAISE NOTICE '   - Usuarios migrados: %', v_count_migrados;
  RAISE NOTICE '';
  RAISE NOTICE '📋 Nuevos roles disponibles:';
  RAISE NOTICE '   • admin_nodexia - Administrador Nodexia';
  RAISE NOTICE '   • coordinador - Coordinador (contextual)';
  RAISE NOTICE '   • control_acceso - Control de Acceso';
  RAISE NOTICE '   • chofer - Chofer';
  RAISE NOTICE '   • supervisor - Supervisor (contextual)';
  RAISE NOTICE '   • administrativo - Administrativo (contextual)';
  RAISE NOTICE '';
  
  IF v_count_nuevos < 6 THEN
    RAISE WARNING '⚠️ Faltan algunos roles base. Verificar inserción.';
  END IF;
END $$;
