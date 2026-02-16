-- ============================================================================
-- Migración 060: Índices de Performance + Políticas de Retención
-- Fecha: 2026-02-16
-- Contexto: Auditoría de performance reveló índices faltantes en tablas críticas
--           y tablas de alta velocidad de crecimiento sin políticas de limpieza
-- ============================================================================

-- ============================================================================
-- PARTE 1: ÍNDICES FALTANTES CRÍTICOS
-- ============================================================================

-- viajes_despacho: tabla más consultada del sistema
-- estado: filtrado en TODAS las queries de despachos, planificación, tracking
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_estado 
  ON viajes_despacho(estado);

-- chofer_id: usado por chofer/viajes API, tracking, asignación
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_chofer_id 
  ON viajes_despacho(chofer_id);

-- despacho_id: JOIN key con tabla despachos (1:1)
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_despacho_id 
  ON viajes_despacho(despacho_id);

-- camion_id: usado en vistas de flota, tracking
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_camion_id 
  ON viajes_despacho(camion_id);

-- id_transporte: filtro por empresa de transporte
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_id_transporte 
  ON viajes_despacho(id_transporte);

-- Índice compuesto para queries frecuentes de viajes activos por transporte
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_transporte_estado 
  ON viajes_despacho(id_transporte, estado);

-- choferes: lookup por userId y email (chofer/viajes API, tracking)
CREATE INDEX IF NOT EXISTS idx_choferes_usuario_id 
  ON choferes(usuario_id);

CREATE INDEX IF NOT EXISTS idx_choferes_email 
  ON choferes(email);

-- notificaciones: queries siempre filtran por user_id + leida
CREATE INDEX IF NOT EXISTS idx_notificaciones_user_leida 
  ON notificaciones(user_id, leida);

-- despachos: filtro por created_by (queries de coordinador)
CREATE INDEX IF NOT EXISTS idx_despachos_created_by 
  ON despachos(created_by);

-- despachos: filtro por estado para tabs
CREATE INDEX IF NOT EXISTS idx_despachos_estado 
  ON despachos(estado);

-- ============================================================================
-- PARTE 2: POLÍTICAS DE RETENCIÓN AUTOMÁTICA (pg_cron)
-- ============================================================================

  
-- ============================================================================
