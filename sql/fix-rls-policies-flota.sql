-- Deshabilitar y recrear políticas RLS para tablas de flota
-- Esto soluciona el error "column ch.user_id does not exist"

-- ============================================
-- CHOFERES
-- ============================================

-- Eliminar políticas existentes que puedan estar causando problemas
DROP POLICY IF EXISTS "choferes_select_policy" ON choferes;
DROP POLICY IF EXISTS "choferes_insert_policy" ON choferes;
DROP POLICY IF EXISTS "choferes_update_policy" ON choferes;
DROP POLICY IF EXISTS "choferes_delete_policy" ON choferes;

-- Crear política simple de SELECT (sin referencias a user_id)
CREATE POLICY "choferes_select_policy" ON choferes
FOR SELECT
USING (
  -- Permitir ver choferes de la misma empresa de transporte
  id_transporte = auth.uid()
  OR
  -- O si el usuario está relacionado con esa empresa de transporte
  id_transporte IN (
    SELECT empresa_id 
    FROM usuarios_empresas 
    WHERE user_id = auth.uid()
  )
);

-- Política de INSERT
CREATE POLICY "choferes_insert_policy" ON choferes
FOR INSERT
WITH CHECK (
  id_transporte = auth.uid()
  OR
  id_transporte IN (
    SELECT empresa_id 
    FROM usuarios_empresas 
    WHERE user_id = auth.uid()
  )
);

-- Política de UPDATE
CREATE POLICY "choferes_update_policy" ON choferes
FOR UPDATE
USING (
  id_transporte = auth.uid()
  OR
  id_transporte IN (
    SELECT empresa_id 
    FROM usuarios_empresas 
    WHERE user_id = auth.uid()
  )
);

-- ============================================
-- CAMIONES
-- ============================================

DROP POLICY IF EXISTS "camiones_select_policy" ON camiones;
DROP POLICY IF EXISTS "camiones_insert_policy" ON camiones;
DROP POLICY IF EXISTS "camiones_update_policy" ON camiones;

CREATE POLICY "camiones_select_policy" ON camiones
FOR SELECT
USING (
  id_transporte = auth.uid()
  OR
  id_transporte IN (
    SELECT empresa_id 
    FROM usuarios_empresas 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "camiones_insert_policy" ON camiones
FOR INSERT
WITH CHECK (
  id_transporte = auth.uid()
  OR
  id_transporte IN (
    SELECT empresa_id 
    FROM usuarios_empresas 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "camiones_update_policy" ON camiones
FOR UPDATE
USING (
  id_transporte = auth.uid()
  OR
  id_transporte IN (
    SELECT empresa_id 
    FROM usuarios_empresas 
    WHERE user_id = auth.uid()
  )
);

-- ============================================
-- ACOPLADOS
-- ============================================

DROP POLICY IF EXISTS "acoplados_select_policy" ON acoplados;
DROP POLICY IF EXISTS "acoplados_insert_policy" ON acoplados;
DROP POLICY IF EXISTS "acoplados_update_policy" ON acoplados;

CREATE POLICY "acoplados_select_policy" ON acoplados
FOR SELECT
USING (
  id_transporte = auth.uid()
  OR
  id_transporte IN (
    SELECT empresa_id 
    FROM usuarios_empresas 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "acoplados_insert_policy" ON acoplados
FOR INSERT
WITH CHECK (
  id_transporte = auth.uid()
  OR
  id_transporte IN (
    SELECT empresa_id 
    FROM usuarios_empresas 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "acoplados_update_policy" ON acoplados
FOR UPDATE
USING (
  id_transporte = auth.uid()
  OR
  id_transporte IN (
    SELECT empresa_id 
    FROM usuarios_empresas 
    WHERE user_id = auth.uid()
  )
);

-- ============================================
-- ALTERNATIVA: Deshabilitar RLS temporalmente
-- (Solo para desarrollo/testing)
-- ============================================

-- DESCOMENTAR ESTAS LÍNEAS SOLO SI LAS POLÍTICAS ARRIBA NO FUNCIONAN:
-- ALTER TABLE choferes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE camiones DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE acoplados DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Verificar políticas activas
-- ============================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('choferes', 'camiones', 'acoplados')
ORDER BY tablename, policyname;
