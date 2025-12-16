-- ================================================
-- FIX DEFINITIVO: Recrear tabla con CASCADE total
-- Fecha: 11 de Noviembre 2025
-- Descripción: Usar CASCADE para forzar eliminación de TODO
-- ================================================

-- PASO 1: Eliminar tabla con CASCADE (elimina TODAS las dependencias)
DROP TABLE IF EXISTS notificaciones CASCADE;

-- PASO 2: Verificar eliminación
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notificaciones') THEN
        RAISE EXCEPTION 'ERROR: La tabla notificaciones NO se eliminó';
    ELSE
        RAISE NOTICE '✅ Tabla notificaciones eliminada correctamente';
    END IF;
END $$;

-- PASO 3: Crear tabla NUEVA (estructura simple sin empresa_id)
CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
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

-- PASO 4: Índices
CREATE INDEX idx_notificaciones_user_id ON notificaciones(user_id);
CREATE INDEX idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX idx_notificaciones_created_at ON notificaciones(created_at DESC);

-- PASO 5: RLS
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

-- PASO 6: Funciones RPC
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

-- PASO 7: Permisos
GRANT ALL ON notificaciones TO authenticated;
GRANT EXECUTE ON FUNCTION marcar_notificacion_leida(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION marcar_todas_notificaciones_leidas() TO authenticated;

-- PASO 8: Verificación final - Mostrar todas las columnas
SELECT 
  column_name, 
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'notificaciones'
ORDER BY ordinal_position;

-- PASO 9: Verificar que NO existe empresa_id
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notificaciones' 
      AND column_name = 'empresa_id'
    ) 
    THEN '❌ ERROR: empresa_id todavía existe!'
    ELSE '✅ ÉXITO: No existe empresa_id - Tabla correcta'
  END as resultado_final;
