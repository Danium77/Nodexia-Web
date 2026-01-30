-- ============================================================================
-- POLÍTICAS RLS CROSS-EMPRESA: Lectura cuando hay relación de negocio
-- ============================================================================
-- Filosofía: 
-- - Puedes ver/editar TUS recursos (full control)
-- - Puedes VER (solo lectura) recursos de otras empresas asignados a TUS viajes
-- ============================================================================

-- ============================================================================
-- PARTE 1: CHOFERES - Lectura cross-empresa
-- ============================================================================

-- Eliminar políticas restrictivas actuales
DROP POLICY IF EXISTS usuarios_ven_choferes_de_su_empresa ON choferes;
DROP POLICY IF EXISTS usuarios_insertan_choferes_de_su_empresa ON choferes;
DROP POLICY IF EXISTS usuarios_actualizan_choferes_de_su_empresa ON choferes;

-- Política SELECT: Ver choferes de mi empresa O asignados a mis viajes
CREATE POLICY choferes_select_cross_empresa ON choferes
FOR SELECT
USING (
  -- Opción 1: Chofer pertenece a mi empresa
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() AND activo = true
  )
  OR
  -- Opción 2: Chofer está asignado a un viaje de un despacho que yo creé
  id IN (
    SELECT vd.chofer_id
    FROM viajes_despacho vd
    JOIN despachos d ON d.id = vd.despacho_id
    WHERE d.created_by = auth.uid()
      AND vd.chofer_id IS NOT NULL
  )
  OR
  -- Opción 3: Chofer está asignado a un viaje donde mi empresa es el transporte
  id IN (
    SELECT vd.chofer_id
    FROM viajes_despacho vd
    WHERE vd.id_transporte IN (
      SELECT empresa_id 
      FROM usuarios_empresa 
      WHERE user_id = auth.uid() AND activo = true
    )
    AND vd.chofer_id IS NOT NULL
  )
);

-- Política INSERT: Solo puedes crear choferes en tu empresa
CREATE POLICY choferes_insert_own_empresa ON choferes
FOR INSERT
WITH CHECK (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() AND activo = true
  )
);

-- Política UPDATE: Solo puedes modificar choferes de tu empresa
CREATE POLICY choferes_update_own_empresa ON choferes
FOR UPDATE
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() AND activo = true
  )
);

-- ============================================================================
-- PARTE 2: CAMIONES - Lectura cross-empresa
-- ============================================================================

-- Eliminar políticas restrictivas actuales
DROP POLICY IF EXISTS usuarios_ven_camiones_de_su_empresa ON camiones;
DROP POLICY IF EXISTS usuarios_insertan_camiones_de_su_empresa ON camiones;
DROP POLICY IF EXISTS usuarios_actualizan_camiones_de_su_empresa ON camiones;

-- Política SELECT: Ver camiones de mi empresa O asignados a mis viajes
CREATE POLICY camiones_select_cross_empresa ON camiones
FOR SELECT
USING (
  -- Opción 1: Camión pertenece a mi empresa
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() AND activo = true
  )
  OR
  -- Opción 2: Camión está asignado a un viaje de un despacho que yo creé
  id IN (
    SELECT vd.camion_id
    FROM viajes_despacho vd
    JOIN despachos d ON d.id = vd.despacho_id
    WHERE d.created_by = auth.uid()
      AND vd.camion_id IS NOT NULL
  )
  OR
  -- Opción 3: Camión está asignado a un viaje donde mi empresa es el transporte
  id IN (
    SELECT vd.camion_id
    FROM viajes_despacho vd
    WHERE vd.id_transporte IN (
      SELECT empresa_id 
      FROM usuarios_empresa 
      WHERE user_id = auth.uid() AND activo = true
    )
    AND vd.camion_id IS NOT NULL
  )
);

-- Política INSERT: Solo puedes crear camiones en tu empresa
CREATE POLICY camiones_insert_own_empresa ON camiones
FOR INSERT
WITH CHECK (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() AND activo = true
  )
);

-- Política UPDATE: Solo puedes modificar camiones de tu empresa
CREATE POLICY camiones_update_own_empresa ON camiones
FOR UPDATE
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() AND activo = true
  )
);

-- ============================================================================
-- PARTE 3: ACOPLADOS - Lectura cross-empresa (mismo patrón)
-- ============================================================================

-- Eliminar políticas restrictivas actuales
DROP POLICY IF EXISTS usuarios_ven_acoplados_de_su_empresa ON acoplados;
DROP POLICY IF EXISTS usuarios_insertan_acoplados_de_su_empresa ON acoplados;
DROP POLICY IF EXISTS usuarios_actualizan_acoplados_de_su_empresa ON acoplados;

-- Política SELECT: Ver acoplados de mi empresa O asignados a mis viajes
CREATE POLICY acoplados_select_cross_empresa ON acoplados
FOR SELECT
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() AND activo = true
  )
  OR
  id IN (
    SELECT vd.acoplado_id
    FROM viajes_despacho vd
    JOIN despachos d ON d.id = vd.despacho_id
    WHERE d.created_by = auth.uid()
      AND vd.acoplado_id IS NOT NULL
  )
  OR
  id IN (
    SELECT vd.acoplado_id
    FROM viajes_despacho vd
    WHERE vd.id_transporte IN (
      SELECT empresa_id 
      FROM usuarios_empresa 
      WHERE user_id = auth.uid() AND activo = true
    )
    AND vd.acoplado_id IS NOT NULL
  )
);

-- Política INSERT: Solo puedes crear acoplados en tu empresa
CREATE POLICY acoplados_insert_own_empresa ON acoplados
FOR INSERT
WITH CHECK (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() AND activo = true
  )
);

-- Política UPDATE: Solo puedes modificar acoplados de tu empresa
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

-- Ver políticas aplicadas
SELECT 
    tablename,
    policyname,
    cmd as operacion
FROM pg_policies
WHERE tablename IN ('choferes', 'camiones', 'acoplados')
ORDER BY tablename, cmd, policyname;
