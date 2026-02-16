-- ============================================================
-- BLOQUE 1: Indices de Performance
-- Copiar TODO y pegar en Supabase Dashboard → SQL Editor → Run
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_viajes_despacho_estado ON viajes_despacho(estado);
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_chofer_id ON viajes_despacho(chofer_id);
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_despacho_id ON viajes_despacho(despacho_id);
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_camion_id ON viajes_despacho(camion_id);
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_id_transporte ON viajes_despacho(id_transporte);
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_transporte_estado ON viajes_despacho(id_transporte, estado);
CREATE INDEX IF NOT EXISTS idx_choferes_usuario_id ON choferes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_choferes_email ON choferes(email);
CREATE INDEX IF NOT EXISTS idx_notificaciones_user_leida ON notificaciones(user_id, leida);
CREATE INDEX IF NOT EXISTS idx_despachos_created_by ON despachos(created_by);
CREATE INDEX IF NOT EXISTS idx_despachos_estado ON despachos(estado);
