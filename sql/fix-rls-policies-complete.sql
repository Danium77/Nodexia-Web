-- ============================================================================
-- SCRIPT COMPLETO: Eliminar políticas antiguas y crear nuevas
-- Fecha: 2025-11-02
-- Objetivo: Resolver error "column ch.user_id does not exist"
-- ============================================================================

-- PASO 1: ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
-- ============================================================================

-- Eliminar políticas de CHOFERES
DROP POLICY IF EXISTS "choferes_select_policy" ON choferes;
DROP POLICY IF EXISTS "choferes_insert_policy" ON choferes;
DROP POLICY IF EXISTS "choferes_update_policy" ON choferes;
DROP POLICY IF EXISTS "choferes_delete_policy" ON choferes;
DROP POLICY IF EXISTS "Choferes: insertar si es dueño" ON choferes;
DROP POLICY IF EXISTS "Choferes: actualiza si es dueño" ON choferes;
DROP POLICY IF EXISTS "Choferes: ajustando si es dueño" ON choferes;
DROP POLICY IF EXISTS "política de actualización de choferes" ON choferes;
DROP POLICY IF EXISTS "Opciones: acceso por transporte" ON choferes;

-- Eliminar políticas de CAMIONES
DROP POLICY IF EXISTS "camiones_select_policy" ON camiones;
DROP POLICY IF EXISTS "camiones_insert_policy" ON camiones;
DROP POLICY IF EXISTS "camiones_update_policy" ON camiones;
DROP POLICY IF EXISTS "camiones_delete_policy" ON camiones;
DROP POLICY IF EXISTS "Permitir insertar a usuarios autenticados" ON camiones;
DROP POLICY IF EXISTS "camiones_insertar_política" ON camiones;
DROP POLICY IF EXISTS "política de actualización de camiones" ON camiones;

-- Eliminar políticas de ACOPLADOS
DROP POLICY IF EXISTS "acoplados_select_policy" ON acoplados;
DROP POLICY IF EXISTS "acoplados_insert_policy" ON acoplados;
DROP POLICY IF EXISTS "acoplados_update_policy" ON acoplados;
DROP POLICY IF EXISTS "acoplados_delete_policy" ON acoplados;

-- PASO 2: CREAR POLÍTICAS NUEVAS Y CORRECTAS
-- ============================================================================

-- CHOFERES: SELECT (lectura)
CREATE POLICY "choferes_select_policy" ON choferes
FOR SELECT
USING (id_transporte = auth.uid());

-- CHOFERES: INSERT (creación)
CREATE POLICY "choferes_insert_policy" ON choferes
FOR INSERT
WITH CHECK (id_transporte = auth.uid());

-- CHOFERES: UPDATE (actualización)
CREATE POLICY "choferes_update_policy" ON choferes
FOR UPDATE
USING (id_transporte = auth.uid())
WITH CHECK (id_transporte = auth.uid());

-- CHOFERES: DELETE (eliminación)
CREATE POLICY "choferes_delete_policy" ON choferes
FOR DELETE
USING (id_transporte = auth.uid());

-- CAMIONES: SELECT (lectura)
CREATE POLICY "camiones_select_policy" ON camiones
FOR SELECT
USING (id_transporte = auth.uid());

-- CAMIONES: INSERT (creación)
CREATE POLICY "camiones_insert_policy" ON camiones
FOR INSERT
WITH CHECK (id_transporte = auth.uid());

-- CAMIONES: UPDATE (actualización)
CREATE POLICY "camiones_update_policy" ON camiones
FOR UPDATE
USING (id_transporte = auth.uid())
WITH CHECK (id_transporte = auth.uid());

-- CAMIONES: DELETE (eliminación)
CREATE POLICY "camiones_delete_policy" ON camiones
FOR DELETE
USING (id_transporte = auth.uid());

-- ACOPLADOS: SELECT (lectura)
CREATE POLICY "acoplados_select_policy" ON acoplados
FOR SELECT
USING (id_transporte = auth.uid());

-- ACOPLADOS: INSERT (creación)
CREATE POLICY "acoplados_insert_policy" ON acoplados
FOR INSERT
WITH CHECK (id_transporte = auth.uid());

-- ACOPLADOS: UPDATE (actualización)
CREATE POLICY "acoplados_update_policy" ON acoplados
FOR UPDATE
USING (id_transporte = auth.uid())
WITH CHECK (id_transporte = auth.uid());

-- ACOPLADOS: DELETE (eliminación)
CREATE POLICY "acoplados_delete_policy" ON acoplados
FOR DELETE
USING (id_transporte = auth.uid());

-- PASO 3: VERIFICAR POLÍTICAS CREADAS
-- ============================================================================
SELECT 
    schemaname AS esquema,
    tablename AS tabla,
    policyname AS nombre_politica,
    cmd AS operacion,
    qual AS condicion_using,
    with_check AS condicion_with_check
FROM pg_policies
WHERE tablename IN ('choferes', 'camiones', 'acoplados')
ORDER BY tablename, policyname;
