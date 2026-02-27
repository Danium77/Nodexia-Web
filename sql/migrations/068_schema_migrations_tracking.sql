-- ================================================================
-- Migración 068: Sistema de tracking de migraciones
-- Fecha: 2025-01-27
-- Descripción: Crea la tabla schema_migrations para rastrear
--   qué migraciones se han aplicado en producción.
--   Registra todas las migraciones históricas como ya aplicadas.
-- ================================================================

-- 1. Crear tabla de tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(10)   PRIMARY KEY,  -- e.g. '068'
  name        TEXT          NOT NULL,      -- e.g. 'schema_migrations_tracking'
  filename    TEXT          NOT NULL,      -- e.g. '068_schema_migrations_tracking.sql'
  checksum    TEXT,                        -- SHA256 del archivo (para detectar cambios)
  applied_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  applied_by  TEXT          DEFAULT current_user,
  execution_ms INTEGER                    -- duración de ejecución
);

-- Índice para consultas por fecha
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at 
  ON schema_migrations(applied_at DESC);

-- Comentario
COMMENT ON TABLE schema_migrations IS 
  'Tracking de migraciones SQL aplicadas. Cada fila = una migración ejecutada.';

-- 2. Registrar todas las migraciones históricas como ya aplicadas
-- Usamos INSERT ... ON CONFLICT DO NOTHING para idempotencia
INSERT INTO schema_migrations (version, name, filename, applied_at, applied_by) VALUES
  ('001', 'migrar_coordinador_a_planta',         '001_migrar_coordinador_a_planta.sql',         '2024-01-01 00:00:00+00', 'historical'),
  ('002', 'migracion_arquitectura_completa',      '002_migracion_arquitectura_completa.sql',      '2024-01-01 00:00:00+00', 'historical'),
  ('003', 'parche_fk_ofertas',                    '003_parche_fk_ofertas.sql',                    '2024-01-01 00:00:00+00', 'historical'),
  ('004', 'verificacion_completa',                '004_verificacion_completa.sql',                '2024-01-01 00:00:00+00', 'historical'),
  ('005', 'crear_tablas_faltantes',               '005_crear_tablas_faltantes.sql',               '2024-01-01 00:00:00+00', 'historical'),
  ('007', 'agregar_origen_asignacion',            '007_agregar_origen_asignacion.sql',            '2024-01-01 00:00:00+00', 'historical'),
  ('008', 'agregar_tipo_administrador',           '008_agregar_tipo_administrador.sql',           '2024-01-01 00:00:00+00', 'historical'),
  ('009', 'catalogo_completo_roles',              '009_catalogo_completo_roles.sql',              '2024-01-01 00:00:00+00', 'historical'),
  ('010', 'mejoras_cancelacion_viajes',           '010_mejoras_cancelacion_viajes.sql',           '2024-01-01 00:00:00+00', 'historical'),
  ('011', 'sistema_estados_duales',               '011_sistema_estados_duales.sql',               '2024-01-01 00:00:00+00', 'historical'),
  ('013', 'estado_expirado_sistema',              '013_estado_expirado_sistema.sql',              '2024-01-01 00:00:00+00', 'historical'),
  ('014', 'fecha_descarga',                       '014_fecha_descarga.sql',                       '2024-01-01 00:00:00+00', 'historical'),
  ('016', 'sistema_reprogramacion',               '016_sistema_reprogramacion.sql',               '2024-01-01 00:00:00+00', 'historical'),
  ('017', 'unidades_operativas_completo',         '017_unidades_operativas_completo.sql',         '2024-01-01 00:00:00+00', 'historical'),
  ('018', 'agregar_coordenadas_ubicaciones',      '018_agregar_coordenadas_ubicaciones.sql',      '2024-01-01 00:00:00+00', 'historical'),
  ('020', 'crear_unidades_nodexia',               '020_crear_unidades_nodexia.sql',               '2024-01-01 00:00:00+00', 'historical'),
  ('021', 'agregar_dni_usuarios_empresa',         '021_agregar_dni_usuarios_empresa.sql',         '2024-01-01 00:00:00+00', 'historical'),
  ('022', 'simplificar_roles_sistema',            '022_simplificar_roles_sistema.sql',            '2024-01-01 00:00:00+00', 'historical'),
  ('023', 'agregar_destino_id_despachos',         '023_agregar_destino_id_despachos.sql',         '2024-01-01 00:00:00+00', 'historical'),
  ('024', 'tracking_gps',                         '024_tracking_gps.sql',                         '2024-01-01 00:00:00+00', 'historical'),
  ('025', 'historial_unidades_operativas',        '025_historial_unidades_operativas.sql',        '2024-01-01 00:00:00+00', 'historical'),
  ('026', 'sistema_notificaciones',               '026_sistema_notificaciones.sql',               '2024-01-01 00:00:00+00', 'historical'),
  ('027', 'migracion_masiva_ubicaciones',         '027_migracion_masiva_ubicaciones.sql',         '2024-01-01 00:00:00+00', 'historical'),
  ('028', 'auditoria_cancelaciones',              '028_auditoria_cancelaciones.sql',              '2024-01-01 00:00:00+00', 'historical'),
  ('031', 'crear_tabla_requisitos_viaje_red',     '031_crear_tabla_requisitos_viaje_red.sql',     '2024-01-01 00:00:00+00', 'historical'),
  ('040', 'ubicacion_usuario_control_acceso',     '040_ubicacion_usuario_control_acceso.sql',     '2024-01-01 00:00:00+00', 'historical'),
  ('041', 'despachos_ubicacion_ids',              '041_despachos_ubicacion_ids.sql',              '2024-01-01 00:00:00+00', 'historical'),
  ('042', 'poblar_empresa_id_ubicaciones',        '042_poblar_empresa_id_ubicaciones.sql',        '2024-01-01 00:00:00+00', 'historical'),
  ('043', 'rls_control_acceso',                   '043_rls_control_acceso.sql',                   '2024-01-01 00:00:00+00', 'historical'),
  ('044', 'seguridad_revoke_funciones',           '044_seguridad_revoke_funciones.sql',           '2024-01-01 00:00:00+00', 'historical'),
  ('045', 'agregar_documentacion_completa',       '045_agregar_documentacion_completa.sql',       '2024-01-01 00:00:00+00', 'historical'),
  ('046', 'sistema_documentacion_recursos',       '046_sistema_documentacion_recursos.sql',       '2024-01-01 00:00:00+00', 'historical'),
  ('050', 'crear_tabla_registros_acceso',         '050_crear_tabla_registros_acceso.sql',         '2024-01-01 00:00:00+00', 'historical'),
  ('055', 'historial_despachos',                  '055_historial_despachos.sql',                  '2024-01-01 00:00:00+00', 'historical'),
  ('056', 'fix_rls_viajes_red_rechazados',        '056_fix_rls_viajes_red_rechazados.sql',       '2024-01-01 00:00:00+00', 'historical'),
  ('058', 'centralizacion_estados_y_paradas',     '058_centralizacion_estados_y_paradas.sql',     '2024-01-01 00:00:00+00', 'historical'),
  ('059', 'unificar_estado_unidad_viaje',         '059_unificar_estado_unidad_viaje.sql',         '2024-01-01 00:00:00+00', 'historical'),
  ('060a','index_usuarios_empresa_empresa_id',    '060_index_usuarios_empresa_empresa_id.sql',    '2024-01-01 00:00:00+00', 'historical'),
  ('060b','indices_performance_y_retencion',      '060_indices_performance_y_retencion.sql',      '2024-01-01 00:00:00+00', 'historical'),
  ('061', 'fix_despachos_empresa_id',             '061_fix_despachos_empresa_id.sql',             '2024-01-01 00:00:00+00', 'historical'),
  ('062', 'fix_rls_documentos_cross_company',     '062_fix_rls_documentos_cross_company.sql',     '2024-01-01 00:00:00+00', 'historical'),
  ('063', 'rls_documentos_viaje_planta',          '063_rls_documentos_viaje_planta.sql',          '2024-01-01 00:00:00+00', 'historical'),
  ('064a','fix_ubicaciones_empresa_id',           '064_fix_ubicaciones_empresa_id.sql',           '2024-01-01 00:00:00+00', 'historical'),
  ('064b','incidencias_sistema_provisorio',       '064_incidencias_sistema_provisorio.sql',       '2024-01-01 00:00:00+00', 'historical'),
  ('065', 'deprecate_id_transporte_flota',        '065_deprecate_id_transporte_flota.sql',        '2024-01-01 00:00:00+00', 'historical'),
  ('066', 'perfil_pyme_y_vendedor',               '066_perfil_pyme_y_vendedor.sql',               '2025-01-25 00:00:00+00', 'historical'),
  ('067', 'rls_coordinador_integral_all_tables',  '067_rls_coordinador_integral_all_tables.sql',  '2025-01-27 00:00:00+00', 'historical'),
  ('068', 'schema_migrations_tracking',           '068_schema_migrations_tracking.sql',           now(),                    current_user)
ON CONFLICT (version) DO NOTHING;

-- 3. Función helper para verificar si una migración fue aplicada
CREATE OR REPLACE FUNCTION migration_applied(p_version VARCHAR)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = p_version);
$$;

COMMENT ON FUNCTION migration_applied IS 
  'Verifica si una migración específica ya fue aplicada. Uso: SELECT migration_applied(''069'')';

-- 4. Vista resumen de migraciones
CREATE OR REPLACE VIEW v_migration_status AS
SELECT 
  version,
  name,
  filename,
  applied_at,
  applied_by,
  CASE 
    WHEN applied_by = 'historical' THEN 'pre-tracking'
    ELSE 'tracked'
  END as tracking_status,
  execution_ms
FROM schema_migrations
ORDER BY version;

COMMENT ON VIEW v_migration_status IS 
  'Vista resumen del estado de todas las migraciones aplicadas';

-- Verificación
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM schema_migrations;
  RAISE NOTICE '✅ schema_migrations creada con % migraciones registradas', v_count;
END $$;
