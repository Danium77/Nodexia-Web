-- ================================================
-- FIX FINAL: Eliminar COMPLETAMENTE y recrear notificaciones
-- Fecha: 11 de Noviembre 2025
-- Descripción: Eliminación agresiva de todo rastro de notificaciones y recreación limpia
-- ================================================

-- PASO 1: Eliminar TODOS los triggers (sin importar errores)
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS trigger_notificacion_cancelacion ON viajes_despacho CASCADE;
    DROP TRIGGER IF EXISTS trigger_notificacion_viaje_asignado ON viajes_despacho CASCADE;
    DROP TRIGGER IF EXISTS trigger_crear_notificacion_cancelacion ON viajes_despacho CASCADE;
    DROP TRIGGER IF EXISTS trigger_crear_notificacion_viaje_asignado ON viajes_despacho CASCADE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Triggers eliminados o no existían';
END $$;

-- PASO 2: Eliminar TODAS las funciones relacionadas (sin importar errores)
DO $$ 
BEGIN
    DROP FUNCTION IF EXISTS crear_notificacion_cancelacion() CASCADE;
    DROP FUNCTION IF EXISTS crear_notificacion_viaje_asignado() CASCADE;
    DROP FUNCTION IF EXISTS marcar_notificacion_leida(UUID) CASCADE;
    DROP FUNCTION IF EXISTS marcar_todas_notificaciones_leidas() CASCADE;
    DROP FUNCTION IF EXISTS notificar_cancelacion_viaje() CASCADE;
    DROP FUNCTION IF EXISTS notificar_asignacion_viaje() CASCADE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Funciones eliminadas o no existían';
END $$;

-- PASO 3: Eliminar la tabla (sin importar errores)
DO $$ 
BEGIN
    DROP TABLE IF EXISTS notificaciones CASCADE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Tabla eliminada o no existía';
END $$;

-- PASO 4: Verificar que se eliminó
SELECT 'Tabla notificaciones eliminada' as status;

-- PASO 5: Crear tabla NUEVA (sin empresa_id)
CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'viaje_cancelado',
    'viaje_asignado',
    'viaje_reasignado',
    'recursos_asignados',
    'cambio_estado',
    'mensaje_sistema'
  )),
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT FALSE,
  viaje_id UUID REFERENCES viajes_despacho(id) ON DELETE SET NULL,
  despacho_id TEXT,
  pedido_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  leida_at TIMESTAMPTZ
);

-- PASO 6: Crear índices
CREATE INDEX idx_notificaciones_user_id ON notificaciones(user_id);
CREATE INDEX idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX idx_notificaciones_created_at ON notificaciones(created_at DESC);
CREATE INDEX idx_notificaciones_tipo ON notificaciones(tipo);
CREATE INDEX idx_notificaciones_viaje_id ON notificaciones(viaje_id) WHERE viaje_id IS NOT NULL;

-- PASO 7: Habilitar RLS
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- PASO 8: Crear políticas RLS
CREATE POLICY notificaciones_select_own 
  ON notificaciones 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY notificaciones_update_own 
  ON notificaciones 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY notificaciones_insert_system 
  ON notificaciones 
  FOR INSERT 
  WITH CHECK (true);

-- PASO 9: Crear función para marcar como leída
CREATE OR REPLACE FUNCTION marcar_notificacion_leida(p_notificacion_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notificaciones 
  SET 
    leida = true,
    leida_at = NOW()
  WHERE id = p_notificacion_id 
    AND user_id = auth.uid();
END;
$$;

-- PASO 10: Crear función para marcar todas como leídas
CREATE OR REPLACE FUNCTION marcar_todas_notificaciones_leidas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notificaciones 
  SET 
    leida = true,
    leida_at = NOW()
  WHERE user_id = auth.uid()
    AND leida = false;
END;
$$;

-- PASO 11: Crear función para notificación de cancelación
CREATE OR REPLACE FUNCTION crear_notificacion_cancelacion()
RETURNS TRIGGER AS $$
DECLARE
  v_despacho RECORD;
  v_coordinador_planta_id UUID;
  v_titulo TEXT;
  v_mensaje TEXT;
BEGIN
  -- Solo crear notificación si el viaje fue cancelado por transporte
  IF NEW.estado = 'cancelado_por_transporte' AND (OLD IS NULL OR OLD.estado != 'cancelado_por_transporte') THEN
    
    -- Obtener datos del despacho
    SELECT * INTO v_despacho
    FROM despachos
    WHERE id = NEW.despacho_id;
    
    IF v_despacho IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Obtener coordinador de planta de la empresa del despacho
    SELECT ue.user_id INTO v_coordinador_planta_id
    FROM usuarios_empresa ue
    WHERE ue.empresa_id = v_despacho.company_id
      AND ue.rol_empresa_id IN (
        SELECT id FROM roles_empresa WHERE nombre = 'coordinador_planta'
      )
    LIMIT 1;
    
    IF v_coordinador_planta_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Crear mensaje
    v_titulo := '⚠️ Viaje Cancelado por Transporte';
    v_mensaje := format(
      'El viaje #%s del pedido %s ha sido cancelado por el transporte. Motivo: %s',
      NEW.numero_viaje,
      v_despacho.pedido_id,
      COALESCE(NEW.motivo_cancelacion, 'No especificado')
    );
    
    -- Insertar notificación (SOLO user_id, SIN empresa_id)
    INSERT INTO notificaciones (
      user_id,
      tipo,
      titulo,
      mensaje,
      viaje_id,
      despacho_id,
      pedido_id,
      metadata
    ) VALUES (
      v_coordinador_planta_id,
      'viaje_cancelado',
      v_titulo,
      v_mensaje,
      NEW.id,
      NEW.despacho_id,
      v_despacho.pedido_id,
      jsonb_build_object(
        'numero_viaje', NEW.numero_viaje,
        'motivo', NEW.motivo_cancelacion,
        'transporte_cancelado_nombre', NEW.transporte_cancelado_nombre,
        'fecha_cancelacion', NEW.fecha_cancelacion
      )
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 12: Crear función para notificación de asignación
CREATE OR REPLACE FUNCTION crear_notificacion_viaje_asignado()
RETURNS TRIGGER AS $$
DECLARE
  v_despacho RECORD;
  v_coordinador_transporte_id UUID;
  v_titulo TEXT;
  v_mensaje TEXT;
BEGIN
  -- Solo crear notificación si el viaje fue asignado a un transporte
  IF NEW.estado = 'asignado' AND (OLD IS NULL OR OLD.estado != 'asignado') AND NEW.id_transporte IS NOT NULL THEN
    
    -- Obtener datos del despacho
    SELECT * INTO v_despacho
    FROM despachos
    WHERE id = NEW.despacho_id;
    
    IF v_despacho IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Obtener coordinador de transporte de la empresa transportista
    SELECT ue.user_id INTO v_coordinador_transporte_id
    FROM usuarios_empresa ue
    WHERE ue.empresa_id = NEW.id_transporte
      AND ue.rol_empresa_id IN (
        SELECT id FROM roles_empresa WHERE nombre = 'coordinador_transporte'
      )
    LIMIT 1;
    
    IF v_coordinador_transporte_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Crear mensaje
    v_titulo := '🚛 Nuevo Viaje Asignado';
    v_mensaje := format(
      'Se te ha asignado el viaje #%s del pedido %s',
      NEW.numero_viaje,
      v_despacho.pedido_id
    );
    
    -- Insertar notificación (SOLO user_id, SIN empresa_id)
    INSERT INTO notificaciones (
      user_id,
      tipo,
      titulo,
      mensaje,
      viaje_id,
      despacho_id,
      pedido_id,
      metadata
    ) VALUES (
      v_coordinador_transporte_id,
      'viaje_asignado',
      v_titulo,
      v_mensaje,
      NEW.id,
      NEW.despacho_id,
      v_despacho.pedido_id,
      jsonb_build_object(
        'numero_viaje', NEW.numero_viaje,
        'origen', v_despacho.origen,
        'destino', v_despacho.destino
      )
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 13: Crear triggers
CREATE TRIGGER trigger_notificacion_cancelacion
  AFTER UPDATE ON viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION crear_notificacion_cancelacion();

CREATE TRIGGER trigger_notificacion_viaje_asignado
  AFTER INSERT OR UPDATE ON viajes_despacho
  FOR EACH ROW
  EXECUTE FUNCTION crear_notificacion_viaje_asignado();

-- PASO 14: Permisos
GRANT ALL ON notificaciones TO authenticated;
GRANT EXECUTE ON FUNCTION marcar_notificacion_leida(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION marcar_todas_notificaciones_leidas() TO authenticated;

-- Verificación final
SELECT 'Sistema de notificaciones recreado exitosamente (SIN empresa_id)' as status;

-- Verificar estructura de la tabla
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notificaciones' 
ORDER BY ordinal_position;
