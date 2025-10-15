-- =============================================
-- Funciones RPC para Red Empresarial
-- =============================================

-- Función para obtener transportistas disponibles
CREATE OR REPLACE FUNCTION get_available_transportistas()
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  cuit TEXT,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  activo BOOLEAN,
  tiene_relacion BOOLEAN
) AS $$
DECLARE
  current_empresa_id UUID;
BEGIN
  -- Obtener la empresa del usuario actual
  SELECT ue.empresa_id INTO current_empresa_id
  FROM usuarios_empresa ue
  WHERE ue.user_id = auth.uid() AND ue.activo = true
  LIMIT 1;
  
  -- Si no se encuentra empresa, devolver vacío
  IF current_empresa_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Devolver transportistas y si tienen relación con la empresa actual
  RETURN QUERY
  SELECT 
    e.id,
    e.nombre,
    e.cuit,
    e.email,
    e.telefono,
    e.direccion,
    e.activo,
    CASE 
      WHEN re.id IS NOT NULL THEN true 
      ELSE false 
    END as tiene_relacion
  FROM empresas e
  LEFT JOIN relaciones_empresa re ON (
    re.empresa_transporte_id = e.id 
    AND re.empresa_coordinadora_id = current_empresa_id
    AND re.activo = true
  )
  WHERE e.tipo_empresa = 'transporte' 
    AND e.activo = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener permisos del usuario
CREATE OR REPLACE FUNCTION get_user_permisos()
RETURNS JSONB AS $$
DECLARE
  user_empresa_tipo TEXT;
  user_rol TEXT;
  permisos JSONB;
BEGIN
  -- Obtener tipo de empresa y rol del usuario
  SELECT 
    e.tipo_empresa,
    ue.rol_interno
  INTO user_empresa_tipo, user_rol
  FROM usuarios_empresa ue
  JOIN empresas e ON ue.empresa_id = e.id
  WHERE ue.user_id = auth.uid() AND ue.activo = true
  LIMIT 1;
  
  -- Si no se encuentra, devolver permisos básicos
  IF user_empresa_tipo IS NULL THEN
    RETURN '{"ver_dashboard": true}'::JSONB;
  END IF;
  
  -- Generar permisos según tipo de empresa y rol
  permisos := '{
    "ver_dashboard": true,
    "crear_despachos": true,
    "gestionar_despachos": true
  }'::JSONB;
  
  -- Permisos específicos para coordinadores
  IF user_empresa_tipo = 'coordinador' THEN
    permisos := permisos || '{
      "gestionar_relaciones": true,
      "gestionar_transportistas": true,
      "ver_reportes": true
    }'::JSONB;
    
    -- Permisos adicionales para administradores
    IF user_rol ILIKE '%admin%' OR user_rol ILIKE '%coordinador%' THEN
      permisos := permisos || '{
        "gestionar_usuarios": true,
        "configurar_empresa": true
      }'::JSONB;
    END IF;
  END IF;
  
  -- Permisos específicos para transportes
  IF user_empresa_tipo = 'transporte' THEN
    permisos := permisos || '{
      "gestionar_flota": true,
      "gestionar_choferes": true,
      "ver_mis_despachos": true
    }'::JSONB;
    
    -- Permisos adicionales para administradores de transporte
    IF user_rol ILIKE '%admin%' THEN
      permisos := permisos || '{
        "gestionar_usuarios": true,
        "configurar_empresa": true
      }'::JSONB;
    END IF;
  END IF;
  
  RETURN permisos;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de red
CREATE OR REPLACE FUNCTION get_network_stats()
RETURNS TABLE (
  total_empresas INTEGER,
  empresas_coordinadoras INTEGER,
  empresas_transporte INTEGER,
  relaciones_activas INTEGER,
  usuarios_activos INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM empresas WHERE activo = true),
    (SELECT COUNT(*)::INTEGER FROM empresas WHERE tipo_empresa = 'coordinador' AND activo = true),
    (SELECT COUNT(*)::INTEGER FROM empresas WHERE tipo_empresa = 'transporte' AND activo = true),
    (SELECT COUNT(*)::INTEGER FROM relaciones_empresa WHERE activo = true),
    (SELECT COUNT(*)::INTEGER FROM usuarios_empresa WHERE activo = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;