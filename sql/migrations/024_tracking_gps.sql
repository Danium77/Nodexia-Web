-- Migración 024: Tabla de tracking GPS en tiempo real
-- Fecha: 2026-02-01
-- Descripción: Almacena ubicaciones GPS de choferes para tracking en tiempo real

-- Crear tabla tracking_gps
CREATE TABLE IF NOT EXISTS tracking_gps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chofer_id UUID NOT NULL REFERENCES choferes(id) ON DELETE CASCADE,
  latitud DECIMAL(10, 8) NOT NULL,
  longitud DECIMAL(11, 8) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  velocidad DECIMAL(5, 2), -- km/h
  rumbo INTEGER, -- 0-360 grados
  precision_metros INTEGER, -- Precisión en metros
  bateria_porcentaje INTEGER, -- % batería del dispositivo
  app_version VARCHAR(20), -- Versión de la app móvil
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT velocidad_valida CHECK (velocidad >= 0 AND velocidad <= 200),
  CONSTRAINT rumbo_valido CHECK (rumbo >= 0 AND rumbo <= 360),
  CONSTRAINT bateria_valida CHECK (bateria_porcentaje >= 0 AND bateria_porcentaje <= 100)
);

-- Índices para optimizar queries
CREATE INDEX idx_tracking_gps_chofer ON tracking_gps(chofer_id);
CREATE INDEX idx_tracking_gps_timestamp ON tracking_gps(timestamp DESC);
CREATE INDEX idx_tracking_gps_chofer_timestamp ON tracking_gps(chofer_id, timestamp DESC);

-- Comentarios
COMMENT ON TABLE tracking_gps IS 'Registro de ubicaciones GPS de choferes para tracking en tiempo real';
COMMENT ON COLUMN tracking_gps.chofer_id IS 'Referencia al chofer que reporta la ubicación';
COMMENT ON COLUMN tracking_gps.latitud IS 'Latitud en formato decimal (-90 a 90)';
COMMENT ON COLUMN tracking_gps.longitud IS 'Longitud en formato decimal (-180 a 180)';
COMMENT ON COLUMN tracking_gps.timestamp IS 'Momento exacto de la captura GPS (del dispositivo)';
COMMENT ON COLUMN tracking_gps.velocidad IS 'Velocidad en km/h al momento de la captura';
COMMENT ON COLUMN tracking_gps.rumbo IS 'Dirección del movimiento en grados (0=Norte, 90=Este, 180=Sur, 270=Oeste)';
COMMENT ON COLUMN tracking_gps.precision_metros IS 'Precisión estimada de la ubicación en metros';
COMMENT ON COLUMN tracking_gps.bateria_porcentaje IS 'Nivel de batería del dispositivo móvil';
COMMENT ON COLUMN tracking_gps.app_version IS 'Versión de la aplicación móvil que reporta';

-- RLS (Row Level Security)
ALTER TABLE tracking_gps ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios solo ven tracking de su empresa de transporte
CREATE POLICY "Usuarios ven tracking de su empresa"
ON tracking_gps
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM choferes c
    JOIN unidades_operativas uo ON c.id = uo.chofer_id
    JOIN relaciones_empresas re ON uo.empresa_id = re.empresa_transporte_id
    WHERE c.id = tracking_gps.chofer_id
      AND re.user_id = auth.uid()
  )
);

-- Policy: Solo choferes pueden insertar su propia ubicación (vía API con service role)
-- Esta policy se maneja a nivel de API para mayor control

-- Vista para última ubicación de cada chofer
CREATE OR REPLACE VIEW ultima_ubicacion_choferes AS
SELECT DISTINCT ON (chofer_id)
  chofer_id,
  latitud,
  longitud,
  timestamp,
  velocidad,
  rumbo,
  precision_metros
FROM tracking_gps
ORDER BY chofer_id, timestamp DESC;

COMMENT ON VIEW ultima_ubicacion_choferes IS 'Última ubicación GPS registrada de cada chofer';

-- Función para limpiar datos antiguos (retener últimos 30 días)
CREATE OR REPLACE FUNCTION limpiar_tracking_antiguo()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM tracking_gps
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$;

COMMENT ON FUNCTION limpiar_tracking_antiguo IS 'Elimina registros de tracking GPS más antiguos que 30 días';

-- Trigger para validar coordenadas (Argentina: lat -55 a -21, lon -73 a -53)
CREATE OR REPLACE FUNCTION validar_coordenadas_argentina()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.latitud < -55 OR NEW.latitud > -21 THEN
    RAISE EXCEPTION 'Latitud fuera del rango de Argentina: %', NEW.latitud;
  END IF;
  
  IF NEW.longitud < -73 OR NEW.longitud > -53 THEN
    RAISE EXCEPTION 'Longitud fuera del rango de Argentina: %', NEW.longitud;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_validar_coordenadas
BEFORE INSERT OR UPDATE ON tracking_gps
FOR EACH ROW
EXECUTE FUNCTION validar_coordenadas_argentina();

COMMENT ON FUNCTION validar_coordenadas_argentina IS 'Valida que las coordenadas estén dentro del rango geográfico de Argentina';

-- Grants
GRANT SELECT ON tracking_gps TO authenticated;
GRANT SELECT ON ultima_ubicacion_choferes TO authenticated;
