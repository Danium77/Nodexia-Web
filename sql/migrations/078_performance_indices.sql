-- =====================================================
-- MIGRATION 078: Índices de performance faltantes
-- Fecha: 2025-01-XX
-- Propósito: Agregar índices P0/P1 identificados en auditoría A7
-- =====================================================

-- =====================================================
-- P0: CRITICAL — Impacto directo en RLS y queries frecuentes
-- =====================================================

-- 1. Compound index para RLS: todas las policies hacen
--    EXISTS(SELECT 1 FROM usuarios_empresa WHERE user_id=auth.uid() AND empresa_id=X AND activo=true)
--    El existente idx_usuarios_empresa_user_activo solo cubre (user_id) WHERE activo=true.
--    Este compound permite index-only scan sin acceder al heap para verificar empresa_id.
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_user_empresa_activo
ON usuarios_empresa(user_id, empresa_id)
WHERE activo = true;

-- 2. relaciones_empresas(empresa_transporte_id) — 10+ query locations
--    Solo existe idx_relaciones_cliente (empresa_cliente_id) y idx_relaciones_empresas_deleted_at
CREATE INDEX IF NOT EXISTS idx_relaciones_transporte
ON relaciones_empresas(empresa_transporte_id);

-- 3. relaciones_empresas ya tiene idx_relaciones_cliente(empresa_cliente_id)
--    No se necesita otro índice en esa columna.

-- 4. registros_acceso(usuario_id) — control-acceso page filtra por usuario
--    Solo existen índices en viaje_id, timestamp, tipo
CREATE INDEX IF NOT EXISTS idx_registros_acceso_usuario
ON registros_acceso(usuario_id);

-- =====================================================
-- P1: IMPORTANT — ORDER BY y filtros frecuentes
-- =====================================================

-- 5. viajes_despacho(created_at DESC) — 8+ ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_created_at
ON viajes_despacho(created_at DESC);

-- 6. despachos(scheduled_local_date) — scheduling filter/sort
CREATE INDEX IF NOT EXISTS idx_despachos_scheduled_date
ON despachos(scheduled_local_date);

-- 7. viajes_despacho(numero_viaje) — 6+ ORDER BY numero_viaje
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_numero_viaje
ON viajes_despacho(numero_viaje);

-- 8. empresas(tipo_empresa) — frequent filter in empresa selection
CREATE INDEX IF NOT EXISTS idx_empresas_tipo
ON empresas(tipo_empresa);
