-- ============================================================================
-- ELIMINAR POLÍTICAS ANTIGUAS QUE QUEDARON
-- Fecha: 2025-11-02
-- ============================================================================

-- Estas 3 políticas tienen lógica antigua con auth.role() que causa conflictos
DROP POLICY IF EXISTS "Opciones: acceso por transporte" ON choferes;
DROP POLICY IF EXISTS "Choferes: actualiza si es dueño" ON choferes;
DROP POLICY IF EXISTS "Choferes: ajustando si es dueño" ON choferes;

-- Verificar que solo queden las 12 políticas correctas
SELECT 
    tablename AS tabla,
    policyname AS nombre_politica,
    cmd AS operacion,
    qual AS condicion
FROM pg_policies
WHERE tablename IN ('choferes', 'camiones', 'acoplados')
ORDER BY tablename, policyname;
