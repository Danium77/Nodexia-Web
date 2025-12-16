-- ================================================
-- FIX ULTRA FINAL: Forzar eliminación completa
-- Fecha: 11 de Noviembre 2025
-- Descripción: Eliminar TODO sin excepciones y recrear limpio
-- ================================================

-- PASO 1: Deshabilitar todos los triggers primero
ALTER TABLE viajes_despacho DISABLE TRIGGER ALL;

-- PASO 2: Eliminar triggers específicos
DROP TRIGGER IF EXISTS trigger_notificacion_cancelacion ON viajes_despacho CASCADE;
DROP TRIGGER IF EXISTS trigger_notificacion_viaje_asignado ON viajes_despacho CASCADE;
DROP TRIGGER IF EXISTS trigger_crear_notificacion_cancelacion ON viajes_despacho CASCADE;
DROP TRIGGER IF EXISTS trigger_crear_notificacion_viaje_asignado ON viajes_despacho CASCADE;
DROP TRIGGER IF EXISTS notificar_cancelacion_trigger ON viajes_despacho CASCADE;
DROP TRIGGER IF EXISTS notificar_asignacion_trigger ON viajes_despacho CASCADE;

-- PASO 3: Eliminar todas las funciones (cada una por separado)
DROP FUNCTION IF EXISTS crear_notificacion_cancelacion() CASCADE;
DROP FUNCTION IF EXISTS crear_notificacion_viaje_asignado() CASCADE;
DROP FUNCTION IF EXISTS marcar_notificacion_leida(UUID) CASCADE;
DROP FUNCTION IF EXISTS marcar_todas_notificaciones_leidas() CASCADE;
DROP FUNCTION IF EXISTS notificar_cancelacion_viaje() CASCADE;
DROP FUNCTION IF EXISTS notificar_asignacion_viaje() CASCADE;

-- PASO 4: Eliminar la tabla SIN CASCADE (para ver errores si los hay)
DROP TABLE IF EXISTS notificaciones;

-- PASO 5: Verificar que se eliminó
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notificaciones') THEN
        RAISE EXCEPTION 'ERROR: La tabla notificaciones NO se eliminó correctamente';
    ELSE
        RAISE NOTICE 'OK: Tabla notificaciones eliminada';
    END IF;
END $$;

-- PASO 6: Crear tabla NUEVA desde cero (sin empresa_id)
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

-- PASO 7: Crear índices
CREATE INDEX idx_notificaciones_user_id ON notificaciones(user_id);
CREATE INDEX idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX idx_notificaciones_created_at ON notificaciones(created_at DESC);
CREATE INDEX idx_notificaciones_tipo ON notificaciones(tipo);
CREATE INDEX idx_notificaciones_viaje_id ON notificaciones(viaje_id) WHERE viaje_id IS NOT NULL;

-- PASO 8: RLS
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY notificaciones_select_own 
  ON notificaciones FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY notificaciones_update_own 
  ON notificaciones FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY notificaciones_insert_system 
  ON notificaciones FOR INSERT 
  WITH CHECK (true);

-- PASO 9: Funciones RPC
CREATE OR REPLACE FUNCTION marcar_notificacion_leida(p_notificacion_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notificaciones 
  SET leida = true, leida_at = NOW()
  WHERE id = p_notificacion_id AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION marcar_todas_notificaciones_leidas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notificaciones 
  SET leida = true, leida_at = NOW()
  WHERE user_id = auth.uid() AND leida = false;
END;
$$;

-- PASO 10: NO CREAR TRIGGERS automáticos por ahora
-- Los triggers pueden estar causando el problema
-- Vamos a probar sin triggers primero

-- PASO 11: Permisos
GRANT ALL ON notificaciones TO authenticated;
GRANT EXECUTE ON FUNCTION marcar_notificacion_leida(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION marcar_todas_notificaciones_leidas() TO authenticated;

-- PASO 12: Rehabilitar triggers de viajes_despacho (los que SÍ necesitamos)
ALTER TABLE viajes_despacho ENABLE TRIGGER ALL;

-- PASO 13: Verificación final
SELECT 
  'VERIFICACIÓN FINAL' as test,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'notificaciones'
ORDER BY ordinal_position;

-- Debe mostrar las columnas SIN empresa_id
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notificaciones' 
      AND column_name = 'empresa_id'
    ) 
    THEN '❌ ERROR: empresa_id todavía existe!'
    ELSE '✅ OK: No existe empresa_id'
  END as resultado;
