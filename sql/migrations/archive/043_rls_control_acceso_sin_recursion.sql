-- ============================================================================
-- MIGRATION 043 (CORREGIDA): RLS para Control de Acceso sin recursión
-- ============================================================================
-- Fecha: 8 Feb 2026
-- Problema: Recursión infinita en políticas RLS al hacer JOIN con viajes_despacho
-- Solución: Usar funciones SECURITY DEFINER para evitar recursión
-- ============================================================================

-- ============================================================================
-- PARTE 1: FUNCIONES AUXILIARES (SECURITY DEFINER)
-- ============================================================================

-- Función: Obtener IDs de choferes visibles para el usuario
CREATE OR REPLACE FUNCTION get_visible_chofer_ids(user_uuid UUID)
RETURNS TABLE(chofer_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER -- Bypassa RLS
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT c.id
  FROM choferes c
  WHERE 
    -- Opción 1: Chofer de mi empresa
    c.empresa_id IN (
      SELECT empresa_id 
      FROM usuarios_empresa 
      WHERE user_id = user_uuid AND activo = true
    )
    OR
    -- Opción 2: Chofer asignado a viajes donde mi empresa es origen o destino
    c.id IN (
      SELECT DISTINCT vd.chofer_id
      FROM viajes_despacho vd
      JOIN despachos d ON d.id = vd.despacho_id
      WHERE vd.chofer_id IS NOT NULL
        AND (
          d.origen_empresa_id IN (
            SELECT empresa_id 
            FROM usuarios_empresa 
            WHERE user_id = user_uuid AND activo = true
          )
          OR
          d.destino_empresa_id IN (
            SELECT empresa_id 
            FROM usuarios_empresa 
            WHERE user_id = user_uuid AND activo = true
          )
        )
    )
    OR
    -- Opción 3: Chofer de transporte asignado a mis viajes
    c.id IN (
      SELECT vd.chofer_id
      FROM viajes_despacho vd
      WHERE vd.empresa_id IN (
        SELECT empresa_id 
        FROM usuarios_empresa 
        WHERE user_id = user_uuid AND activo = true
      )
      AND vd.chofer_id IS NOT NULL
    );
END;
$$;

-- Función: Obtener IDs de camiones visibles para el usuario
CREATE OR REPLACE FUNCTION get_visible_camion_ids(user_uuid UUID)
RETURNS TABLE(camion_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER -- Bypassa RLS
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT c.id
  FROM camiones c
  WHERE 
    -- Opción 1: Camión de mi empresa
    c.empresa_id IN (
      SELECT empresa_id 
      FROM usuarios_empresa 
      WHERE user_id = user_uuid AND activo = true
    )
    OR
    -- Opción 2: Camión asignado a viajes donde mi empresa es origen o destino
    c.id IN (
      SELECT DISTINCT vd.camion_id
      FROM viajes_despacho vd
      JOIN despachos d ON d.id = vd.despacho_id
      WHERE vd.camion_id IS NOT NULL
        AND (
          d.origen_empresa_id IN (
            SELECT empresa_id 
            FROM usuarios_empresa 
            WHERE user_id = user_uuid AND activo = true
          )
          OR
          d.destino_empresa_id IN (
            SELECT empresa_id 
            FROM usuarios_empresa 
            WHERE user_id = user_uuid AND activo = true
          )
        )
    )
    OR
    -- Opción 3: Camión de transporte asignado a mis viajes
    c.id IN (
      SELECT vd.camion_id
      FROM viajes_despacho vd
      WHERE vd.empresa_id IN (
        SELECT empresa_id 
        FROM usuarios_empresa 
        WHERE user_id = user_uuid AND activo = true
      )
      AND vd.camion_id IS NOT NULL
    );
END;
$$;

-- Función: Obtener IDs de acoplados visibles para el usuario
CREATE OR REPLACE FUNCTION get_visible_acoplado_ids(user_uuid UUID)
RETURNS TABLE(acoplado_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER -- Bypassa RLS
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT a.id
  FROM acoplados a
  WHERE 
    -- Opción 1: Acoplado de mi empresa
    a.empresa_id IN (
      SELECT empresa_id 
      FROM usuarios_empresa 
      WHERE user_id = user_uuid AND activo = true
    )
    OR
    -- Opción 2: Acoplado asignado a viajes donde mi empresa es origen o destino
    a.id IN (
      SELECT DISTINCT vd.acoplado_id
      FROM viajes_despacho vd
      JOIN despachos d ON d.id = vd.despacho_id
      WHERE vd.acoplado_id IS NOT NULL
        AND (
          d.origen_empresa_id IN (
            SELECT empresa_id 
            FROM usuarios_empresa 
            WHERE user_id = user_uuid AND activo = true
          )
          OR
          d.destino_empresa_id IN (
            SELECT empresa_id 
            FROM usuarios_empresa 
            WHERE user_id = user_uuid AND activo = true
          )
        )
    )
    OR
    -- Opción 3: Acoplado de transporte asignado a mis viajes
    a.id IN (
      SELECT vd.acoplado_id
      FROM viajes_despacho vd
      WHERE vd.empresa_id IN (
        SELECT empresa_id 
        FROM usuarios_empresa 
        WHERE user_id = user_uuid AND activo = true
      )
      AND vd.acoplado_id IS NOT NULL
    );
END;
$$;

-- ============================================================================
-- PARTE 2: REEMPLAZAR POLÍTICAS RLS (usando las funciones)
-- ============================================================================

-- CHOFERES
DROP POLICY IF EXISTS choferes_select_cross_empresa ON choferes;

CREATE POLICY choferes_select_cross_empresa ON choferes
FOR SELECT
USING (
  id IN (SELECT chofer_id FROM get_visible_chofer_ids(auth.uid()))
);

-- CAMIONES
DROP POLICY IF EXISTS camiones_select_cross_empresa ON camiones;

CREATE POLICY camiones_select_cross_empresa ON camiones
FOR SELECT
USING (
  id IN (SELECT camion_id FROM get_visible_camion_ids(auth.uid()))
);

-- ACOPLADOS
DROP POLICY IF EXISTS acoplados_select_cross_empresa ON acoplados;

CREATE POLICY acoplados_select_cross_empresa ON acoplados
FOR SELECT
USING (
  id IN (SELECT acoplado_id FROM get_visible_acoplado_ids(auth.uid()))
);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que las funciones se crearon correctamente
SELECT 
    proname as funcion,
    prosecdef as security_definer
FROM pg_proc
WHERE proname LIKE 'get_visible_%_ids'
ORDER BY proname;

-- Verificar las políticas
SELECT 
    tablename,
    policyname,
    cmd as operacion
FROM pg_policies
WHERE tablename IN ('choferes', 'camiones', 'acoplados')
  AND policyname LIKE '%select%'
ORDER BY tablename;

-- ============================================================================
-- RESULTADO ESPERADO:
-- - Las funciones SECURITY DEFINER evitan la recursión
-- - Control de Acceso puede ver choferes/camiones de viajes donde participa
-- ============================================================================
