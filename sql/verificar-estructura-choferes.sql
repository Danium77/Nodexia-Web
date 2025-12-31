-- ============================================================================
-- VERIFICAR ESTRUCTURA EXACTA DE TABLA CHOFERES
-- ============================================================================
-- Propósito: Ver todas las columnas y sus nombres exactos
-- ============================================================================

-- 1. Ver todas las columnas de la tabla choferes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'choferes'
ORDER BY ordinal_position;

-- 2. Ver los datos reales de choferes
SELECT * FROM choferes LIMIT 5;

-- 3. Ver choferes con usuario_id vinculado
SELECT 
    c.*,
    u.email as usuario_email
FROM choferes c
LEFT JOIN auth.users u ON c.usuario_id = u.id
WHERE c.usuario_id IS NOT NULL;
