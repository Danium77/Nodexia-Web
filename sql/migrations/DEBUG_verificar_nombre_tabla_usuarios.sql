-- ============================================================================
-- VERIFICAR NOMBRE CORRECTO DE TABLA USUARIOS-EMPRESAS
-- ============================================================================

-- Verificar qué tablas existen relacionadas con usuarios y empresas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%usuario%'
OR table_name LIKE '%empresa%'
ORDER BY table_name;

-- Ver estructura de relaciones
SELECT 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND (tc.table_name LIKE '%usuario%' OR tc.table_name LIKE '%empresa%')
ORDER BY tc.table_name;

-- Ver políticas existentes de otras tablas para ver qué nombre usan
SELECT 
    schemaname,
    tablename,
    policyname,
    definition
FROM pg_policies
WHERE tablename IN ('despachos', 'choferes', 'camiones')
LIMIT 5;
