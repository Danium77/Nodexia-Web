-- ============================================================
-- BLOQUE 2: Funciones de limpieza
-- Copiar TODO y pegar en Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Borrar versiones anteriores (tienen otro tipo de retorno)
DROP FUNCTION IF EXISTS limpiar_tracking_antiguo();
DROP FUNCTION IF EXISTS limpiar_ubicaciones_antiguas();
DROP FUNCTION IF EXISTS limpiar_notificaciones_antiguas();

CREATE OR REPLACE FUNCTION limpiar_tracking_antiguo()
RETURNS INTEGER AS $$
DECLARE registros_eliminados INTEGER;
BEGIN
  DELETE FROM tracking_gps WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS registros_eliminados = ROW_COUNT;
  RAISE NOTICE 'tracking_gps: % registros eliminados (> 90 dias)', registros_eliminados;
  RETURN registros_eliminados;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION limpiar_ubicaciones_antiguas()
RETURNS INTEGER AS $$
DECLARE registros_eliminados INTEGER;
BEGIN
  DELETE FROM ubicaciones_choferes WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS registros_eliminados = ROW_COUNT;
  RAISE NOTICE 'ubicaciones_choferes: % registros eliminados (> 90 dias)', registros_eliminados;
  RETURN registros_eliminados;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION limpiar_notificaciones_antiguas()
RETURNS INTEGER AS $$
DECLARE registros_eliminados INTEGER;
BEGIN
  DELETE FROM notificaciones WHERE leida = true AND created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS registros_eliminados = ROW_COUNT;
  RAISE NOTICE 'notificaciones: % registros leidos eliminados (> 30 dias)', registros_eliminados;
  RETURN registros_eliminados;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
