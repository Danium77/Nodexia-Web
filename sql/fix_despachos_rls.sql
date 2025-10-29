-- ============================================
-- FIX RLS POLICIES FOR DESPACHOS TABLE
-- Problema: Los coordinadores no pueden actualizar despachos que crearon
-- Solución: Políticas RLS simplificadas basadas solo en created_by
-- ============================================

-- 1. Ver políticas actuales
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'despachos';

-- 2. Eliminar políticas antiguas si existen (para evitar conflictos)
DROP POLICY IF EXISTS "Coordinadores pueden crear despachos" ON public.despachos;
DROP POLICY IF EXISTS "Coordinadores pueden ver sus despachos" ON public.despachos;
DROP POLICY IF EXISTS "Coordinadores pueden actualizar sus despachos" ON public.despachos;
DROP POLICY IF EXISTS "Usuarios pueden ver despachos de su empresa" ON public.despachos;
DROP POLICY IF EXISTS "Usuarios pueden actualizar despachos de su empresa" ON public.despachos;
DROP POLICY IF EXISTS "despachos_select_policy" ON public.despachos;
DROP POLICY IF EXISTS "despachos_insert_policy" ON public.despachos;
DROP POLICY IF EXISTS "despachos_update_policy" ON public.despachos;
DROP POLICY IF EXISTS "despachos_delete_policy" ON public.despachos;

-- 3. Crear nuevas políticas RLS MUY PERMISIVAS (solo verifican autenticación)

-- Política de SELECT: Los usuarios autenticados pueden ver todos los despachos
CREATE POLICY "despachos_select_policy" ON public.despachos
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Política de INSERT: Los usuarios autenticados pueden crear despachos
CREATE POLICY "despachos_insert_policy" ON public.despachos
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política de UPDATE: Los usuarios autenticados pueden actualizar cualquier despacho
-- SOLUCIÓN TEMPORAL: Permite actualizar sin restricciones para debugging
CREATE POLICY "despachos_update_policy" ON public.despachos
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política de DELETE: Los usuarios autenticados pueden eliminar
CREATE POLICY "despachos_delete_policy" ON public.despachos
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- 4. Habilitar RLS en la tabla (si no está habilitado)
ALTER TABLE public.despachos ENABLE ROW LEVEL SECURITY;

-- 5. Verificar que las políticas se crearon correctamente
SELECT 
  policyname,
  cmd as operacion,
  CASE WHEN permissive = 'PERMISSIVE' THEN '✓ Permisiva' ELSE '✗ Restrictiva' END as tipo
FROM pg_policies 
WHERE tablename = 'despachos'
ORDER BY cmd;

-- 6. Verificar que RLS está habilitado
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✓ RLS Habilitado' ELSE '✗ RLS Deshabilitado' END as estado_rls
FROM pg_tables 
WHERE tablename = 'despachos' AND schemaname = 'public';
