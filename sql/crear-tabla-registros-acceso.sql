-- Crear tabla para registros de acceso (ingresos/egresos)
-- Para el módulo de Control de Acceso

CREATE TABLE IF NOT EXISTS registros_acceso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  usuario_id UUID REFERENCES auth.users(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_registros_acceso_viaje_id ON registros_acceso(viaje_id);
CREATE INDEX IF NOT EXISTS idx_registros_acceso_timestamp ON registros_acceso(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_registros_acceso_tipo ON registros_acceso(tipo);

-- RLS Policies
ALTER TABLE registros_acceso ENABLE ROW LEVEL SECURITY;

-- Policy: Todos pueden leer registros de viajes de su empresa
CREATE POLICY "registros_acceso_select_policy" ON registros_acceso
  FOR SELECT
  USING (true); -- Por ahora permitir lectura a todos los autenticados

-- Policy: Todos los usuarios autenticados pueden insertar (se validará en la app)
CREATE POLICY "registros_acceso_insert_policy" ON registros_acceso
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Comentarios
COMMENT ON TABLE registros_acceso IS 'Registros de ingresos y egresos en Control de Acceso';
COMMENT ON COLUMN registros_acceso.tipo IS 'Tipo de operación: ingreso o egreso';
COMMENT ON COLUMN registros_acceso.timestamp IS 'Fecha y hora del registro';
