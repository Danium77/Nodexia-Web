-- Migración 025: Historial de cambios en unidades operativas
-- Fecha: 2026-02-01
-- Descripción: Registra cambios en composición de unidades (chofer, camión, acoplado)

-- Crear tabla historial_unidades_operativas
CREATE TABLE IF NOT EXISTS historial_unidades_operativas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unidad_operativa_id UUID NOT NULL REFERENCES unidades_operativas(id) ON DELETE CASCADE,
  tipo_cambio VARCHAR(20) NOT NULL CHECK (tipo_cambio IN ('chofer', 'camion', 'acoplado', 'activo', 'nombre')),
  valor_anterior TEXT,
  valor_nuevo TEXT,
  modificado_por UUID REFERENCES auth.users(id),
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_historial_unidades_unidad ON historial_unidades_operativas(unidad_operativa_id);
CREATE INDEX idx_historial_unidades_fecha ON historial_unidades_operativas(created_at DESC);
CREATE INDEX idx_historial_unidades_tipo ON historial_unidades_operativas(tipo_cambio);

-- Comentarios
COMMENT ON TABLE historial_unidades_operativas IS 'Historial de cambios en unidades operativas';
COMMENT ON COLUMN historial_unidades_operativas.unidad_operativa_id IS 'ID de la unidad operativa modificada';
COMMENT ON COLUMN historial_unidades_operativas.tipo_cambio IS 'Tipo de recurso modificado: chofer, camion, acoplado, activo, nombre';
COMMENT ON COLUMN historial_unidades_operativas.valor_anterior IS 'Valor antes del cambio (ID o texto)';
COMMENT ON COLUMN historial_unidades_operativas.valor_nuevo IS 'Valor después del cambio (ID o texto)';
COMMENT ON COLUMN historial_unidades_operativas.modificado_por IS 'Usuario que realizó el cambio';
COMMENT ON COLUMN historial_unidades_operativas.motivo IS 'Razón del cambio';

-- RLS (Row Level Security)
ALTER TABLE historial_unidades_operativas ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios ven historial de unidades de su empresa
CREATE POLICY "Usuarios ven historial de su empresa"
ON historial_unidades_operativas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM unidades_operativas uo
    JOIN relaciones_empresas re ON uo.empresa_id = re.empresa_transporte_id
    WHERE uo.id = historial_unidades_operativas.unidad_operativa_id
      AND re.user_id = auth.uid()
  )
);

-- Policy: Solo coordinadores y admins pueden insertar historial
CREATE POLICY "Coordinadores insertan historial"
ON historial_unidades_operativas
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM relaciones_empresas re
    WHERE re.user_id = auth.uid()
      AND re.role_type IN ('coordinador', 'admin', 'admin_nodexia', 'super_admin')
  )
);

-- Vista enriquecida del historial con nombres legibles
CREATE OR REPLACE VIEW vista_historial_unidades AS
SELECT 
  h.id,
  h.unidad_operativa_id,
  uo.nombre AS unidad_nombre,
  uo.codigo AS unidad_codigo,
  h.tipo_cambio,
  h.valor_anterior,
  h.valor_nuevo,
  h.modificado_por,
  u.email AS modificado_por_email,
  h.motivo,
  h.created_at,
  -- Nombres legibles según tipo de cambio
  CASE 
    WHEN h.tipo_cambio = 'chofer' THEN (
      SELECT CONCAT(c.apellido, ', ', c.nombre)
      FROM choferes c
      WHERE c.id::TEXT = h.valor_nuevo
    )
    WHEN h.tipo_cambio = 'camion' THEN (
      SELECT patente
      FROM camiones cam
      WHERE cam.id::TEXT = h.valor_nuevo
    )
    WHEN h.tipo_cambio = 'acoplado' THEN (
      SELECT patente
      FROM acoplados ac
      WHERE ac.id::TEXT = h.valor_nuevo
    )
    ELSE h.valor_nuevo
  END AS valor_nuevo_legible,
  CASE 
    WHEN h.tipo_cambio = 'chofer' THEN (
      SELECT CONCAT(c.apellido, ', ', c.nombre)
      FROM choferes c
      WHERE c.id::TEXT = h.valor_anterior
    )
    WHEN h.tipo_cambio = 'camion' THEN (
      SELECT patente
      FROM camiones cam
      WHERE cam.id::TEXT = h.valor_anterior
    )
    WHEN h.tipo_cambio = 'acoplado' THEN (
      SELECT patente
      FROM acoplados ac
      WHERE ac.id::TEXT = h.valor_anterior
    )
    ELSE h.valor_anterior
  END AS valor_anterior_legible
FROM historial_unidades_operativas h
JOIN unidades_operativas uo ON h.unidad_operativa_id = uo.id
LEFT JOIN auth.users u ON h.modificado_por = u.id
ORDER BY h.created_at DESC;

COMMENT ON VIEW vista_historial_unidades IS 'Vista enriquecida del historial con nombres legibles de recursos';

-- Grants
GRANT SELECT ON historial_unidades_operativas TO authenticated;
GRANT INSERT ON historial_unidades_operativas TO authenticated;
GRANT SELECT ON vista_historial_unidades TO authenticated;
