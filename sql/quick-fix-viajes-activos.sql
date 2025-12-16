-- =====================================================
-- INSTALACIÓN RÁPIDA - Funciones necesarias para Viajes Activos
-- Ejecutar este script en Supabase SQL Editor
-- =====================================================

-- 1. Función get_viaje_estados_historial (si no existe)
CREATE OR REPLACE FUNCTION get_viaje_estados_historial(viaje_id_param BIGINT)
RETURNS TABLE(
  id BIGINT,
  tipo_estado TEXT,
  estado_anterior TEXT,
  estado_nuevo TEXT,
  fecha_cambio TIMESTAMP WITH TIME ZONE,
  usuario_email TEXT,
  usuario_nombre TEXT,
  notas TEXT,
  metadata JSONB
) AS $$
BEGIN
  -- Verificar si existe la tabla de auditoría
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'viajes_estados_audit'
  ) THEN
    -- Si no existe la tabla, retornar vacío
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    vea.id,
    vea.tipo_estado,
    vea.estado_anterior,
    vea.estado_nuevo,
    vea.fecha_cambio,
    au.email as usuario_email,
    u.nombre_completo as usuario_nombre,
    vea.notas,
    vea.metadata
  FROM public.viajes_estados_audit vea
  LEFT JOIN auth.users au ON vea.usuario_id = au.id
  LEFT JOIN public.usuarios u ON vea.usuario_id = u.id
  WHERE vea.viaje_id = viaje_id_param
  ORDER BY vea.fecha_cambio DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Otorgar permisos
GRANT EXECUTE ON FUNCTION get_viaje_estados_historial(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_viaje_estados_historial(BIGINT) TO service_role;

-- 3. Comentario
COMMENT ON FUNCTION get_viaje_estados_historial(BIGINT) IS 
'Obtiene el historial completo de estados de un viaje. Requiere tabla viajes_estados_audit.';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Para verificar que se instaló correctamente:
-- SELECT * FROM get_viaje_estados_historial(1);
-- 
-- Si quieres instalar el sistema completo de auditoría:
-- Ejecutar: sql/triggers/auditoria_estados.sql
-- =====================================================
