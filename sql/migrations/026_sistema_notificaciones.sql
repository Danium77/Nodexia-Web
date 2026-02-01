-- Migración 026: Sistema de notificaciones en tiempo real
-- Fecha: 2026-02-01
-- Descripción: Notificaciones de eventos críticos (arribos, demoras, cambios de estado)

-- Crear enum para tipos de notificación
CREATE TYPE tipo_notificacion AS ENUM (
  'arribo_origen',
  'arribo_destino',
  'demora_detectada',
  'cambio_estado',
  'recepcion_nueva',
  'unidad_asignada',
  'viaje_iniciado',
  'viaje_completado',
  'alerta_sistema'
);

-- Crear tabla notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo tipo_notificacion NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  viaje_id UUID REFERENCES viajes_despacho(id) ON DELETE SET NULL,
  despacho_id UUID REFERENCES despachos(id) ON DELETE SET NULL,
  unidad_operativa_id UUID REFERENCES unidades_operativas(id) ON DELETE SET NULL,
  leida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_notificaciones_user ON notificaciones(user_id);
CREATE INDEX idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX idx_notificaciones_fecha ON notificaciones(created_at DESC);
CREATE INDEX idx_notificaciones_tipo ON notificaciones(tipo);

-- Comentarios
COMMENT ON TABLE notificaciones IS 'Notificaciones de eventos en tiempo real para usuarios';
COMMENT ON COLUMN notificaciones.user_id IS 'Usuario destinatario de la notificación';
COMMENT ON COLUMN notificaciones.tipo IS 'Tipo de evento que genera la notificación';
COMMENT ON COLUMN notificaciones.titulo IS 'Título corto de la notificación';
COMMENT ON COLUMN notificaciones.mensaje IS 'Mensaje descriptivo completo';
COMMENT ON COLUMN notificaciones.viaje_id IS 'Viaje relacionado (si aplica)';
COMMENT ON COLUMN notificaciones.despacho_id IS 'Despacho relacionado (si aplica)';
COMMENT ON COLUMN notificaciones.unidad_operativa_id IS 'Unidad operativa relacionada (si aplica)';
COMMENT ON COLUMN notificaciones.leida IS 'Indica si el usuario ya leyó la notificación';

-- RLS (Row Level Security)
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios solo ven sus propias notificaciones
CREATE POLICY "Usuarios ven sus notificaciones"
ON notificaciones
FOR SELECT
USING (user_id = auth.uid());

-- Policy: Sistema puede insertar notificaciones
CREATE POLICY "Sistema inserta notificaciones"
ON notificaciones
FOR INSERT
WITH CHECK (true); -- Se controla a nivel de API con service role

-- Policy: Usuarios pueden marcar sus notificaciones como leídas
CREATE POLICY "Usuarios marcan como leídas"
ON notificaciones
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Función para crear notificación para todos los coordinadores de una empresa
CREATE OR REPLACE FUNCTION notificar_coordinadores_empresa(
  p_empresa_id UUID,
  p_tipo tipo_notificacion,
  p_titulo VARCHAR,
  p_mensaje TEXT,
  p_viaje_id UUID DEFAULT NULL,
  p_despacho_id UUID DEFAULT NULL,
  p_unidad_operativa_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  notificaciones_creadas INTEGER := 0;
  coordinador_id UUID;
BEGIN
  -- Obtener todos los coordinadores de la empresa
  FOR coordinador_id IN
    SELECT DISTINCT re.user_id
    FROM relaciones_empresas re
    WHERE (re.empresa_cliente_id = p_empresa_id OR re.empresa_transporte_id = p_empresa_id)
      AND re.role_type = 'coordinador'
      AND re.activo = TRUE
  LOOP
    -- Insertar notificación para cada coordinador
    INSERT INTO notificaciones (
      user_id,
      tipo,
      titulo,
      mensaje,
      viaje_id,
      despacho_id,
      unidad_operativa_id
    ) VALUES (
      coordinador_id,
      p_tipo,
      p_titulo,
      p_mensaje,
      p_viaje_id,
      p_despacho_id,
      p_unidad_operativa_id
    );
    
    notificaciones_creadas := notificaciones_creadas + 1;
  END LOOP;
  
  RETURN notificaciones_creadas;
END;
$$;

COMMENT ON FUNCTION notificar_coordinadores_empresa IS 'Crea notificaciones para todos los coordinadores de una empresa';

-- Trigger: Notificar cuando un viaje cambia a "arribo_destino"
CREATE OR REPLACE FUNCTION trigger_notificar_arribo_destino()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  despacho_data RECORD;
  empresa_cliente_id UUID;
BEGIN
  -- Solo actuar en cambio de estado a arribo_destino
  IF NEW.estado = 'arribo_destino' AND (OLD.estado IS NULL OR OLD.estado != 'arribo_destino') THEN
    -- Obtener datos del despacho
    SELECT d.*, d.empresa_id
    INTO despacho_data
    FROM despachos d
    WHERE d.id = NEW.despacho_id;
    
    IF despacho_data IS NOT NULL THEN
      -- Notificar a coordinadores de la empresa cliente
      PERFORM notificar_coordinadores_empresa(
        despacho_data.empresa_id,
        'arribo_destino'::tipo_notificacion,
        'Arribo a Destino',
        'El viaje ' || NEW.id || ' del pedido ' || despacho_data.pedido_id || ' ha arribado al destino: ' || despacho_data.destino,
        NEW.id,
        NEW.despacho_id,
        NULL
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notificacion_arribo_destino
AFTER UPDATE ON viajes_despacho
FOR EACH ROW
WHEN (NEW.estado = 'arribo_destino')
EXECUTE FUNCTION trigger_notificar_arribo_destino();

COMMENT ON FUNCTION trigger_notificar_arribo_destino IS 'Notifica cuando un viaje arriba a destino';

-- Vista de notificaciones no leídas por usuario
CREATE OR REPLACE VIEW vista_notificaciones_pendientes AS
SELECT 
  n.id,
  n.user_id,
  n.tipo,
  n.titulo,
  n.mensaje,
  n.viaje_id,
  n.despacho_id,
  n.unidad_operativa_id,
  n.created_at,
  -- Datos del viaje si aplica
  vd.estado AS viaje_estado,
  d.pedido_id,
  d.origen,
  d.destino,
  -- Datos de unidad si aplica
  uo.nombre AS unidad_nombre
FROM notificaciones n
LEFT JOIN viajes_despacho vd ON n.viaje_id = vd.id
LEFT JOIN despachos d ON n.despacho_id = d.id
LEFT JOIN unidades_operativas uo ON n.unidad_operativa_id = uo.id
WHERE n.leida = FALSE
ORDER BY n.created_at DESC;

COMMENT ON VIEW vista_notificaciones_pendientes IS 'Notificaciones no leídas con datos relacionados';

-- Función para limpiar notificaciones antiguas leídas (retener 7 días)
CREATE OR REPLACE FUNCTION limpiar_notificaciones_antiguas()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM notificaciones
  WHERE leida = TRUE
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$;

COMMENT ON FUNCTION limpiar_notificaciones_antiguas IS 'Elimina notificaciones leídas más antiguas que 7 días';

-- Grants
GRANT SELECT, UPDATE ON notificaciones TO authenticated;
GRANT SELECT ON vista_notificaciones_pendientes TO authenticated;
