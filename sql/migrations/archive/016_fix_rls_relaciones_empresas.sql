-- ============================================================================
-- FIX RLS PARA RELACIONES_EMPRESAS
-- Permite que transportes y clientes vean sus propias relaciones
-- ============================================================================

-- 1. Verificar si RLS está habilitado (debería estar)
-- Si no está, habilitarlo
ALTER TABLE relaciones_empresas ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar política anterior si existe
DROP POLICY IF EXISTS "Transportes ven sus relaciones" ON relaciones_empresas;

-- 3. Crear política más completa que permita ver relaciones desde ambos lados
CREATE POLICY "Empresas ven sus relaciones"
ON relaciones_empresas FOR SELECT
TO authenticated
USING (
  empresa_transporte_id = public.uid_empresa() 
  OR empresa_cliente_id = public.uid_empresa()
);

-- 4. Verificar que la función uid_empresa() existe y funciona
-- (Ya debería existir de migraciones anteriores)
SELECT public.uid_empresa();

-- 5. Verificar las políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'relaciones_empresas';
