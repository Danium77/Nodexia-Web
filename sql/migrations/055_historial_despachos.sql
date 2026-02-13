-- ============================================================================
-- Migración 055: Historial de Eventos para Despachos y Viajes
-- Tabla para registrar eventos que NO son transiciones de estado
-- (las transiciones ya están en viajes_despacho.fecha_*)
-- ============================================================================

-- Tabla principal de historial
CREATE TABLE IF NOT EXISTS historial_despachos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  despacho_id UUID REFERENCES despachos(id) ON DELETE CASCADE,
  viaje_id UUID REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  accion VARCHAR(100) NOT NULL,
  descripcion TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  empresa_id UUID REFERENCES empresas(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_historial_despachos_despacho_id ON historial_despachos(despacho_id);
CREATE INDEX IF NOT EXISTS idx_historial_despachos_viaje_id ON historial_despachos(viaje_id);
CREATE INDEX IF NOT EXISTS idx_historial_despachos_created_at ON historial_despachos(created_at DESC);

-- RLS
ALTER TABLE historial_despachos ENABLE ROW LEVEL SECURITY;

-- SELECT: cualquier usuario autenticado puede leer historial
CREATE POLICY "historial_despachos_select" ON historial_despachos
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: cualquier usuario autenticado puede insertar eventos
CREATE POLICY "historial_despachos_insert" ON historial_despachos
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Acciones válidas (documentadas, no enforced por CHECK para flexibilidad):
-- 'despacho_creado'
-- 'transporte_asignado'
-- 'transporte_desvinculado'
-- 'unidad_asignada'
-- 'viaje_cancelado'
-- 'viaje_reasignado'
-- 'oferta_recibida'
-- 'oferta_aceptada'
-- 'oferta_rechazada'
-- 'documento_subido'
-- 'incidencia_creada'
-- 'nota_manual'
-- 'estado_cambiado'
