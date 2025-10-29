-- =====================================================
-- FIX: Políticas RLS para tabla ubicaciones
-- Permite a usuarios autenticados leer ubicaciones activas
-- =====================================================

-- 1. Habilitar RLS en la tabla ubicaciones (si no está habilitado)
ALTER TABLE ubicaciones ENABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR políticas existentes que puedan estar causando problemas
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer ubicaciones activas" ON ubicaciones;
DROP POLICY IF EXISTS "Super admins tienen acceso completo a ubicaciones" ON ubicaciones;
DROP POLICY IF EXISTS "Coordinadores pueden leer ubicaciones" ON ubicaciones;

-- 3. POLÍTICA SIMPLE: Todos los usuarios autenticados pueden leer ubicaciones activas
CREATE POLICY "Usuarios autenticados pueden ver ubicaciones activas"
ON ubicaciones
FOR SELECT
TO authenticated
USING (activo = true);

-- 4. POLÍTICA: Super admins pueden hacer TODO en ubicaciones
CREATE POLICY "Super admins control total ubicaciones"
ON ubicaciones
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.user_id = auth.uid()
    AND super_admins.activo = true
  )
);

-- 5. Verificar que empresa_ubicaciones también tenga políticas correctas
ALTER TABLE empresa_ubicaciones ENABLE ROW LEVEL SECURITY;

-- 6. ELIMINAR políticas existentes en empresa_ubicaciones
DROP POLICY IF EXISTS "Usuarios pueden ver vínculos de su empresa" ON empresa_ubicaciones;
DROP POLICY IF EXISTS "Usuarios pueden crear vínculos para su empresa" ON empresa_ubicaciones;
DROP POLICY IF EXISTS "Usuarios pueden actualizar vínculos de su empresa" ON empresa_ubicaciones;
DROP POLICY IF EXISTS "Super admins control total empresa_ubicaciones" ON empresa_ubicaciones;

-- 7. POLÍTICA: Usuarios pueden ver vínculos de su empresa
CREATE POLICY "Ver vínculos de mi empresa"
ON empresa_ubicaciones
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresa
    WHERE usuarios_empresa.user_id = auth.uid()
    AND usuarios_empresa.empresa_id = empresa_ubicaciones.empresa_id
    AND usuarios_empresa.activo = true
  )
  OR
  EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.user_id = auth.uid()
    AND super_admins.activo = true
  )
);

-- 8. POLÍTICA: Usuarios pueden crear vínculos para su empresa
CREATE POLICY "Crear vínculos para mi empresa"
ON empresa_ubicaciones
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_empresa
    WHERE usuarios_empresa.user_id = auth.uid()
    AND usuarios_empresa.empresa_id = empresa_ubicaciones.empresa_id
    AND usuarios_empresa.activo = true
    AND usuarios_empresa.rol_interno IN ('Coordinador', 'super_admin', 'Super Admin')
  )
  OR
  EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.user_id = auth.uid()
    AND super_admins.activo = true
  )
);

-- 9. POLÍTICA: Usuarios pueden actualizar vínculos de su empresa
CREATE POLICY "Actualizar vínculos de mi empresa"
ON empresa_ubicaciones
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresa
    WHERE usuarios_empresa.user_id = auth.uid()
    AND usuarios_empresa.empresa_id = empresa_ubicaciones.empresa_id
    AND usuarios_empresa.activo = true
    AND usuarios_empresa.rol_interno IN ('Coordinador', 'super_admin', 'Super Admin')
  )
  OR
  EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.user_id = auth.uid()
    AND super_admins.activo = true
  )
);

-- 10. Verificar políticas creadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('ubicaciones', 'empresa_ubicaciones')
ORDER BY tablename, policyname;
