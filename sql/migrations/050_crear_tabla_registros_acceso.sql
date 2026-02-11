-- =====================================================
-- MIGRATION 050: Crear tabla registros_acceso
-- Fecha: 12-Feb-2026
-- Propósito: Tabla para registrar ingresos/egresos en Control de Acceso
-- EJECUTAR EN SUPABASE SQL EDITOR
-- =====================================================

-- Crear tabla
CREATE TABLE IF NOT EXISTS registros_acceso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  usuario_id UUID REFERENCES auth.users(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_registros_acceso_viaje_id ON registros_acceso(viaje_id);
CREATE INDEX IF NOT EXISTS idx_registros_acceso_timestamp ON registros_acceso(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_registros_acceso_tipo ON registros_acceso(tipo);

-- RLS
ALTER TABLE registros_acceso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "registros_acceso_select_authenticated" ON registros_acceso
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "registros_acceso_insert_authenticated" ON registros_acceso
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

COMMENT ON TABLE registros_acceso IS 'Registros de ingresos y egresos en Control de Acceso';
