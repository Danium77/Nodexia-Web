-- ============================================================================
-- ELIMINAR POLÍTICAS CON NOMBRES ESPECIALES
-- Fecha: 2025-11-02
-- Usar comillas dobles para nombres con caracteres especiales
-- ============================================================================

-- Eliminar las 3 políticas problemáticas con sintaxis correcta
DROP POLICY "Opciones: acceso por transporte" ON choferes;
DROP POLICY "Choferes: actualiza si es dueño" ON choferes;
DROP POLICY "Choferes: ajustando si es dueño" ON choferes;

-- Verificar eliminación
SELECT 
    tablename AS tabla,
    policyname AS nombre_politica,
    cmd AS operacion
FROM pg_policies
WHERE tablename = 'choferes'
ORDER BY policyname;
