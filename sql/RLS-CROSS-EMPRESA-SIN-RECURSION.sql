-- ============================================================================
-- POLÍTICAS RLS CROSS-EMPRESA: Sin recursión usando funciones SECURITY DEFINER
-- ============================================================================
-- Solución: Usar funciones que bypasean RLS para evitar recursión infinita
-- ============================================================================

-- ============================================================================
-- PASO 1: Eliminar políticas que causan recursión
-- ============================================================================

DROP POLICY IF EXISTS choferes_select_cross_empresa ON choferes;
DROP POLICY IF EXISTS choferes_insert_own_empresa ON choferes;
DROP POLICY IF EXISTS choferes_update_own_empresa ON choferes;

DROP POLICY IF EXISTS camiones_select_cross_empresa ON camiones;
DROP POLICY IF EXISTS camiones_insert_own_empresa ON camiones;
DROP POLICY IF EXISTS camiones_update_own_empresa ON camiones;

DROP POLICY IF EXISTS acoplados_select_cross_empresa ON acoplados;
DROP POLICY IF EXISTS acoplados_insert_own_empresa ON acoplados;
DROP POLICY IF EXISTS acoplados_update_own_empresa ON acoplados;

-- ============================================================================
-- PASO 2: Crear funciones SECURITY DEFINER para verificar asignaciones
-- ============================================================================

-- Función: Verificar si un recurso está asignado a viajes del usuario
CREATE OR REPLACE FUNCTION es_recurso_asignado_a_mis_viajes(
  p_recurso_id uuid,
  p_tipo_recurso text -- 'chofer', 'camion', 'acoplado'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar si el recurso está en viajes del usuario
  RETURN EXISTS (
    SELECT 1
    FROM viajes_despacho vd
    JOIN despachos d ON d.id = vd.despacho_id
    WHERE d.created_by = auth.uid()
      AND (
        (p_tipo_recurso = 'chofer' AND vd.chofer_id = p_recurso_id)
        OR (p_tipo_recurso = 'camion' AND vd.camion_id = p_recurso_id)
        OR (p_tipo_recurso = 'acoplado' AND vd.acoplado_id = p_recurso_id)
      )
  )
  OR EXISTS (
    SELECT 1
    FROM viajes_despacho vd
    WHERE vd.id_transporte IN (
      SELECT empresa_id 
      FROM usuarios_empresa 
      WHERE user_id = auth.uid() AND activo = true
    )
    AND (
      (p_tipo_recurso = 'chofer' AND vd.chofer_id = p_recurso_id)
      OR (p_tipo_recurso = 'camion' AND vd.camion_id = p_recurso_id)
      OR (p_tipo_recurso = 'acoplado' AND vd.acoplado_id = p_recurso_id)
    )
  );
END;
$$;

-- ============================================================================
-- PASO 3: Políticas simplificadas usando las funciones
-- ============================================================================

-- CHOFERES: SELECT cross-empresa
CREATE POLICY choferes_select_cross_empresa ON choferes
FOR SELECT
USING (
  -- Mi empresa
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() AND activo = true
  )
  OR
  -- Asignado a mis viajes (usando función que bypasea RLS)
  es_recurso_asignado_a_mis_viajes(id, 'chofer')
);

-- CHOFERES: INSERT solo mi empresa
CREATE POLICY choferes_insert_own_empresa ON choferes
FOR INSERT
WITH CHECK (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() AND activo = true
  )
);

-- CHOFERES: UPDATE solo mi empresa
CREATE POLICY choferes_update_own_empresa ON choferes
FOR UPDATE
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() AND activo = true
  )
);

-- CAMIONES: SELECT cross-empresa
CREATE POLICY camiones_select_cross_empresa ON camiones
FOR SELECT
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() AND activo = true
  )
  OR
  es_recurso_asignado_a_mis_viajes(id, 'camion')
);

-- CAMIONES: INSERT solo mi empresa
CREATE POLICY camiones_insert_own_empresa ON camiones
FOR INSERT
WITH CHECK (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() AND activo = true
  )
);

-- CAMIONES: UPDATE solo mi empresa
CREATE POLICY camiones_update_own_empresa ON camiones
FOR UPDATE
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() AND activo = true
  )
);

-- ACOPLADOS: SELECT cross-empresa
CREATE POLICY acoplados_select_cross_empresa ON acoplados
FOR SELECT
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() AND activo = true
  )
  OR
  es_recurso_asignado_a_mis_viajes(id, 'acoplado')
);

-- ACOPLADOS: INSERT solo mi empresa
CREATE POLICY acoplados_insert_own_empresa ON acoplados
FOR INSERT
WITH CHECK (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() AND activo = true
  )
);

-- ACOPLADOS: UPDATE solo mi empresa
CREATE POLICY acoplados_update_own_empresa ON acoplados
FOR UPDATE
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() AND activo = true
  )
);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

SELECT 
    'Políticas aplicadas:' as info,
    tablename,
    policyname,
    cmd as operacion
FROM pg_policies
WHERE tablename IN ('choferes', 'camiones', 'acoplados')
ORDER BY tablename, cmd, policyname;
