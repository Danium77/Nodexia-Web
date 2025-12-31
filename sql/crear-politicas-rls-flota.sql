-- ============================================================================
-- CREAR/ACTUALIZAR POLÍTICAS RLS PARA CAMIONES Y ACOPLADOS
-- ============================================================================
-- Fecha: 2024-12-29
-- Propósito: Permitir que coordinadores de transporte gestionen su flota
--
-- CONTEXTO:
-- - Camiones/acoplados pertenecen a empresas de transporte (id_transporte)
-- - Coordinadores deben poder INSERT/UPDATE/DELETE su propia flota
-- - La relación es: usuario → usuarios_empresa → empresa_id = id_transporte
-- ============================================================================

-- IMPORTANTE: Ejecutar primero sql/verificar-politicas-rls-flota.sql
-- para ver las políticas existentes antes de modificar

-- ============================================================================
-- PASO 1: ELIMINAR POLÍTICAS EXISTENTES (si existen)
-- ============================================================================
-- Descomentar estas líneas si ya existen políticas y querés reemplazarlas:

-- DROP POLICY IF EXISTS "coordinador_insert_camiones" ON camiones;
-- DROP POLICY IF EXISTS "coordinador_select_camiones" ON camiones;
-- DROP POLICY IF EXISTS "coordinador_update_camiones" ON camiones;
-- DROP POLICY IF EXISTS "coordinador_delete_camiones" ON camiones;

-- DROP POLICY IF EXISTS "coordinador_insert_acoplados" ON acoplados;
-- DROP POLICY IF EXISTS "coordinador_select_acoplados" ON acoplados;
-- DROP POLICY IF EXISTS "coordinador_update_acoplados" ON acoplados;
-- DROP POLICY IF EXISTS "coordinador_delete_acoplados" ON acoplados;

-- ============================================================================
-- PASO 2: POLÍTICAS PARA TABLA CAMIONES
-- ============================================================================

-- Permitir INSERT: Coordinador puede crear camiones para su empresa
CREATE POLICY "coordinador_insert_camiones"
ON camiones
FOR INSERT
TO authenticated
WITH CHECK (
    id_transporte IN (
        SELECT empresa_id 
        FROM usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
    )
);

-- Permitir SELECT: Coordinador puede ver camiones de su empresa
CREATE POLICY "coordinador_select_camiones"
ON camiones
FOR SELECT
TO authenticated
USING (
    id_transporte IN (
        SELECT empresa_id 
        FROM usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
    )
);

-- Permitir UPDATE: Coordinador puede editar camiones de su empresa
CREATE POLICY "coordinador_update_camiones"
ON camiones
FOR UPDATE
TO authenticated
USING (
    id_transporte IN (
        SELECT empresa_id 
        FROM usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
    )
)
WITH CHECK (
    id_transporte IN (
        SELECT empresa_id 
        FROM usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
    )
);

-- Permitir DELETE: Coordinador puede eliminar camiones de su empresa
CREATE POLICY "coordinador_delete_camiones"
ON camiones
FOR DELETE
TO authenticated
USING (
    id_transporte IN (
        SELECT empresa_id 
        FROM usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
    )
);

-- ============================================================================
-- PASO 3: POLÍTICAS PARA TABLA ACOPLADOS
-- ============================================================================

-- Permitir INSERT: Coordinador puede crear acoplados para su empresa
CREATE POLICY "coordinador_insert_acoplados"
ON acoplados
FOR INSERT
TO authenticated
WITH CHECK (
    id_transporte IN (
        SELECT empresa_id 
        FROM usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
    )
);

-- Permitir SELECT: Coordinador puede ver acoplados de su empresa
CREATE POLICY "coordinador_select_acoplados"
ON acoplados
FOR SELECT
TO authenticated
USING (
    id_transporte IN (
        SELECT empresa_id 
        FROM usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
    )
);

-- Permitir UPDATE: Coordinador puede editar acoplados de su empresa
CREATE POLICY "coordinador_update_acoplados"
ON acoplados
FOR UPDATE
TO authenticated
USING (
    id_transporte IN (
        SELECT empresa_id 
        FROM usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
    )
)
WITH CHECK (
    id_transporte IN (
        SELECT empresa_id 
        FROM usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
    )
);

-- Permitir DELETE: Coordinador puede eliminar acoplados de su empresa
CREATE POLICY "coordinador_delete_acoplados"
ON acoplados
FOR DELETE
TO authenticated
USING (
    id_transporte IN (
        SELECT empresa_id 
        FROM usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
    )
);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Ejecutar nuevamente sql/verificar-politicas-rls-flota.sql para confirmar
