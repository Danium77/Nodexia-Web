-- =============================================================================
-- Migration 064: Sistema de Incidencias + Aprobación Provisoria de Documentación
-- Fecha: 20-Feb-2026
-- 
-- Cambios:
-- 1. incidencias_viaje: agregar documentos_afectados JSONB, demora, problema_carga, ruta_bloqueada, clima_adverso
-- 2. documentos_entidad: agregar estado 'aprobado_provisorio' + columnas de auditoría provisoria
-- 3. RLS policies para incidencias_viaje (visibilidad cross-empresa)
-- 4. Función pg_cron para caducar aprobaciones provisorias > 24h
-- =============================================================================

-- ─── 1. ACTUALIZAR incidencias_viaje ─────────────────────────────────────────

-- Agregar columna documentos_afectados para vincular incidencia con docs específicos
ALTER TABLE incidencias_viaje ADD COLUMN IF NOT EXISTS documentos_afectados JSONB;
COMMENT ON COLUMN incidencias_viaje.documentos_afectados IS 'IDs y tipos de documentos problemáticos [{doc_id, tipo, entidad_tipo, entidad_id, problema}]';

-- Agregar fotos_incidencia si no existe
ALTER TABLE incidencias_viaje ADD COLUMN IF NOT EXISTS fotos_incidencia JSONB;

-- Actualizar CHECK constraint de tipo_incidencia para incluir nuevos tipos
-- Primero eliminar constraint viejo, luego crear nuevo
ALTER TABLE incidencias_viaje DROP CONSTRAINT IF EXISTS incidencias_viaje_tipo_incidencia_check;
ALTER TABLE incidencias_viaje ADD CONSTRAINT incidencias_viaje_tipo_incidencia_check 
  CHECK (tipo_incidencia IN (
    'retraso', 'averia_camion', 'documentacion_faltante',
    'producto_danado', 'accidente', 'demora', 'problema_mecanico',
    'problema_carga', 'ruta_bloqueada', 'clima_adverso', 'otro'
  ));

-- Actualizar CHECK constraint de estado para incluir en_proceso
ALTER TABLE incidencias_viaje DROP CONSTRAINT IF EXISTS incidencias_viaje_estado_check;
ALTER TABLE incidencias_viaje ADD CONSTRAINT incidencias_viaje_estado_check 
  CHECK (estado IN ('abierta', 'en_proceso', 'resuelta', 'cerrada'));

-- Actualizar CHECK constraint de severidad
ALTER TABLE incidencias_viaje DROP CONSTRAINT IF EXISTS incidencias_viaje_severidad_check;
ALTER TABLE incidencias_viaje ADD CONSTRAINT incidencias_viaje_severidad_check 
  CHECK (severidad IN ('baja', 'media', 'alta', 'critica'));

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_incidencias_viaje_estado ON incidencias_viaje(estado) WHERE estado IN ('abierta', 'en_proceso');
CREATE INDEX IF NOT EXISTS idx_incidencias_viaje_viaje_id ON incidencias_viaje(viaje_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_viaje_tipo ON incidencias_viaje(tipo_incidencia);
CREATE INDEX IF NOT EXISTS idx_incidencias_viaje_reportado_por ON incidencias_viaje(reportado_por);

-- ─── 2. ACTUALIZAR documentos_entidad — Estado provisorio ────────────────────

-- Actualizar CHECK constraint de estado_vigencia para incluir aprobado_provisorio
ALTER TABLE documentos_entidad DROP CONSTRAINT IF EXISTS documentos_entidad_estado_vigencia_check;
ALTER TABLE documentos_entidad ADD CONSTRAINT documentos_entidad_estado_vigencia_check 
  CHECK (estado_vigencia IN (
    'pendiente_validacion', 'vigente', 'por_vencer', 'vencido', 'rechazado', 'aprobado_provisorio'
  ));

-- Columnas de auditoría para aprobación provisoria
ALTER TABLE documentos_entidad ADD COLUMN IF NOT EXISTS aprobado_provisorio_por UUID;
ALTER TABLE documentos_entidad ADD COLUMN IF NOT EXISTS fecha_aprobacion_provisoria TIMESTAMPTZ;
ALTER TABLE documentos_entidad ADD COLUMN IF NOT EXISTS motivo_provisorio TEXT;
ALTER TABLE documentos_entidad ADD COLUMN IF NOT EXISTS incidencia_origen_id UUID;

COMMENT ON COLUMN documentos_entidad.aprobado_provisorio_por IS 'User ID del coordinador que aprobó provisionalmente';
COMMENT ON COLUMN documentos_entidad.fecha_aprobacion_provisoria IS 'Timestamp de aprobación provisoria (caduca en 24h)';
COMMENT ON COLUMN documentos_entidad.motivo_provisorio IS 'Justificación de la aprobación provisoria';
COMMENT ON COLUMN documentos_entidad.incidencia_origen_id IS 'Incidencia que originó la aprobación provisoria';

-- Índice para buscar docs provisorios pendientes de revalidación
CREATE INDEX IF NOT EXISTS idx_doc_provisorios_pendientes 
  ON documentos_entidad(estado_vigencia, fecha_aprobacion_provisoria) 
  WHERE estado_vigencia = 'aprobado_provisorio' AND activo = TRUE;

-- ─── 3. RLS POLICIES para incidencias_viaje ──────────────────────────────────

-- Habilitar RLS
ALTER TABLE incidencias_viaje ENABLE ROW LEVEL SECURITY;

-- SELECT: el usuario puede ver incidencias de viajes visibles para su empresa
-- (misma lógica que estados-camiones: empresa es origen, destino, o transporte del despacho)
DROP POLICY IF EXISTS "incidencias_viaje_select_empresa" ON incidencias_viaje;
CREATE POLICY "incidencias_viaje_select_empresa" ON incidencias_viaje FOR SELECT
  USING (
    viaje_id IN (
      SELECT vd.id
      FROM viajes_despacho vd
      JOIN despachos d ON d.id = vd.despacho_id
      LEFT JOIN ubicaciones u_origen ON u_origen.id = COALESCE(d.origen_id, d.origen_ubicacion_id)
      LEFT JOIN ubicaciones u_destino ON u_destino.id = COALESCE(d.destino_id, d.destino_ubicacion_id)
      WHERE 
        -- Empresa origen
        COALESCE(u_origen.empresa_id, d.empresa_id) IN (
          SELECT ue.empresa_id FROM usuarios_empresa ue WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
        )
        OR
        -- Empresa destino
        u_destino.empresa_id IN (
          SELECT ue.empresa_id FROM usuarios_empresa ue WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
        )
        OR
        -- Empresa transporte
        vd.id_transporte IN (
          SELECT ue.empresa_id FROM usuarios_empresa ue WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
        )
    )
  );

-- INSERT: usuario autenticado puede crear incidencias sobre viajes visibles
DROP POLICY IF EXISTS "incidencias_viaje_insert" ON incidencias_viaje;
CREATE POLICY "incidencias_viaje_insert" ON incidencias_viaje FOR INSERT
  WITH CHECK (
    reportado_por = auth.uid()
    AND viaje_id IN (
      SELECT vd.id
      FROM viajes_despacho vd
      JOIN despachos d ON d.id = vd.despacho_id
      LEFT JOIN ubicaciones u_origen ON u_origen.id = COALESCE(d.origen_id, d.origen_ubicacion_id)
      LEFT JOIN ubicaciones u_destino ON u_destino.id = COALESCE(d.destino_id, d.destino_ubicacion_id)
      WHERE 
        COALESCE(u_origen.empresa_id, d.empresa_id) IN (
          SELECT ue.empresa_id FROM usuarios_empresa ue WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
        )
        OR u_destino.empresa_id IN (
          SELECT ue.empresa_id FROM usuarios_empresa ue WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
        )
        OR vd.id_transporte IN (
          SELECT ue.empresa_id FROM usuarios_empresa ue WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
        )
    )
  );

-- UPDATE: usuario puede actualizar incidencias de viajes visibles (resolver, cambiar estado)
DROP POLICY IF EXISTS "incidencias_viaje_update" ON incidencias_viaje;
CREATE POLICY "incidencias_viaje_update" ON incidencias_viaje FOR UPDATE
  USING (
    viaje_id IN (
      SELECT vd.id
      FROM viajes_despacho vd
      JOIN despachos d ON d.id = vd.despacho_id
      LEFT JOIN ubicaciones u_origen ON u_origen.id = COALESCE(d.origen_id, d.origen_ubicacion_id)
      LEFT JOIN ubicaciones u_destino ON u_destino.id = COALESCE(d.destino_id, d.destino_ubicacion_id)
      WHERE 
        COALESCE(u_origen.empresa_id, d.empresa_id) IN (
          SELECT ue.empresa_id FROM usuarios_empresa ue WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
        )
        OR u_destino.empresa_id IN (
          SELECT ue.empresa_id FROM usuarios_empresa ue WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
        )
        OR vd.id_transporte IN (
          SELECT ue.empresa_id FROM usuarios_empresa ue WHERE ue.user_id = auth.uid() AND ue.activo = TRUE
        )
    )
  );

-- ─── 4. FUNCIÓN para caducar aprobaciones provisorias > 24h ──────────────────

CREATE OR REPLACE FUNCTION caducar_aprobaciones_provisorias()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE documentos_entidad
  SET 
    estado_vigencia = 'pendiente_validacion',
    updated_at = NOW()
  WHERE 
    estado_vigencia = 'aprobado_provisorio'
    AND fecha_aprobacion_provisoria < NOW() - INTERVAL '24 hours'
    AND activo = TRUE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  IF v_count > 0 THEN
    RAISE NOTICE '⏰ Caducadas % aprobaciones provisorias (>24h)', v_count;
  END IF;
  
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION caducar_aprobaciones_provisorias() IS 'Revierte aprobaciones provisorias que exceden 24h sin validación de admin. Ejecutar via pg_cron cada hora.';

-- Para activar con pg_cron (ejecutar manualmente en Supabase UI):
-- SELECT cron.schedule('caducar-provisorios', '0 * * * *', 'SELECT caducar_aprobaciones_provisorias()');

-- ─── 5. ADMIN BYPASS para incidencias_viaje ─────────────────────────────────

-- Admins Nodexia pueden ver todas las incidencias
DROP POLICY IF EXISTS "incidencias_viaje_admin_select" ON incidencias_viaje;
CREATE POLICY "incidencias_viaje_admin_select" ON incidencias_viaje FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND activo = TRUE
    )
    OR EXISTS (
      SELECT 1 FROM usuarios_empresa 
      WHERE user_id = auth.uid() AND rol_interno = 'admin_nodexia' AND activo = TRUE
    )
  );

-- Admins pueden actualizar cualquier incidencia
DROP POLICY IF EXISTS "incidencias_viaje_admin_update" ON incidencias_viaje;
CREATE POLICY "incidencias_viaje_admin_update" ON incidencias_viaje FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND activo = TRUE
    )
    OR EXISTS (
      SELECT 1 FROM usuarios_empresa 
      WHERE user_id = auth.uid() AND rol_interno = 'admin_nodexia' AND activo = TRUE
    )
  );

-- ─── Verificación ────────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 064: Sistema incidencias + aprobación provisoria completada';
  RAISE NOTICE '  - incidencias_viaje: documentos_afectados, CHECK constraints actualizados, RLS policies';
  RAISE NOTICE '  - documentos_entidad: estado aprobado_provisorio + columnas auditoría';
  RAISE NOTICE '  - Función caducar_aprobaciones_provisorias() creada (programar con pg_cron)';
END $$;
