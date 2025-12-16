-- Deshabilitar y recrear políticas RLS para tablas de flota
-- VERSIÓN SIMPLIFICADA - Sin depender de usuarios_empresas

-- ============================================
-- CHOFERES
-- ============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "choferes_select_policy" ON choferes;
DROP POLICY IF EXISTS "choferes_insert_policy" ON choferes;
DROP POLICY IF EXISTS "choferes_update_policy" ON choferes;
DROP POLICY IF EXISTS "choferes_delete_policy" ON choferes;

-- Política simple: permitir acceso si id_transporte = usuario actual
CREATE POLICY "choferes_select_policy" ON choferes
FOR SELECT
USING (id_transporte = auth.uid());

CREATE POLICY "choferes_insert_policy" ON choferes
FOR INSERT
WITH CHECK (id_transporte = auth.uid());

CREATE POLICY "choferes_update_policy" ON choferes
FOR UPDATE
USING (id_transporte = auth.uid());

-- ============================================
-- CAMIONES
-- ============================================

DROP POLICY IF EXISTS "camiones_select_policy" ON camiones;
DROP POLICY IF EXISTS "camiones_insert_policy" ON camiones;
DROP POLICY IF EXISTS "camiones_update_policy" ON camiones;

CREATE POLICY "camiones_select_policy" ON camiones
FOR SELECT
USING (id_transporte = auth.uid());

CREATE POLICY "camiones_insert_policy" ON camiones
FOR INSERT
WITH CHECK (id_transporte = auth.uid());

CREATE POLICY "camiones_update_policy" ON camiones
FOR UPDATE
USING (id_transporte = auth.uid());

-- ============================================
-- ACOPLADOS
-- ============================================

DROP POLICY IF EXISTS "acoplados_select_policy" ON acoplados;
DROP POLICY IF EXISTS "acoplados_insert_policy" ON acoplados;
DROP POLICY IF EXISTS "acoplados_update_policy" ON acoplados;

CREATE POLICY "acoplados_select_policy" ON acoplados
FOR SELECT
USING (id_transporte = auth.uid());

CREATE POLICY "acoplados_insert_policy" ON acoplados
FOR INSERT
WITH CHECK (id_transporte = auth.uid());

CREATE POLICY "acoplados_update_policy" ON acoplados
FOR UPDATE
USING (id_transporte = auth.uid());

-- ============================================
-- Verificar que RLS está habilitado
-- ============================================

-- Asegurar que RLS está activo en las tablas
ALTER TABLE choferes ENABLE ROW LEVEL SECURITY;
ALTER TABLE camiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE acoplados ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Verificar políticas creadas
-- ============================================

SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('choferes', 'camiones', 'acoplados')
ORDER BY tablename, policyname;
