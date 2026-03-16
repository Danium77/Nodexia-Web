-- ============================================================================
-- Migración 077: Tabla audit_log para logging de acciones sensibles
-- Fecha: 16-Mar-2026
-- Sesión: 40
--
-- Registra acciones administrativas y operacionales sensibles:
--   - Gestión de usuarios (crear, eliminar, editar, invitar)
--   - Cambios de roles/permisos
--   - Eliminación de despachos
--   - Asignación de unidades
--   - Validación de documentos
--   - Cambios de estado de viajes
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  action        text NOT NULL,              -- ej: 'user.delete', 'despacho.delete', 'unit.assign'
  actor_id      uuid NOT NULL,              -- user_id del que ejecuta la acción
  actor_email   text,                       -- email del actor (denormalizado para consulta rápida)
  empresa_id    uuid,                       -- empresa del actor
  target_type   text,                       -- tipo del recurso afectado: 'user', 'despacho', 'document', etc.
  target_id     text,                       -- id del recurso afectado
  metadata      jsonb DEFAULT '{}'::jsonb,  -- datos adicionales (ej: campos cambiados, rol asignado)
  ip_address    text,                       -- IP del request
  status        text DEFAULT 'success',     -- 'success' | 'denied' | 'error'
  created_at    timestamptz DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_empresa ON audit_log(empresa_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON audit_log(target_type, target_id);

-- RLS: solo admin_nodexia puede leer logs, nadie escribe desde el cliente
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo admin lee audit logs"
ON audit_log FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND ue.rol_interno = 'admin_nodexia'
      AND ue.activo = true
  )
);

-- No INSERT/UPDATE/DELETE policies — writes only via supabaseAdmin

-- Registrar migración
INSERT INTO schema_migrations (version, name, filename, applied_at)
VALUES ('077', '077_audit_log_table', '077_audit_log_table.sql', NOW())
ON CONFLICT (version) DO NOTHING;
