-- =====================================================
-- MIGRATION 079: Sistema de Feature Flags dinámico (B1)
-- Fecha: 16-Mar-2026
-- Propósito: Tablas para gestión dinámica de funciones por empresa/rol
-- =====================================================

-- =====================================================
-- 1. Catálogo global de funciones del sistema
-- =====================================================
CREATE TABLE IF NOT EXISTS funciones_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave TEXT UNIQUE NOT NULL,           -- key usado en código: 'red_nodexia'
  nombre TEXT NOT NULL,                 -- display name: 'Red Nodexia'
  descripcion TEXT,
  modulo TEXT NOT NULL DEFAULT 'general', -- agrupación: operaciones, admin, analytics
  tipos_aplicables TEXT[] DEFAULT '{}',   -- tipos de empresa donde aplica
  activo BOOLEAN NOT NULL DEFAULT true,   -- kill switch global
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 2. Features habilitadas por empresa (opt-in)
-- =====================================================
CREATE TABLE IF NOT EXISTS funciones_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  funcion_id UUID NOT NULL REFERENCES funciones_sistema(id) ON DELETE CASCADE,
  habilitada BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,       -- config overrides por empresa
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, funcion_id)
);

-- =====================================================
-- 3. Visibilidad por rol dentro de una empresa (opt-out)
-- Si no hay registro, el rol hereda el estado de la empresa.
-- Si hay registro con visible=false, se oculta para ese rol.
-- =====================================================
CREATE TABLE IF NOT EXISTS funciones_rol (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  funcion_id UUID NOT NULL REFERENCES funciones_sistema(id) ON DELETE CASCADE,
  rol_interno TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, funcion_id, rol_interno)
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_funciones_sistema_clave ON funciones_sistema(clave);
CREATE INDEX IF NOT EXISTS idx_funciones_sistema_modulo ON funciones_sistema(modulo);
CREATE INDEX IF NOT EXISTS idx_funciones_empresa_empresa ON funciones_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_funciones_empresa_funcion ON funciones_empresa(funcion_id);
CREATE INDEX IF NOT EXISTS idx_funciones_rol_empresa ON funciones_rol(empresa_id);
CREATE INDEX IF NOT EXISTS idx_funciones_rol_funcion ON funciones_rol(funcion_id);

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE funciones_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE funciones_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE funciones_rol ENABLE ROW LEVEL SECURITY;

-- funciones_sistema: todos pueden leer, solo admin_nodexia modifica
CREATE POLICY "funciones_sistema_select" ON funciones_sistema
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "funciones_sistema_admin" ON funciones_sistema
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresa
      WHERE user_id = auth.uid() AND rol_interno = 'admin_nodexia' AND activo = true
    )
  );

-- funciones_empresa: miembros de la empresa pueden leer, admin_nodexia modifica
CREATE POLICY "funciones_empresa_select" ON funciones_empresa
  FOR SELECT TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios_empresa
      WHERE user_id = auth.uid() AND activo = true
    )
  );

CREATE POLICY "funciones_empresa_admin" ON funciones_empresa
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresa
      WHERE user_id = auth.uid() AND rol_interno = 'admin_nodexia' AND activo = true
    )
  );

-- funciones_rol: miembros de la empresa pueden leer, admin_nodexia modifica
CREATE POLICY "funciones_rol_select" ON funciones_rol
  FOR SELECT TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios_empresa
      WHERE user_id = auth.uid() AND activo = true
    )
  );

CREATE POLICY "funciones_rol_admin" ON funciones_rol
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresa
      WHERE user_id = auth.uid() AND rol_interno = 'admin_nodexia' AND activo = true
    )
  );

-- =====================================================
-- SEED: funciones iniciales del sistema
-- =====================================================
INSERT INTO funciones_sistema (clave, nombre, descripcion, modulo, tipos_aplicables, activo) VALUES
  ('despachos',           'Despachos',              'Gestión de despachos y viajes',              'operaciones', ARRAY['planta','transporte'], true),
  ('red_nodexia',         'Red Nodexia',            'Marketplace de cargas entre empresas',        'operaciones', ARRAY['planta','transporte'], true),
  ('control_acceso',      'Control de Acceso',      'Ingreso/egreso en plantas con QR',           'operaciones', ARRAY['planta'],              true),
  ('documentacion',       'Documentación',          'Gestión de documentos de recursos',          'operaciones', ARRAY['planta','transporte'], true),
  ('tracking_gps',        'Tracking GPS',           'Seguimiento en tiempo real de choferes',     'operaciones', ARRAY['transporte'],          true),
  ('incidencias',         'Incidencias',            'Registro de incidencias operativas',         'operaciones', ARRAY['planta','transporte'], true),
  ('estadisticas',        'Estadísticas',           'Panel de métricas y KPIs',                   'analytics',   ARRAY['planta','transporte'], true),
  ('planificacion',       'Planificación',          'Calendario y planificación de despachos',    'operaciones', ARRAY['planta'],              true),
  ('unidades_operativas', 'Unidades Operativas',    'Gestión de equipos chofer+camión+acoplado',  'operaciones', ARRAY['transporte'],          true),
  ('notificaciones',      'Notificaciones',         'Sistema de notificaciones y alertas',        'general',     ARRAY['planta','transporte'], true),
  ('flota',               'Gestión de Flota',       'Camiones, acoplados y choferes',             'operaciones', ARRAY['transporte'],          true),
  ('reportes',            'Reportes Gerenciales',   'Dashboards exportables PDF/Excel',           'analytics',   ARRAY['planta','transporte'], false),
  ('turnos_recepcion',    'Turnos de Recepción',    'Ventanas horarias para recepción en planta', 'operaciones', ARRAY['planta'],              false),
  ('despachos_transporte','Despachos desde Transporte','Transporte crea sus propios despachos',   'operaciones', ARRAY['transporte'],          false)
ON CONFLICT (clave) DO NOTHING;
