-- Fix para Migración 025: Corregir nombre de columna en policy INSERT
-- La columna correcta es rol_interno, no role_type
-- Ejecutar DESPUES de que la migración 025 falle

-- Eliminar policy incorrecta
DROP POLICY IF EXISTS "Coordinadores insertan historial" ON historial_unidades_operativas;

-- Crear policy corregida con rol_interno
CREATE POLICY "Coordinadores insertan historial"
ON historial_unidades_operativas
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND ue.rol_interno IN ('coordinador', 'admin', 'admin_nodexia', 'super_admin')
  )
);

-- Verificación
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'historial_unidades_operativas'
ORDER BY policyname;
