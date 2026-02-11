-- ============================================================================
-- MIGRATION 043: RLS para Control de Acceso
-- ============================================================================
-- Fecha: 8 Feb 2026
-- Problema: Control de Acceso no puede ver choferes/camiones de otras empresas
-- Solución: Agregar opción en políticas RLS para ver recursos asignados a viajes
--           donde la empresa del usuario está involucrada (origen o destino)
-- ============================================================================

-- ============================================================================
-- PARTE 1: ACTUALIZAR POLÍTICA CHOFERES
-- ============================================================================

DROP POLICY IF EXISTS choferes_select_cross_empresa ON choferes;

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
    WHERE vd.empresa_id IN (
      SELECT empresa_id 
      FROM usuarios_empresa 
      WHERE user_id = auth.uid() AND activo = true
    )
    AND vd.chofer_id IS NOT NULL
  )
  OR
  -- 🆕 Opción 4: Chofer está asignado a viajes de despachos donde mi empresa es origen o destino
  id IN (
    SELECT DISTINCT vd.chofer_id
    FROM viajes_despacho vd
    JOIN despachos d ON d.id = vd.despacho_id
    WHERE vd.chofer_id IS NOT NULL
      AND (
        -- Mi empresa está en origen
        d.origen_empresa_id IN (
          SELECT empresa_id 
          FROM usuarios_empresa 
          WHERE user_id = auth.uid() AND activo = true
        )
        OR
        -- Mi empresa está en destino
        d.destino_empresa_id IN (
          SELECT empresa_id 
          FROM usuarios_empresa 
          WHERE user_id = auth.uid() AND activo = true
        )
      )
  )
);

-- ============================================================================
-- PARTE 2: ACTUALIZAR POLÍTICA CAMIONES
-- ============================================================================

DROP POLICY IF EXISTS camiones_select_cross_empresa ON camiones;

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
    WHERE vd.empresa_id IN (
      SELECT empresa_id 
      FROM usuarios_empresa 
      WHERE user_id = auth.uid() AND activo = true
    )
    AND vd.camion_id IS NOT NULL
  )
  OR
  -- 🆕 Opción 4: Camión está asignado a viajes de despachos donde mi empresa es origen o destino
  id IN (
    SELECT DISTINCT vd.camion_id
    FROM viajes_despacho vd
    JOIN despachos d ON d.id = vd.despacho_id
    WHERE vd.camion_id IS NOT NULL
      AND (
        -- Mi empresa está en origen
        d.origen_empresa_id IN (
          SELECT empresa_id 
          FROM usuarios_empresa 
          WHERE user_id = auth.uid() AND activo = true
        )
        OR
        -- Mi empresa está en destino
        d.destino_empresa_id IN (
          SELECT empresa_id 
          FROM usuarios_empresa 
          WHERE user_id = auth.uid() AND activo = true
        )
      )
  )
);

-- ============================================================================
-- PARTE 3: ACTUALIZAR POLÍTICA ACOPLADOS
-- ============================================================================

DROP POLICY IF EXISTS acoplados_select_cross_empresa ON acoplados;

CREATE POLICY acoplados_select_cross_empresa ON acoplados
FOR SELECT
USING (
  -- Opción 1: Acoplado pertenece a mi empresa
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() AND activo = true
  )
  OR
  -- Opción 2: Acoplado está asignado a un viaje de un despacho que yo creé
  id IN (
    SELECT vd.acoplado_id
    FROM viajes_despacho vd
    JOIN despachos d ON d.id = vd.despacho_id
    WHERE d.created_by = auth.uid()
      AND vd.acoplado_id IS NOT NULL
  )
  OR
  -- Opción 3: Acoplado está asignado a un viaje donde mi empresa es el transporte
  id IN (
    SELECT vd.acoplado_id
    FROM viajes_despacho vd
    WHERE vd.empresa_id IN (
      SELECT empresa_id 
      FROM usuarios_empresa 
      WHERE user_id = auth.uid() AND activo = true
    )
    AND vd.acoplado_id IS NOT NULL
  )
  OR
  -- 🆕 Opción 4: Acoplado está asignado a viajes de despachos donde mi empresa es origen o destino
  id IN (
    SELECT DISTINCT vd.acoplado_id
    FROM viajes_despacho vd
    JOIN despachos d ON d.id = vd.despacho_id
    WHERE vd.acoplado_id IS NOT NULL
      AND (
        -- Mi empresa está en origen
        d.origen_empresa_id IN (
          SELECT empresa_id 
          FROM usuarios_empresa 
          WHERE user_id = auth.uid() AND activo = true
        )
        OR
        -- Mi empresa está en destino
        d.destino_empresa_id IN (
          SELECT empresa_id 
          FROM usuarios_empresa 
          WHERE user_id = auth.uid() AND activo = true
        )
      )
  )
);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Ver políticas actualizadas
SELECT 
    tablename,
    policyname,
    cmd as operacion,
    qual as condicion
FROM pg_policies
WHERE tablename IN ('choferes', 'camiones', 'acoplados')
  AND policyname LIKE '%select%'
ORDER BY tablename;

-- ============================================================================
-- RESULTADO ESPERADO:
-- - Control de Acceso de Aceitera podrá ver choferes/camiones de Logística Express
--   asignados a viajes de despachos donde Aceitera es origen o destino
-- ============================================================================
