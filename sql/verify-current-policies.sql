-- ============================================================================
-- VERIFICAR ESTADO ACTUAL DE POLÍTICAS
-- Fecha: 2025-11-02
-- ============================================================================

-- Ver TODAS las políticas de choferes, camiones y acoplados
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('choferes', 'camiones', 'acoplados')
ORDER BY tablename, policyname;

-- Contar políticas por tabla
SELECT 
    tablename,
    COUNT(*) as total_politicas
FROM pg_policies
WHERE tablename IN ('choferes', 'camiones', 'acoplados')
GROUP BY tablename
ORDER BY tablename;
