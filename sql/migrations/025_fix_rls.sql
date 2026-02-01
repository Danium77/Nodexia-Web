-- Fix para Migración 025: Solo las políticas RLS corregidas
-- Ejecutar después de que la migración 025 falló
-- Fecha: 2026-02-01

-- Eliminar policies incorrectas
DROP POLICY IF EXISTS "Usuarios ven historial de su empresa" ON historial_unidades_operativas;
DROP POLICY IF EXISTS "Coordinadores insertan historial" ON historial_unidades_operativas;

-- Crear policy SELECT corregida
CREATE POLICY "Usuarios ven historial de su empresa"
ON historial_unidades_operativas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM unidades_operativas uo
    JOIN usuarios_empresa ue ON uo.empresa_id = ue.empresa_id
    WHERE uo.id = historial_unidades_operativas.unidad_operativa_id
      AND ue.user_id = auth.uid()
  )
);

-- Crear policy INSERT corregida
CREATE POLICY "Coordinadores insertan historial"
ON historial_unidades_operativas
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_empresa ue
    WHERE ue.user_id = auth.uid()
      AND ue.role_type IN ('coordinador', 'admin', 'admin_nodexia', 'super_admin')
  )
);

-- Verificación
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'historial_unidades_operativas';
