-- ============================================================================
-- VERIFICAR ESTRUCTURA DE TABLA CHOFERES
-- Fecha: 2025-11-02
-- ============================================================================

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'choferes'
ORDER BY ordinal_position;
