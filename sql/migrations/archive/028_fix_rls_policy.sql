-- Fix para Migración 028: Corregir RLS policy de cancelaciones_despachos
-- Fecha: 2026-02-02
-- Problema: Column re.empresa_id no existe en relaciones_empresas

-- Eliminar policy incorrecta
DROP POLICY IF EXISTS select_cancelaciones_empresa ON cancelaciones_despachos;

-- Crear policy corregida usando usuarios_empresa directamente
CREATE POLICY select_cancelaciones_empresa ON cancelaciones_despachos
  FOR SELECT
  USING (
    empresa_id IN (
      SELECT ue.empresa_id 
      FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
    )
  );

-- Verificación
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'cancelaciones_despachos';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Fix 028 aplicado exitosamente';
  RAISE NOTICE '🔐 Policy select_cancelaciones_empresa corregida';
END $$;
